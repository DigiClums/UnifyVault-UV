# UNIFYVAULT V2 — MAINNET CONFIGURATION AUDIT

**Target Network**: Base Mainnet (`Chain ID: 8453`)  
**Current Testnet**: Base Sepolia (`Chain ID: 84532`)  
**Audit Purpose**: Identify, classify, and document all network-specific values, token addresses, oracle feeds, and environment variables across protocol and frontend codebases.

---

## 1. Classification Schema

- **A. Testnet-Only**: Values that must change when deploying to or targeting Base Mainnet.
- **B. Environment-Dependent**: Values that should be injected dynamically via environment variables without committing secrets to git.
- **C. Intentionally Shared**: Canonical infrastructure addresses identical on both Base Sepolia and Base Mainnet (e.g. ERC-4337 EntryPoint v0.7, WETH).
- **D. Potentially Dangerous Hardcoded Value**: Hardcoded addresses or fallbacks that could cause misrouting if not overridden.
- **E. Unknown / Human Decision Required**: Operational decisions required prior to mainnet broadcast (e.g. launch caps, fee recipient, multisig quorum selection).

---

## 2. Configuration Audit Matrix

| File                                                        | Line/Ref      | Current Value                                                                                                                                                                                     | Purpose                                | Classification | Required Action for Mainnet                                                                     | Deployment-Time Config? |
| :---------------------------------------------------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------- | :------------: | :---------------------------------------------------------------------------------------------- | :---------------------: |
| `apps/web-v2/constants/index.ts`                            | Line 6        | `'base-sepolia'`                                                                                                                                                                                  | Default active chain name              |     **B**      | Set `NEXT_PUBLIC_ACTIVE_CHAIN="base"` in production environment                                 |         **YES**         |
| `apps/web-v2/constants/index.ts`                            | Lines 17–25   | `84532` (Fallback)                                                                                                                                                                                | Default chain ID resolution            |     **B**      | Controlled via `NEXT_PUBLIC_ACTIVE_CHAIN="base"` (`8453`)                                       |         **YES**         |
| `apps/web-v2/constants/index.ts`                            | Lines 31–44   | `https://sepolia.base.org`                                                                                                                                                                        | RPC URL resolution                     |     **B**      | Configure `NEXT_PUBLIC_RPC_URL_BASE_MAINNET` with dedicated RPC (Alchemy/QuickNode)             |         **YES**         |
| `apps/web-v2/constants/index.ts`                            | Lines 46–48   | `0xe74b400f4aea3a0b593be5acbc54f56631c0d60e`                                                                                                                                                      | Mainnet ProtocolDirectory active       |     **C**      | Canonical active Base Mainnet `ProtocolDirectory` address                                       |         **NO**          |
| `apps/web-v2/constants/index.ts`                            | Line 119      | `0x0000000071727De22E5E9d8BAf0edAc6f37da032`                                                                                                                                                      | ERC-4337 EntryPoint v0.7               |     **C**      | None (Canonical ERC-4337 v0.7 contract address is identical across all EVM chains)              |         **NO**          |
| `apps/web-v2/constants/index.ts`                            | Lines 161–163 | USDC: `0x8335...2913`<br>cbBTC: `0xcbB7...33Bf`<br>WETH: `0x4200...0006`                                                                                                                          | Base Mainnet Token addresses           |     **A**      | Active and verified on Base Mainnet. Ensure Mainnet deployment uses these addresses.            |         **NO**          |
| `apps/web-v2/constants/index.ts`                            | Lines 166–171 | USDC: `0x036C...CF7e`<br>cbBTC: `0xB0B4...8b29`<br>WETH: `0xd116...FA323`                                                                                                                         | Base Sepolia Mock Tokens               |     **A**      | Testnet only. Retained for Base Sepolia testing.                                                |         **NO**          |
| `packages/protocol/script/DeployMainnet.s.sol`              | Lines 33–45   | USDC: `0x8335...2913`<br>cbBTC: `0xcbB7...33Bf`<br>WETH: `0x4200...0006`<br>USDC Feed: `0x7e86...bc6B`<br>cbBTC Feed: `0x8C74...ed2f`<br>ETH Feed: `0xe6eb...34d5`<br>Uniswap V3: `0x2626...e481` | Base Mainnet Production Infrastructure |   **A / C**    | Verified checksummed Base Mainnet addresses matching official Chainlink and Coinbase contracts. |         **NO**          |
| `packages/protocol/script/mainnet/config/base_mainnet.json` | Lines 2–5     | `newAdmin: 0xe37b...`<br>`oldAdmin: 0x441d...`<br>`timelock: 0x610c...`                                                                                                                           | Governance live configuration          |     **A**      | Active verified on-chain governance admin & timelock parameters.                                |         **NO**          |
| `apps/web-v2/app/api/smart-account/sponsor/route.ts`        | Route         | `PAYMASTER_SIGNER_PRIVATE_KEY`                                                                                                                                                                    | AA Paymaster Verifying Signer          |     **B**      | In production, isolate signer key to server-side KMS/HSM cloud signing service.                 |         **YES**         |
| `apps/web-v2/app/api/smart-account/bundler/route.ts`        | Route         | `PIMLICO_API_KEY` / `BUNDLER_RPC_URL`                                                                                                                                                             | ERC-4337 Bundler RPC                   |     **B**      | Set dedicated Mainnet bundler endpoint in `.env.production.local`.                              |         **YES**         |

---

## 3. Deployment-Time Configuration Strategy

1. **Frontend Environment Variables (`.env.production.local`)**:

   ```bash
   NEXT_PUBLIC_ACTIVE_CHAIN=base
   NEXT_PUBLIC_APP_DOMAIN=https://app.unifyvault.xyz
   NEXT_PUBLIC_RPC_URL_BASE_MAINNET=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET=0x<MAINNET_DEPLOYED_DIRECTORY_ADDRESS>
   NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET=0x<MAINNET_DEPLOYED_ESCROW_ADDRESS>
   NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET=0x<MAINNET_DEPLOYED_MARKETPLACE_ADDRESS>
   NEXT_PUBLIC_PAYMASTER_ADDRESS_MAINNET=0x<MAINNET_DEPLOYED_PAYMASTER_ADDRESS>
   ```

2. **Zero In-Source Secrets Policy**:
   - Zero private keys or mnemonics are stored in Git.
   - All server API routes (`/api/smart-account/*`) access keys strictly via server process memory (`process.env`).
