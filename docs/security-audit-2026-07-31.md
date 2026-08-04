# UnifyVault V2 security audit

**Date:** 2026-07-31  
**Scope:** every Solidity source file under `packages/protocol/src`, plus deployment and governance scripts.  
**Method:** manual, adversarial code review; privilege and state-flow tracing; and the existing Foundry suite (`forge test`: 365 passed, 0 failed, 1 skipped). This is not a production deployment review of the addresses currently on-chain.

## Executive summary

The codebase uses OpenZeppelin access control, checked arithmetic, `SafeERC20`, and reentrancy protection around custody and controller asset movement. No unprivileged path to mint shares, directly withdraw custody assets, or reenter the controller was identified in the reviewed code.

However, it is **not mainnet-ready**. The provided mainnet deployment procedure leaves the deploying account with `CONTROLLER_ROLE` on `CustodyVault`, which authorizes arbitrary withdrawals. Its migration procedure neither removes that role nor includes all privileged modules. Separately, strategy updates can remove assets from all NAV and redemption accounting while the assets remain in custody. These are material loss-of-funds risks.

**Mainnet readiness score: 42/100.** Do not deploy before resolving all Critical and High findings and executing an independently reviewed role-migration dry run.

## Architecture and attack surface

Users deposit a configured ERC-20 into `UnifyVaultController`. The controller collects a fee, swaps into the current `StrategyManager` assets via `SwapAdapter`, deposits received tokens in `CustodyVault`, then mints `UVBTCETH`. Redemptions withdraw the caller's pro-rata balances for the _current_ strategy assets, swap to the requested output asset, collect a fee, and burn shares.

The safety boundary therefore includes all of the following:

- `DEFAULT_ADMIN_ROLE` can grant every role on each individual contract.
- `GOVERNANCE_ROLE` controls feeds, directory entries, strategy constituents, fee rates, router, and vault asset enablement.
- `CONTROLLER_ROLE` on `CustodyVault` can withdraw any enabled asset to any address.
- The directory resolves live strategy, portfolio, adapter, and fee-manager dependencies; it is mutable until frozen.
- Chainlink feeds, the selected DEX router/pools, and the precise behavior of all supported ERC-20s are external dependencies.

There is no proxy or upgrade mechanism in the reviewed contracts. Upgrades occur by deployment/directory rewiring and role administration, not storage upgrades.

## Findings

### C-01 — Deployer retains arbitrary CustodyVault withdrawal authority

**Affected:** `script/DeployMainnet.s.sol:234-245`, `src/vault/CustodyVault.sol:94-124`; equivalent V2/test deployment scripts.

`CustodyVault` grants its deployer `CONTROLLER_ROLE` in its constructor. `withdraw` permits any account with that role to choose an arbitrary `to` address. The mainnet deployment script grants the role to the controller but revokes it only from the token deployer, not from the vault deployer (nor from the treasury deployer). The assertions confirm only that the controller was added.

**Exploit / impact:** if the deployer key is compromised or malicious after users deposit, it calls `vault.withdraw(asset, attacker, vault.totalAssets(asset))`. The transfer succeeds without a share burn, leaving shares unbacked. This is a complete custody loss for each enabled asset.

**Proof of concept:**

```solidity
vm.prank(deployer); // deployer still has vault.CONTROLLER_ROLE()
vault.withdraw(USDC, attacker, vault.totalAssets(USDC));
```

**Fix:** immediately after granting the controller role, revoke `CONTROLLER_ROLE` from the deployer on _every_ contract where it is not strictly needed; assert the complete negative role matrix. Deploy from a multisig/timelock, not an EOA. Ensure the migration script revokes controller roles as well as admin/governance/guardian roles.

**Regression test:** deploy through the production script (or extracted setup), then assert `!vault.hasRole(vault.CONTROLLER_ROLE(), deployer)` and that a prank as deployer cannot withdraw. Assert the controller can still execute a normal redemption.

### H-01 — Strategy replacement strands assets and excludes them from NAV/redemptions

**Affected:** `src/strategy/StrategyManager.sol:218-258`, `src/strategy/PortfolioManager.sol:137-160`, `src/controller/UnifyVaultController.sol:517-548`.

Portfolio value and redemption iterate only `StrategyManager.getSupportedAssets()`. `setStrategy` deletes the old list without moving its balances out of `CustodyVault`. A normal move from `[cbBTC, WETH]` to `[cbBTC]`/new asset therefore leaves WETH in custody but removes it from NAV and from every redemption calculation. `rebalance()` is explicitly unimplemented.

**Exploit / impact:** a governance compromise can deliberately omit an asset and make its value invisible; even an ordinary strategy update creates a user-fund accounting failure. Users redeem only the remaining listed assets. New deposits are priced against an understated NAV, creating dilution and potentially allowing value transfer when an orphaned asset is later restored.

**Fix:** prohibit replacing/removing a constituent while its custody balance is nonzero, or atomically rebalance/migrate all old balances before publishing the new strategy. Maintain an independent enumerable list of all custody assets for NAV, and require an explicit, tested migration proposal with a timelock.

**Regression test:** deposit into a two-asset strategy, change the strategy to omit one asset, and assert the operation reverts until the omitted asset is fully migrated. In an invariant, every nonzero custody asset must be included in NAV or be recorded as a governed, redeemable liability.

### M-01 — Fallback oracle cannot keep deposits live

**Affected:** `src/oracle/OracleManager.sol:96-136`, `src/controller/UnifyVaultController.sol:714-716`.

`OracleManager` correctly uses the fallback provider in `isPriceFresh` and `getAssetPrice`. But `_validateDeposit` then obtains metadata, which always returns the **primary** provider, and directly calls `primary.getLatestRound`. A stale, reverted, or disabled primary therefore reverts deposits even if the fallback supplied the validated price. The raw value is used only in the returned quote/event-like struct, not economic accounting.

