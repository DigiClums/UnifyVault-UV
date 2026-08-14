# UnifyVault — Phase 2B-2 Verified Deployment Snapshot

## Network Configuration

- **Network:** Base Sepolia
- **Chain ID:** `84532`
- **Canonical EntryPoint v0.7:** `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **UnifyVaultPaymaster:** `0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6`
- **GasTreasury:** `0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9`
- **UVBE Token (ERC-20):** `0x006c5DF13C716E5224b33956651C4356BB90DEc0`
- **UnifyVaultController:** `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec`
- **CostBasisManagerV2:** `0x57869372AFbd7b61752f2f8d3e7F37701e28517B`
- **P2PEscrowV2:** `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb`
- **Seller Smart Account:** `0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0`
- **Buyer Smart Account (Phase 2B-1):** `0x63b81Fc51688F89b479f90f08b09510D62cB9B18`
- **Fresh Buyer Smart Account (Phase 2B-2):** `0xb0fc334b757a5ec57b58b601f3d5b2c7ad7c0d72`

---

## Phase 2A.5 On-Chain Verification

- **Gasless Deposit UserOp:** `0xb75ce81da65e527d7ba465d63f0d2c69cfbdfbcce43a3d5f30cb75e3c153835e`
  - TX: `0xee6175aaae48f070921fbff17c76899bdf993952a25ff088f1dc6d4fe9f606bf` | Block: `45464151` | Status: `Success`
- **Gasless Redeem UserOp:** `0xad16d9a9b23da6c406294eb84e55e513813fa250352ef893a74b105d15cb9876`
  - TX: `0x91807d9bb11157d60fdfda37617b73f84898144062ba1e98d1a1005a3c015b67` | Block: `45464153` | Status: `Success`

---

## Phase 2B-1 On-Chain Verification

- **Gasless UVBE Wallet-to-Wallet Transfer UserOp:** `0x66c757c2c10b42f65a7d76a06612df5f4ea92b0c48cbdbff5c731e847c2a79cf`
  - TX: `0x1f062d19fbf1fbe327da4821e25e9fa073b64c185df2a97cf1e95b0728c7c908` | Block: `45465934` | Status: `Success`
  - Sender ETH Balance: strictly `0.00 ETH` before & after
  - Recipient ETH Balance: strictly `0.00 ETH` before & after
  - Transfer Amount: `0.005 UVBE` transferred with zero gas fees deducted from user balances

---

## Phase 2B-2 On-Chain Verification

### 1. Full P2P Gasless Trade Settlement (Trade ID #4)

- **Gasless `createTrade` UserOp:** `0xebf344bd68d7b3c831609ff47d99fc695f6a6956a8e6bb9fac72178c33b567b4`
  - TX: `0x8cb3308c58061eb0a87e8446d3a58433b5e52a8b4d4138f84c7b551f82594896` | Block: `45468137` | Status: `Success`
- **Gasless `fundTrade` UserOp (2-call batch: `approve` + `fundTrade`):** `0x51ceb6f76e6b77da703690b3171225231fd6276151359a6ac6e1e502990ea405`
  - TX: `0x83836b7c4aab74073cb4b730a70d5d9259821b77504df3622a35a30a945a4145` | Block: `45468139` | Status: `Success`
- **Gasless `submitPayment` UserOp:** `0x4851ba2e45339ebb4920fc583ba91b836768874047184b394c21c9a74a9bcb9e`
  - TX: `0x69355a327907ab36b3c5381f4195cb614147485f761788fb335eedb70a93c3db` | Block: `45468141` | Status: `Success`
- **Gasless `confirmAndRelease` UserOp:** `0xe0cae739fe73cb6774b35f5f1522b1d3de7d8a9479fa7d49ae398c6093db1a14`
  - TX: `0x1323f9f4a23a244916d4cec2ea97af67834def41526b93451133c8dc625b85bb` | Block: `45468142` | Status: `Success`

### 2. Gasless P2P Cancel / Refund Path (Trade ID #5)

- **Gasless `createTrade` UserOp:** `0x461c8114c53eae288757368c719a9272612e60bdc76f818f3186b5e59e2be816`
  - TX: `0x2f385ddb936797c362b66a5cc0a08906f9343112968c00b565e2da6ccf722ba5` | Block: `45468153` | Status: `Success`
- **Gasless `cancelUnfundedTrade` UserOp:** `0x9515bdc01c39efa7708f01030578d4454d64a856667bcceff62f8e1fc1d7b67e`
  - TX: `0xf0db77df3e912f1271247e88c558959566f825302a78702400da444e491f9317` | Block: `45468155` | Status: `Success`

### 3. Fresh Buyer P2P Acquisition & Subsequent Vault Redemption (Trade ID #6)

- **Fresh Buyer Smart Account Deployment:** `0xb0fc334b757a5ec57b58b601f3d5b2c7ad7c0d72`
  - TX: `0xf6f57120270e4cb8c0b5f66b07d617a4c17fcb1cb26673f970a535dd00e9597a` | Block: `45468921` | Status: `Success`
- **Gasless `createTrade` UserOp:** `0x0a844f0bd5b474e46b0a395084b70c43bc83615baa841d23a6cc22106f1b4483`
  - TX: `0xe020ae96c5be3ad7381fa1e99aa01aa34cb8e7d5e334edca8edeb79aa0b63c51` | Block: `45468922` | Status: `Success`
- **Gasless `fundTrade` UserOp:** `0xf664fd4d2a1390b88c4216cb45c1096baa996bd5dfc4b0ec119f769e3519ab2f`
  - TX: `0x581a26b6b71da0c0933420453298f8251c294eb9bae5c92d0bdb171bb1cf3b83` | Block: `45468924` | Status: `Success`
- **Gasless `submitPayment` UserOp:** `0x8594c0c0fab9af20156e8926a6110c04e137c38f14aa369fa77612e3d78e1f8b`
  - TX: `0x43ca5f94bc1a593265ffae62772e2a9f33cbe57d3c1f6f86ef82ab2515e69cc7` | Block: `45468926` | Status: `Success`
- **Gasless `confirmAndRelease` UserOp:** `0x898a609e6065b34ac92f9f72908ace5f960c06cd9c3cbde53d8434e9efd30b87`
  - TX: `0x86043f6a53709d89925138324091b78154b8399b8829231229ead9f1363e2249` | Block: `45468927` | Status: `Success`
- **Gasless `redeem` UserOp (2-call batch: `approve` + `redeem`):** `0x20742b5a9b9b13179012ec51d54f41de494a681ee34d3cd34c9e5d8c2d2cf148`
  - TX: `0xedc7652e3f0d0ca18a5cf940d8f00508a7a6cf06114c2ad7e17e205d2de0ef2a` | Block: `45468930` | Status: `Success`
  - Received: `0.004441 USDC` (`4441` units)
  - Cost Basis: strictly `$0.00 USD`
  - Realized P&L: strictly `$0.004441 USD` (`4441000000000000` wei)
