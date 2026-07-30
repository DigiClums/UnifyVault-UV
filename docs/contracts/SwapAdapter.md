---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# SwapAdapter Contract Specification

- **File Path**: [`packages/protocol/src/swap/SwapAdapter.sol`](../../packages/protocol/src/swap/SwapAdapter.sol)
- **Inherits**: `AccessControl`, `ISwapAdapter`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`SwapAdapter` wraps DEX routers (specifically Uniswap V3 `ISwapRouter`) to execute atomic swaps between USDC collateral and strategy tokens (cbBTC, WETH) with strict slippage protection.

---

## ⚙️ 2. Key Responsibilities

- Execute single-hop or multi-hop token swaps via Uniswap V3 `exactInputSingle`.
- Approve router token spending securely using `SafeERC20.forceApprove`.
- Validate that output amount is greater than or equal to `minAmountOut`.
- Transfer output tokens to recipient.

---

## 📑 3. Function Reference

#### `swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) → uint256 amountOut`

- **Access**: Restricted to `CONTROLLER_ROLE`.
- Approves `tokenIn` to Uniswap V3 Router.
- Executes `exactInputSingle`.
- Validates `amountOut >= minAmountOut`.

---

## 🧪 4. Testing References

- `packages/protocol/test/SwapAdapter.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
