---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Post-Deployment Verification Procedures

This document outlines verification steps to validate deployment state prior to enabling user deposits.

---

## ✅ 1. Verification Checklist

Execute the verification check suite:

```bash
cd packages/protocol
forge script script/mainnet/VerifyGovernance.s.sol --rpc-url $RPC_URL
```

### Checks Performed:

1. **Directory Integrity**: Every `ModuleId` resolves to non-zero address in `ProtocolDirectory`.
2. **Oracle Health**: `OracleManager.isPriceFresh()` returns `true` for USDC, cbBTC, and WETH.
3. **Strategy Total BPS**: `StrategyManager.getTargetWeights()` sums to 10,000 BPS.
4. **Zero Balance**: `UnifyVaultController` token balances are 0.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
