---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Constants, Roles & Network Parameters Reference

This reference document compiles all system constants, role hashes, module keys, and network deployment configurations.

---

## 🔑 1. Role Identifiers ([`AccessRoles.sol`](../../packages/protocol/src/libraries/AccessRoles.sol))

```solidity
bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");
bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256("ORACLE_OPERATOR_ROLE");
```

---

## 📦 2. Module Identifiers ([`ModuleIds.sol`](../../packages/protocol/src/constants/ModuleIds.sol))

```solidity
bytes32 public constant ORACLE = keccak256("OracleManager");
bytes32 public constant VAULT = keccak256("CustodyVault");
bytes32 public constant TREASURY = keccak256("Treasury");
bytes32 public constant TOKEN = keccak256("IndexToken");
bytes32 public constant GOVERNANCE = keccak256("Governance");
bytes32 public constant STRATEGY_MANAGER = keccak256("StrategyManager");
bytes32 public constant PORTFOLIO_MANAGER = keccak256("PortfolioManager");
bytes32 public constant SWAP_ADAPTER = keccak256("SwapAdapter");
bytes32 public constant LIQUIDITY_MANAGER = keccak256("LiquidityManager");
bytes32 public constant FEE_MANAGER = keccak256("FeeManager");
```

---

## 🌐 3. Supported EVM Networks

| Network Name     | Chain ID | Deployment Config File                                      | Uniswap V3 Router                            |
| :--------------- | :------: | :---------------------------------------------------------- | :------------------------------------------- |
| **Base Mainnet** |  `8453`  | `packages/protocol/script/mainnet/config/base_mainnet.json` | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| **Base Sepolia** | `84532`  | `packages/protocol/script/mainnet/config/base_sepolia.json` | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` |

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
