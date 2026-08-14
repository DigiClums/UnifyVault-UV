# UNIFYVAULT — PHASE 2A.5 REPORT

**REMOVE PIMLICO DEPENDENCY & SELF-MANAGED GAS INFRASTRUCTURE**

---

## 1. Executive Summary

Phase 2A.5 establishes a **100% self-managed, provider-agnostic ERC-4337 Account Abstraction infrastructure** for UnifyVault. All hard dependencies on third-party SaaS vendors (such as Pimlico billing, API keys, or credit-card requirements) have been completely removed.

### Core Economic Principle

> **"Gasless" means the USER does not pay native ETH gas for protocol transactions.**
> It does **NOT** mean the transaction has zero economic cost on the blockchain.
> UnifyVault pays the underlying L1/L2 gas fees through its dedicated **Gas Treasury** and **UnifyVaultPaymaster** deposit on the canonical EntryPoint.

---

## 2. End-to-End System Architecture

```
User (EOA / Hardware Wallet — 0 native ETH)
           │
           │ Signs UserOperation (ECDSA / ERC-1271)
           ▼
ERC-4337 Smart Account (SimpleSmartAccount / Safe)
           │
           │ Batched Calls / UserOp (PackedUserOperation v0.7)
           ▼
UnifyVault Self-Hosted Bundler (Alto Container :4337 / Redis Mempool)
           │
           │ Bundles & Calls EntryPoint.handleOps()
           ▼
Canonical EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
           │
           ├─► Validates Sponsorship Policy & Signer
           │   UnifyVaultPaymaster (`validatePaymasterUserOp`)
           │      ▲
           │      │ Deposits Gas Reserves
           │   UnifyVault GasTreasury (Native ETH Reserve Vault)
           │
           ▼
UnifyVault Protocol Contracts
(USDC → UnifyVaultController → CustodyVault & UVBE Token)
```

---

## 3. Core Principles & Invariants

### 1. 100% Non-Custodial & EOA-Controlled

- The user's connected wallet (MetaMask, Coinbase Wallet, SafePal, Rainbow, etc.) remains the sole signing authority (`owner`).
- No user private keys are ever handled, generated, or stored by UnifyVault infrastructure.
- Smart Account addresses are derived deterministically counterfactual via the standard ERC-4337 factory on EntryPoint v0.7.

### 2. Core Protocol Invariance (Untouched Contracts)

The core UnifyVault protocol contracts remain **100% unmodified**:

- `UnifyVaultController.sol`
- `UVBEV2.sol`
- `CustodyVault.sol`
- `CostBasisManagerV2.sol`
- `P2PEscrowV2.sol`

The Smart Account acts as the standard `msg.sender` for deposits, redemptions, transfers, and escrow trades.

### 3. Strict Accounting Isolation

**Gas sponsorship is an external infrastructure operating expense.**
Paymaster gas funding is strictly isolated from all protocol asset accounting:

- Gas funding **NEVER** comes from `CustodyVault` collateral.
- Gas funding **NEVER** touches investor assets or escrow balances.
- Gas funding **NEVER** mutates user cost basis (`CostBasisManagerV2`).
- Gas funding **NEVER** affects NAV or share price calculations.
- Gas funding **NEVER** creates or distorts realized or unrealized P&L.

---

## 4. Provider Abstraction Layer

The frontend and backend interact with Account Abstraction through provider-agnostic interfaces:

```
                  ┌──────────────────────────────┐
                  │    Application Layer (UI)    │
                  │  useSmartAccount / deposit   │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │   Provider Abstraction Layer  │
                 ├───────────────────────────────┤
                 │  - IBundlerProvider           │
                 │  - IPaymasterProvider         │
                 └───────┬───────────────┬───────┘
                         │               │
         ┌───────────────▼─┐           ┌─▼───────────────┐
         │ BundlerProvider │           │PaymasterProvider│
         └───────┬─────────┘           └─┬───────────────┘
                 │                       │
     ┌───────────┼───────────┐           ├───────────────────┐
     ▼           ▼           ▼           ▼                   ▼
UnifyVault     Local       Generic  UnifyVault API      Standard
Alto Bundler   Dev Node     RPC     (/api/sponsor)      ERC-7677
```

### Components:

1. `IBundlerProvider`: Standard interface for submitting UserOperations (`eth_sendUserOperation`), estimating gas (`eth_estimateUserOperationGas`), fetching receipts, and retrieving UserOp gas prices.
2. `IPaymasterProvider`: Interface for client-side pre-flight policy validation, generating ERC-4337 v0.7 stub data, and retrieving sponsored paymaster data.
3. `config.ts`: Configures `BUNDLER_RPC_URL`, `PAYMASTER_RPC_URL`, `PAYMASTER_ADDRESS`, and `AA_SPONSORSHIP_ENABLED` without requiring vendor API keys.

---

## 5. Self-Managed Paymaster Architecture

### Solidity Contract: `UnifyVaultPaymaster.sol`

The `UnifyVaultPaymaster` is a custom ERC-4337 v0.7 Paymaster contract featuring:

1. **Canonical EntryPoint v0.7 Binding**:
   - Bound to `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.
   - Reverts any call to `validatePaymasterUserOp` or `postOp` not originating from the canonical EntryPoint.
2. **Strict Calldata Policy Engine**:
   - **Target Whitelist**: Only approved targets (`USDC`, `UnifyVaultController`, `UVBEV2`, `P2PEscrowV2`).
   - **Selector Whitelist**:
     - USDC: `IERC20.approve.selector` (`0x095ea7b3`)
     - Controller: `deposit(address,uint256,uint256,address)` (`0x47e7ef24`), `redeem(address,uint256,uint256,address,uint256)` (`0x3d17208d`)
     - UVBE: `IERC20.transfer.selector` (`0xa9059cbb`), `IERC20.approve.selector` (`0x095ea7b3`)
     - Escrow: `createTrade`, `fundTrade`, `submitPaymentEvidence`, `confirmAndRelease`, `requestRefund`, `resolveDispute`
3. **Exact Allowance Invariant Enforcement**:
   - For 2-call batched deposits (`approve` + `deposit`), validates that `approvedAmount == depositAmount`. Reverts with `ExactApprovalViolation` if excessive allowance is requested.
4. **Native ETH Drain Immunity**:
   - Reverts immediately with `NativeValueForbidden` if any call carries native ETH value (`value > 0`).
5. **Anti-Griefing & Rate Limits**:
   - `maxCostPerUserOp`: Upper gas cost limit per UserOperation (default 0.05 ETH).
   - `maxFeePerGasCap`: Maximum gas price cap (e.g. 100 gwei) preventing spikes from draining the treasury.
   - `userOpCooldown`: Per-sender cooldown interval.
   - `isPaused`: Emergency shutdown switch callable by governance.

---

## 6. Gas Treasury Architecture

### Solidity Contract: `GasTreasury.sol`

A standalone native ETH reserve contract dedicated solely to funding the Paymaster:

1. **Complete Accounting Separation**:
   - Distinct from `Treasury.sol` (protocol fee revenue) and `CustodyVault.sol` (vault collateral).
   - Has zero connection to NAV calculations, user cost basis, or escrow deposits.
2. **Automated Refill with Safety Bounds**:
   - Designated `refillOperator` bot can call `refillPaymaster(amount)` to top up the Paymaster's EntryPoint deposit.
   - Enforces `maxRefillPerTx` (e.g. 0.5 ETH) and a 24-hour rolling `dailyRefillLimit` (e.g. 2.0 ETH) to protect against operator key compromise.
3. **Governance & Emergency Recovery**:
   - Owner/timelock can withdraw unused ETH to cold storage via `withdrawEmergency`.

---

## 7. Bundler Options Evaluated

| Bundler Option            | License          | Lang         | ERC-4337 v0.7     | Base / OP Stack Support                      | Resource Footprint  | RPC Requirements                   | VPS Suitability              | Recommendation  |
| :------------------------ | :--------------- | :----------- | :---------------- | :------------------------------------------- | :------------------ | :--------------------------------- | :--------------------------- | :-------------- |
| **Alto** (Pimlico OSS)    | MIT              | TS / Node.js | **Full (v0.7)**   | **Native** (Calculates L1 data fee natively) | ~1-2 vCPU, ~2GB RAM | Standard Base Sepolia / Base RPC   | **Excellent**                | **RECOMMENDED** |
| **Rundler** (Alchemy OSS) | Apache 2.0 / MIT | Rust         | Supported (v0.3+) | Supported                                    | ~2-4 vCPU, ~3GB RAM | Requires archive/debug tracing RPC | Good (High setup complexity) | Alternative     |
| **Skandha** (Etherspot)   | MIT              | TS / Node.js | Supported         | Supported                                    | ~2 vCPU, ~3GB RAM   | Standard RPC                       | Good                         | Alternative     |
| **Silius** (Vidar Labs)   | Apache 2.0       | Rust         | Supported         | Supported                                    | ~2 vCPU, ~4GB RAM   | P2P mempool node                   | Moderate                     | Experimental    |

---

## 8. Recommended Self-Hosted Bundler: Alto (OSS)

### Rationale:

1. **Full ERC-4337 v0.7 Compliance**: Developed directly alongside the v0.7 specification.
2. **Native Base (OP Stack) Gas Math**: Automatically handles Base L1 data gas fees and L2 execution gas fee estimation without custom plugin development.
3. **VPS Resource Compatibility**:
   - Current VPS specs: **4 vCPUs AMD EPYC, 16 GB RAM, 143 GB free disk space, Docker v29 & Redis v7 already active**.
   - Alto container footprint is ~1.5 GB RAM and < 10% CPU under normal load.
4. **Turnkey Deployment Ready**:
   - Configuration files created in `infra/bundler/docker-compose.yml` and `infra/bundler/alto.config.json`.
   - Prometheus metrics on port `9090`.

---

## 9. Base Sepolia Architecture

```
User (Base Sepolia)
   │
   ▼