**Impact:** an oracle-primary outage causes a deposit denial of service despite configured fallback redundancy. Redemptions do not make this unnecessary call, so protocol behavior becomes asymmetric.

**Fix:** have `OracleManager.getPrice` return/provider-expose the provider actually selected, or remove `rawPrice` from the execution path and derive quote information from the validated normalized round. Never call an unvalidated provider after fallback selection.

**Regression test:** configure a stale/reverting primary and healthy fallback; assert `getAssetPrice`, `previewDeposit`, and `deposit` all succeed using the fallback.

### M-02 — Governance migration is incomplete and contains a placeholder fee-manager address

**Affected:** `script/MigrateGovernance.s.sol:192-202`, especially line 201.

The script's target list omits `ChainlinkOracleProvider`, `LiquidityManager`, `PortfolioManager`, and `SwapAdapter`, each of which has privileged configuration. It includes `FeeManager` at `0x1234567890123456789012345678901234567890`, not the deployed address. It only prints calldata for renouncing `DEFAULT_ADMIN_ROLE`; it does not broadcast revocations and does not address `CONTROLLER_ROLE`.

**Impact:** old administrators can retain the ability to change oracle feeds, the swap router, strategy/module dependencies, or roles. Running this script can also fail or give a false sense of a complete handoff.

**Fix:** remove hard-coded addresses; consume a verified deployment manifest, enumerate every AccessControl contract and every operational role, and assert both positive roles for the new timelock/multisig and negative roles for the old account. Broadcast only after a fork dry-run with the same signer.

### L-01 — Permissionless residual sweep lets any caller claim pre-existing adapter balances

**Affected:** `src/swap/SwapAdapter.sol:250-252`, `313-315`, `323-327`.

Every swap sweeps the adapter's entire balance of `tokenIn` to the payer and its entire balance of `tokenOut` to the recipient. Balances are not measured before the call. Anyone can perform a minimal successful swap selecting a token that was accidentally sent to the adapter and receive all pre-existing residual of that token.

**Impact:** accidental transfers, rebasing residue, or tokens left by non-conforming routers are publicly recoverable by the next caller rather than a designated recovery authority. The normal controller path should leave no balance, so this is not presently a direct protocol-custody drain.

**Fix:** record balances before pulling tokens and return only the delta attributable to this swap. Add a governance-only rescue method protected by delay, or deliberately make the adapter non-custodial and reject unsolicited balances operationally.

### L-02 — Unsupported/non-standard ERC-20 behavior is not excluded

**Affected:** `CustodyVault.deposit`, `Treasury.collectFee`, controller live execution, and `SwapAdapter`.

Accounting increments by requested transfer amount, not observed balance delta. Fee-on-transfer, rebasing, callback-bearing, or otherwise non-standard assets can cause incorrect accounting or transaction reverts. Current production assets are expected to be conventional, but the registry permits any address and arbitrary supplied decimals.

**Fix:** allowlist only reviewed standard ERC-20s, validate contract code and on-chain decimals at registration, and use pre/post balance deltas where exact transfer semantics are required. Reject fee-on-transfer and rebasing tokens explicitly.

## Verified controls and residual risks

- Controller, treasury, and custody asset-moving functions use `ReentrancyGuard`; user deposit/redeem is guarded before external token/router calls.
- Mint/burn is controller-gated; ERC-20 permit relies on OpenZeppelin's EIP-2612 implementation.
- Fee setters cap both deposit and redemption fees at 5%.
- Chainlink adapter rejects non-positive answers, incomplete rounds, and stale rounds. `OracleManager` also checks timestamps and normalizes to 18 decimals.
- Dead shares mitigate the standard first-depositor donation/share-inflation attack, but do not correct the strategy/NAV issue above.

Residual operational risks that need explicit acceptance: a 24-hour feed heartbeat is long for volatile BTC/ETH collateral; there is no Base sequencer-uptime check; one governance role can immediately change feeds, router, strategy, and directory entries; and `setSwapSlippageBps(10000)` disables economic minimum output. Use a timelocked multisig, role separation, oracle circuit breakers/deviation limits, a sequencer check where applicable, and a bounded nonzero slippage policy.

## Test coverage review and required additions

The existing suite covers ordinary deposits/redemptions, access control, fee routing, oracle freshness, fuzzing, and invariants. It did not test the production role handoff, strategy migration with live balances, fallback-provider deposits, residual-token recovery, malicious/non-standard ERC-20s, or a complete mainnet-fork configuration.

Add the following before deployment:

1. Unit tests for C-01, M-01, and L-01 above.
2. Integration tests that execute a strategy migration with real balances and prove no asset leaves NAV/redemption coverage.
3. Fuzz tests over deposits, redeems, donations, and strategy updates, asserting `sum(NAV assets)` covers every custody balance and controller/adapter balances are zero after each successful operation.
4. Stateful invariants with successful (not mostly reverting) handler actions: total shares must be backed by the full custody NAV; no unauthorized role can transfer custody; and fallback-oracle execution must be equivalent to primary execution.
5. A Base mainnet fork test that verifies code exists at every configured token/feed/router address, feed decimals and descriptions match expectations, routes are liquid, and swaps respect configured slippage.

## Remediation order

1. Fix C-01 and replace the migration/deployment procedure; execute a role-matrix fork dry run.
2. Implement safe strategy migration/rebalancing and protect it with a timelock.
3. Repair fallback execution and add oracle circuit breakers/sequencer handling.
4. Make adapter residual accounting delta-based and constrain supported token behavior.
5. Commission a follow-up audit of the patched version and deployment manifest.
