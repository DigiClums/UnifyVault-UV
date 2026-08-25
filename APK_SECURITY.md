# 🔐 UnifyVault Android APK Security & Cryptographic Invariants

## 1. Key Storage & Signing Invariants

1. **Zero Private Key Storage**:
   - The UnifyVault APK **NEVER** stores, imports, asks for, or manages user private keys or seed phrases.
   - All cryptographic signatures (ERC-20 approvals, deposits, redemptions, staking, escrow actions) are delegated to external user-controlled mobile wallets (MetaMask, Coinbase Wallet, Rainbow, Trust Wallet) via WalletConnect v2 EIP-1193 RPC.

2. **No Centralized Backend Key Management**:
   - The protocol does not rely on custodial accounts or server-side key relayers for user fund operations.

---

## 2. Receipt OCR & Evidence Handling

1. **100% Client-Side Processing**:
   - Receipt images are analyzed on-device memory.
   - Images are **NOT** uploaded to central UnifyVault servers for permanent archival.
2. **On-Chain Anchor**:
   - The client computes `keccak256(receiptBytes)` as the immutable on-chain proof anchor.
3. **Dispute Arbitration**:
   - In the event of a dispute, the evidence is shared directly within the encrypted P2P trade channel between the buyer, seller, and authorized arbitrator.

---

## 3. Update Verification & Integrity

1. **Cryptographic Release Verification**:
   - Updates distributed via GitHub Releases or IPFS must match the published cryptographic SHA-256 release hash.
2. **Android Keystore App Signing**:
   - Production APKs are signed with a secure Android Keystore key. Never commit release keystores or passwords to version control.
3. **AppRegistry On-Chain Interface**:
   - When deployed, `AppRegistry.sol` provides on-chain minimum version enforcement to protect users from deprecated smart contract interactions.
