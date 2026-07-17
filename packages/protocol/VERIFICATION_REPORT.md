# Contract Verification Report

## Status: PENDING DEPLOYMENT

Verification cannot be completed on BaseScan until transactions are successfully broadcast to the live Base Sepolia network.

---

## Etherscan/BaseScan Verification Blueprint

When contracts are deployed, verify them manually if needed using the following commands:

```bash
# Verify ProtocolDirectory
forge verify-contract <DIRECTORY_ADDRESS> ProtocolDirectory --chain-id 84532 --watch

# Verify OracleManager
forge verify-contract <ORACLE_ADDRESS> OracleManager --chain-id 84532 --watch

# Verify MockOracleProvider
forge verify-contract <PROVIDER_ADDRESS> MockOracleProvider --chain-id 84532 --watch

# Verify Treasury
forge verify-contract <TREASURY_ADDRESS> Treasury --chain-id 84532 --watch

# Verify CustodyVault
forge verify-contract <VAULT_ADDRESS> CustodyVault --chain-id 84532 --watch

# Verify UVBTCETHToken
forge verify-contract <TOKEN_ADDRESS> UVBTCETHToken --chain-id 84532 --watch

# Verify UnifyVaultController
forge verify-contract <CONTROLLER_ADDRESS> UnifyVaultController --chain-id 84532 --watch
```
