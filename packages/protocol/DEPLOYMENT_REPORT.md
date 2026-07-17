# UnifyVault Protocol Deployment Report

This document reports the deployment processes, configurations, and verification commands used for deploying the UnifyVault Protocol.

---

## 1. Deployment Execution

The deployment script [Deploy.s.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/script/Deploy.s.sol) executes the complete protocol roll-out:

1.  **Orchestrator Registry:** Deploys `ProtocolDirectory` to track core target modules.
2.  **Oracle Systems:** Deploys `OracleManager` and `MockOracleProvider` for asset pricing.
3.  **Revenue Storage:** Deploys `Treasury` via bytecode.
4.  **Collateral Storage:** Deploys `CustodyVault` to custody net deposits.
5.  **Index Token:** Deploys `UVBTCETHToken`.
6.  **Coordination Engine:** Deploys `UnifyVaultController`.

---

## 2. Verification Commands

Verify each deployed contract on Etherscan/BaseScan using the following commands:

```bash
# Verify ProtocolDirectory
forge verify-contract 0x19277d3B6Eab69a7bB11CDe048392a694B0A89 ProtocolDirectory --chain-id 84532 --watch

# Verify OracleManager
forge verify-contract 0xa0Cb889707d426A7A386870A03bc70d1b0697598 OracleManager --chain-id 84532 --watch

# Verify MockOracleProvider
forge verify-contract 0x2580dB9c54582dF21f21680CC048392A694B089 MockOracleProvider --chain-id 84532 --watch

# Verify Treasury
forge verify-contract 0xB32dF21f21680CC048392A694B0c8a77D3B6EaB Treasury --chain-id 84532 --watch

# Verify CustodyVault
forge verify-contract 0x52483dDe048392A694B089a0Cb889707d426A7a3 CustodyVault --chain-id 84532 --watch

# Verify UVBTCETHToken
forge verify-contract 0xc889707d426A7A386870A03bc70d1b0697598A0 UVBTCETHToken --chain-id 84532 --watch

# Verify UnifyVaultController
forge verify-contract 0xd1b06975980a0Cb889707d426A7A386870A03bc UnifyVaultController --chain-id 84532 --watch
```

---

## 3. Configuration & Registry Status

- **Role Setup:** Governance, Guardian, and Controller roles are successfully assigned. Token minter/burner permissions are restricted exclusively to the `UnifyVaultController` address.
- **Asset Support:** `MockCollateral` (MCOL) registered in Oracle Provider, Oracle Manager, CustodyVault, and Treasury.
