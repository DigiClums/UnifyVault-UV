# UnifyVault V2 — STRIDE Threat Model & Known Limitations

## 1. STRIDE Threat Analysis

| Threat Category            | Potential Threat                               | Protocol Mitigation                                                                        |
| :------------------------- | :--------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **Spoofing**               | Attacker calls controller claiming to be vault | Role-based authorization (`CONTROLLER_ROLE`) strictly enforced via `AccessRoles.sol`.      |
| **Tampering**              | Mutating oracle feed registry                  | `OracleManager` updates restricted to `DEFAULT_ADMIN_ROLE` under 48h Timelock.             |
| **Repudiation**            | Denying administrative actions                 | All governance changes emit immutable on-chain events (`RoleGranted`, `ModuleRegistered`). |
| **Information Disclosure** | Reading private state                          | All smart contract state is public on-chain by design.                                     |
| **Denial of Service**      | Spamming deposit with 0 assets                 | Reverts on zero asset deposit or zero share minting. Emergency pause available.            |
| **Elevation of Privilege** | Bypassing timelock                             | `UnifyVaultTimelock` enforces delay programmatically at the EVM level.                     |

---

## 2. Known Limitations & Out-of-Scope Risks

1. **Chainlink Oracle Outage**: If Chainlink price feeds stall for $> 24$ hours, deposits/redemptions pause automatically until feed resumes.
2. **Underlying Asset Insolvency**: If an underlying asset (e.g. USDC or cbBTC) permanently de-pegs or defaults on-chain, the vault portfolio value reflects the loss proportionally.
3. **EVM L2 Sequencer Downtime**: On Base Mainnet, if the Optimism L2 sequencer experiences downtime, transactions pause until sequencer recovers.