Deterministic SimpleAccount (0x... derived via Canonical Factory)
   │
   ▼ UserOperation (Signed by User EOA)
Self-Hosted Alto Bundler (http://127.0.0.1:4337 / https://bundler.unifyvault.xyz)
   │
   ▼ EntryPoint.handleOps()
Canonical EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
   ▲
   ├─► validatePaymasterUserOp()
   │   UnifyVaultPaymaster (Base Sepolia)
   │      ▲
   │      │ deposit()
   │   UnifyVault GasTreasury (Holds Sepolia ETH)
   ▼
UnifyVault Protocol Contracts:
- USDC: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
- Controller: 0x6e257B7740C39c81bE339023B06b6D62934D21E4
- UVBE Token: 0x485E923C277E3C401f80eaF5813735E265147C87
```

---

## 10. Security Analysis

| Threat Category                | Attack Vector                                                          | Mitigation & Invariants                                                                                                                                   |
| :----------------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paymaster Gas Draining**     | Malicious user submits spam UserOps to deplete paymaster ETH           | Paymaster rejects arbitrary targets, non-zero ETH value transfers, and unapproved selectors; enforces `maxCostPerUserOp` (0.05 ETH) and sender cooldowns. |
| **Excessive Allowance Attack** | Malicious batch requests large allowance, then transfers tokens later  | Strict exact allowance check requires `approvedAmount == depositAmount` in the batch.                                                                     |
| **UserOperation Replay**       | Replaying a past UserOp on another network or block                    | EntryPoint v0.7 binds chain ID (`84532`) and sequential nonces into the userOp hash.                                                                      |
| **EntryPoint Spoofing**        | Attacker invokes `validatePaymasterUserOp` directly to fake validation | Paymaster enforces `msg.sender == address(entryPoint)`.                                                                                                   |
| **Relayer Key Compromise**     | Attacker steals Bundler relayer private key                            | Relayer only holds operational ETH (< 0.05 ETH); GasTreasury enforces `maxRefillPerTx` (0.5 ETH) and `dailyRefillLimit` (2.0 ETH).                        |
| **Accounting Invariant Bleed** | Gas fees deducted from investor collateral or cost basis               | Gas sponsorship is funded strictly via external native ETH in EntryPoint. Vault collateral and `CostBasisManagerV2` have 0 gas fee linkages.              |
| **Emergency Shutdown**         | Malicious behavior detected in real-time                               | Both `UnifyVaultPaymaster` and `GasTreasury` feature instant owner `pause()` switches.                                                                    |

---

## 11. Accounting Isolation Verification

We verified that the AA gas infrastructure is completely decoupled from protocol financial accounting:

```solidity
// In SmartAccountIntegrationTest.t.sol & UnifyVaultPaymaster.t.sol:
// 1. CustodyVault collateral strictly equals gross deposit minus protocol fee
assertEq(usdc.balanceOf(address(vault)) + usdc.balanceOf(address(treasury)), depositAmount);

// 2. User cost basis is conserved exactly without gas distortions
assertEq(costBasisManager.costBasis(address(smartAccount)), depositAmount);

// 3. P&L remains untouched by gas sponsorship
assertEq(costBasisManager.realizedPnL(address(smartAccount)), 0);
```

---

## 12. Files Changed

### Protocol Contracts (`packages/protocol`)

- `packages/protocol/src/aa/interfaces/IPaymasterV07.sol` _(New)_: Canonical ERC-4337 v0.7 interfaces (`PackedUserOperation`, `IPaymasterV07`, `IEntryPointV07`).
- `packages/protocol/src/aa/UnifyVaultPaymaster.sol` _(New)_: Self-managed Paymaster contract.
- `packages/protocol/src/aa/GasTreasury.sol` _(New)_: Infrastructure gas reserve contract.
- `packages/protocol/test/unit/UnifyVaultPaymaster.t.sol` _(New)_: Foundry test suite for Paymaster and Gas Treasury.

### Web Application (`apps/web-v2`)

- `apps/web-v2/lib/smartAccount/providers/types.ts` _(New)_: Provider abstraction interfaces.
- `apps/web-v2/lib/smartAccount/providers/bundlerProvider.ts` _(New)_: Standard ERC-4337 Bundler client with dev fallback.
- `apps/web-v2/lib/smartAccount/providers/paymasterProvider.ts` _(New)_: Standard Paymaster client with policy engine.
- `apps/web-v2/lib/smartAccount/config.ts` _(Modified)_: Replaced Pimlico config with generic AA infrastructure config.
- `apps/web-v2/lib/smartAccount/constants.ts` _(Modified)_: Updated default endpoints.
- `apps/web-v2/lib/smartAccount/client.ts` _(Modified)_: Replaced vendor SDK with provider abstraction.
- `apps/web-v2/app/api/smart-account/sponsor/route.ts` _(Modified)_: Replaced Pimlico proxy with UnifyVault self-managed policy validation.
- `apps/web-v2/hooks/useSmartAccount.ts` _(Modified)_: Updated sponsorship gating logic.
- `apps/web-v2/lib/smartAccount/index.ts` _(Modified)_: Exported new providers.
- `apps/web-v2/lib/smartAccount/__tests__/smartAccountConfig.test.ts` _(Modified)_: Updated test suite.
- `apps/web-v2/lib/smartAccount/__tests__/providerAbstraction.test.ts` _(New)_: Provider abstraction Vitest suite.

### Infrastructure & Documentation

- `infra/bundler/docker-compose.yml` _(New)_: Turnkey Alto + Redis compose setup.
- `infra/bundler/alto.config.json` _(New)_: Alto bundler configuration.
- `infra/bundler/README.md` _(New)_: Operations runbook.
- `docs/smart-account-architecture.md` _(Modified)_: Comprehensive architecture documentation.
- `.env.example` & `apps/web-v2/.env.example` _(Modified)_: Updated environment variables.

---

## 13. Dependencies Changed

- **Zero new npm package dependencies added**.
- Completely eliminated application-level runtime dependence on `permissionless/clients/pimlico`.
- All abstractions leverage standard `viem` (`^2.21.43`) and existing `permissionless` (`0.2.20`) core account utilities.

---

## 14. Environment Variables

```bash
# Account Abstraction Infrastructure (No third-party card or billing required)
BUNDLER_RPC_URL=http://127.0.0.1:4337
PAYMASTER_RPC_URL=/api/smart-account/sponsor
PAYMASTER_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_AA_SPONSORSHIP_ENABLED=true
```

---

## 15. New Tests Added

1. **Foundry (`UnifyVaultPaymaster.t.sol`)**:
   - `test_GasTreasury_RefillsPaymasterDeposit`: Validates GasTreasury refills Paymaster deposit on EntryPoint.
   - `test_GasTreasury_RevertOnExcessiveRefill`: Validates per-tx and daily rate limit enforcement.
   - `test_Paymaster_SponsorsValidBatchedDeposit`: Validates exact approve + deposit sponsorship.
   - `test_Paymaster_SponsorsValidRedeem`: Validates redeem call sponsorship.
   - `test_Paymaster_SponsorsValidUVBETransfer`: Validates UVBE share transfer sponsorship.
   - `test_Paymaster_Revert_UnauthorizedTarget`: Rejects unapproved target contract.
   - `test_Paymaster_Revert_UnauthorizedSelector`: Rejects unapproved function selector on approved target.
   - `test_Paymaster_Revert_NativeETHValue`: Rejects calls attempting native ETH value transfers (>0).
   - `test_Paymaster_Revert_MismatchedApprovalAmount`: Rejects deposit batch when approve != deposit.
   - `test_Paymaster_Revert_MaxCostExceeded`: Rejects operations exceeding `maxCostPerUserOp`.
   - `test_Paymaster_Revert_WhenPaused`: Rejects operations when emergency pause is active.
   - `test_Paymaster_Revert_CallerNotEntryPoint`: Rejects calls not originating from canonical EntryPoint.
   - `test_Paymaster_OwnerDepositAndWithdrawal`: Validates deposit and withdrawal to EntryPoint by owner.

2. **Vitest (`providerAbstraction.test.ts`)**:
   - BundlerProvider fee estimation, UserOp submission, and offline simulation.
   - PaymasterProvider client-side policy validation, stub data generation, and paymaster data retrieval.
   - SmartAccountClient initialization with custom provider transports.

---

## 16. Existing Regression Tests

All previous test suites pass without regression:

- **Vitest (Web Application)**:
  - **41 test suites passed** (100% pass rate)
  - **358 tests passed** (0 failed)
- **Foundry (Smart Contracts)**:
- **8 unit test suites passed** (100% pass rate)
  - **114 tests passed** (0 failed)

---

## 10. Live Base Sepolia Verification Snapshot

### Live Network Information

- **Network**: Base Sepolia
- **Chain ID**: `84532`
- **Verification Status**: **`BASE SEPOLIA VERIFIED`**

### Deployed Contract Addresses

| Contract Name                 | Contract Address                             |
| :---------------------------- | :------------------------------------------- |
| **Canonical EntryPoint v0.7** | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| **UnifyVaultPaymaster**       | `0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6` |
| **GasTreasury**               | `0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9` |
| **Test Smart Account**        | `0x1c8c7a0d47aed1e38c7fd735dd259adfca52bb71` |
| **ProtocolDirectory**         | `0x8040006d6907a84911aaC0a9aC08278311B156e2` |
| **UnifyVaultController**      | `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec` |
| **CustodyVault**              | `0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0` |
| **UVBE Token**                | `0x006c5DF13C716E5224b33956651C4356BB90DEc0` |
| **CostBasisManager**          | `0x57869372AFbd7b61752f2f8d3e7F37701e28517B` |
| **P2PEscrow**                 | `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb` |
| **Base Sepolia USDC**         | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

### Verified Live On-Chain Transactions

| Action                       | Transaction Hash                                                     | Block Number | Status  |
| :--------------------------- | :------------------------------------------------------------------- | :----------- | :------ |
| **Paymaster Deployment**     | `0x996ca88d487ee55df1a5c0a4423b09ea935c726fe43cc621242297d34f517d38` | `45465592`   | Success |
| **GasTreasury Deployment**   | `0x24e0421b4077c2507c9f77569f8a753944f59f423125b6066cce76056fb474e9` | `45465592`   | Success |
| **GasTreasury Funding**      | `0x3aba8d17283925255acd81f378792eca386f66037d3cd2a80a9e1795b50145da` | `45465592`   | Success |
| **EntryPoint Refill**        | `0x7c1f45df5751ce3e8f2c08f98af9b4d4593d4cc886b8aed2f9c041ffc60a3e38` | `45465592`   | Success |
| **Smart Account Deployment** | `0x5c0694bf0af717cc38d0d547c0074e86b2a8f939f0695be024653ca0e2d7ce9f` | `45465735`   | Success |
| **Gasless Deposit UserOp**   | `0xb49af90c8c1e6613ed324bb74a8bd142c9ddaaed7d11950d2ffa3922e4e55b11` | `45465765`   | Success |
| **Gasless Redeem UserOp**    | `0x7a554782941b96712c7011daa6e439c96d6348b86f0b9fa6108a042a4891b38a` | `45465785`   | Success |

### Critical Zero-ETH Invariant Proof

- Smart Account ETH Before Deposit: **`0.000000000000000000 ETH`**
- Smart Account ETH After Deposit: **`0.000000000000000000 ETH`**
- Smart Account ETH Before Redeem: **`0.000000000000000000 ETH`**
- Smart Account ETH After Redeem: **`0.000000000000000000 ETH`**
- **Result**: Complete gasless lifecycle successfully executed on Base Sepolia.

---

## 11. Verification Completion Status

1. **Self-Hosted Bundler & Relayer**: Verified on Base Sepolia (`Chain ID: 84532`).
2. **Paymaster & GasTreasury**: Successfully deployed and refilled on EntryPoint v0.7.
3. **End-to-End Gasless Flows**: Real on-chain deposit and redeem UserOperations confirmed.
4. **Zero-ETH Invariant**: 100% verified (0 native ETH on Smart Account throughout).

---

## 12. Phase 2B Readiness

With all third-party Pimlico dependencies completely removed and self-managed Account Abstraction infrastructure fully deployed and verified on Base Sepolia, the protocol is positioned for Phase 2B.
