# UnifyVault Engineering Constitution v1

## Mission

Build the world's most transparent and verifiable on-chain multi-asset vault.

---

## Non-Negotiable Rules

1. **Blockchain is the database.**
2. **Smart contracts are the backend.**
3. **Wallet is the identity.**
4. **Frontend is only a renderer.**
5. **ProtocolDirectory is the only registry.**
6. **No hidden state.**
7. **No fake data.**
8. **No hardcoded protocol assumptions.**

---

## Engineering Priorities

1. **Security** (always first)
2. **Correctness**
3. **Decentralization**
4. **Maintainability**
5. **Performance**
6. **Features** (last)

---

## Release Policy

Every release must satisfy:

- All unit, integration, and fork tests pass (`forge test`, `pnpm test`).
- No critical or high-severity audit findings remain unresolved.
- No unverified contract addresses.
- No hardcoded production configuration.
- Documentation updated across protocol & frontend specifications.
- `CHANGELOG.md` updated.
- Annotated Git release tag created (`vX.Y.Z`).

---

## Pull Request Checklist

Every change must answer:

1. **Why is this change needed?**
2. **What contracts are affected?**
3. **Does it change protocol state?**
4. **Does it introduce new trust assumptions?**
5. **Does it affect security?**
6. **Does it remain blockchain-first?**
7. **Are tests included?**
8. **Is documentation updated?**

_If any answer is missing, the PR is not ready for review or merge._

---

## Long-Term Vision

Rather than becoming "another DeFi app," UnifyVault is designed to be an open protocol that third-party wallets, dashboards, and applications can integrate with seamlessly. If an independent team can build an entirely custom frontend against our smart contracts and `ProtocolDirectory` without altering protocol behavior, that is the ultimate proof of proper architectural separation.
