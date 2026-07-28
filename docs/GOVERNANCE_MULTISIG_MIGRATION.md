# 🏛️ UnifyVault V2 — Governance & Safe Multisig Migration Plan

> **Target Network**: Base Mainnet (Chain ID `8453`)  
> **Security Objective**: Eliminate single-private-key vulnerability for administrative and protocol governance controls by transferring all privileged roles to an institutional Safe (Gnosis Safe) multisig contract.

---

## 1. Audit of Access Roles & Privileged Functions

| Role Name              | Role Byte32 Hash                                                     | Scope & Privileged Functions                                                                         |
| ---------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`   | `0x0000000000000000000000000000000000000000000000000000000000000000` | Granting/revoking all sub-roles, updating directory modules, contract upgrades.                      |
| `GOVERNANCE_ROLE`      | `keccak256("GOVERNANCE_ROLE")`                                       | `setSwapSlippageBps()`, `setFeeBps()`, `withdraw()`, `unpause()`, `enableAsset()`, `disableAsset()`. |
| `GUARDIAN_ROLE`        | `keccak256("GUARDIAN_ROLE")`                                         | Emergency `pause()` invocation across Controller, Vault, Treasury, Oracle.                           |
| `CONTROLLER_ROLE`      | `keccak256("CONTROLLER_ROLE")`                                       | Inter-contract module execution (`collectFee()`, `rebalance()`, `mintShares()`).                     |
| `ORACLE_OPERATOR_ROLE` | `keccak256("ORACLE_OPERATOR_ROLE")`                                  | Manual price feed overrides or heartbeat adjustments on OracleManager.                               |

---

## 2. Deployed Contract Role Audit & Functions

### 1. `UnifyVaultController.sol`

- **Address**: `0x7EF5D93f83995228efFc63dbe513367a719f0633` (Testnet)
- **Privileged Functions**:
  - `setSwapSlippageBps(uint256)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `setDepositFeeBps(uint256)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `setRedeemFeeBps(uint256)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `pause()` (`onlyRole(GUARDIAN_ROLE)`)
  - `unpause()` (`onlyRole(GOVERNANCE_ROLE)`)

### 2. `Treasury.sol`

- **Address**: `0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D` (Testnet)
- **Privileged Functions**:
  - `withdraw(address, address, uint256)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `withdrawNative(address payable, uint256)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `registerAsset(address, uint8)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `disableAsset(address)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `enableAsset(address)` (`onlyRole(GOVERNANCE_ROLE)`)

### 3. `OracleManager.sol`

- **Address**: `0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635` (Testnet)
- **Privileged Functions**:
  - `setPriceFeed(address, address)` (`onlyRole(GOVERNANCE_ROLE)`)
  - `setStalenessThreshold(uint256)` (`onlyRole(GOVERNANCE_ROLE)`)

---

## 3. Step-by-Step Safe Multisig Transfer Plan

### Phase A: Deploy Production Safe Multisig on Base Mainnet

1. Create a 3-of-5 Safe multisig via `https://app.safe.global` on Base Mainnet (`8453`).
2. Designate 5 institutional hardware wallet signers (Ledger / Trezor / Coldcard).

### Phase B: Grant Roles to Safe Address

Execute standard `grantRole` calls from deployer wallet to the Safe multisig:

```bash
# 1. Grant DEFAULT_ADMIN_ROLE on Controller
cast send <CONTROLLER_ADDRESS> "grantRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 <SAFE_MULTISIG_ADDRESS> --rpc-url $BASE_MAINNET_RPC

# 2. Grant GOVERNANCE_ROLE on Treasury
cast send <TREASURY_ADDRESS> "grantRole(bytes32,address)" 0x71840dc4906370ebb945749377... <SAFE_MULTISIG_ADDRESS> --rpc-url $BASE_MAINNET_RPC
```

### Phase C: Revoke Single Deployer Key Roles

After confirming the Safe address has verified role access on-chain, revoke deployer privileges:

````bash
## 5. Automated Governance Migration Scripts (Foundry)

Production-grade automated scripts are located in `packages/protocol/script/mainnet/`.

### Configuration Files
- **Base Sepolia**: `packages/protocol/script/mainnet/config/base_sepolia.json`
- **Base Mainnet**: `packages/protocol/script/mainnet/config/base_mainnet.json`

---

### Step 1: Grant Admin Roles

Grant `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, and `GUARDIAN_ROLE` to the new Safe multisig and sentinel addresses across all protocol contracts:

```bash
cd packages/protocol

CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/GrantAdminRoles.s.sol:GrantAdminRolesScript \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
````

---

### Step 2: Read-Only Governance Verification

Verify all role assignments on-chain across every contract. This step performs read-only checks and exits with a failure code if any expected role is missing:

```bash
cd packages/protocol

CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/VerifyGovernance.s.sol:VerifyGovernanceScript \
  --rpc-url $BASE_SEPOLIA_RPC
```

---

### Step 3: Renounce Old Admin Privileges

After verifying that the new admin has full operational permissions, renounce `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, and `GUARDIAN_ROLE` from the old deployer key:

```bash
cd packages/protocol

CONFIRM_RENOUNCE=true \
CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/RenounceOldAdmin.s.sol:RenounceOldAdminScript \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```
