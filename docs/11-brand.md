# UnifyVault Brand Identity Guidelines

## Brand Strategy, Messaging Framework, and Design Language Specification

**Version 1.0** — _July 2026_

---

## 1. The Brand Story

UnifyVault was founded to address the friction, complexity, and lack of transparency in the digital asset market. For many retail investors, especially in growing markets like India, investing in digital assets is complicated by fragmented exchanges, wallet complexities, and volatile tokens.

Our mission is to simplify digital asset investing, making it as straightforward as a standard bank transfer or UPI payment.

UnifyVault is not a speculative project. We do not issue volatile tokens or promise high yields. Instead, we build the pipes, vaults, and indices that make wealth generation secure, passive, and automated. By combining the safety of blue-chip crypto assets with the convenience of modern payment interfaces, we are building infrastructure that outlasts market cycles.

---

## 2. Brand Positioning

UnifyVault is positioned as a reliable, secure gateway to digital asset indices.

```
                           [Financial Security]
                                    ▲
                                    │
                                    │      * UnifyVault
  [Complex DeFi / Trading] ─────────┼─────────> [Simple Wealth Apps]
                                    │
                                    │
                                    ▼
                          [Speculative / Volatile]
```

- **Who We Are:** A transparent, non-custodial crypto index protocol. We provide simplified access to diversified baskets of blue-chip digital assets.
- **Who We Are NOT:** We are not a trading exchange, a speculative asset pool, or a high-yield investment fund.
- **Core Value Proposition:** Single-transaction exposure to institutional-grade digital asset indexes (50% BTC + 50% ETH), backed by real-time, on-chain Proof of Reserve.
- **Target Audience:** Long-term retail savers, financial platforms, neo-banks, and developer teams looking to build investment tools on top of our protocol.

---

## 3. Brand Personality

The UnifyVault brand is built on four core personality attributes:

- **Trustworthy:** We prioritize safety and compliance, securing treasury assets using multi-signature hardware setups and transparent on-chain registries.
- **Transparent:** We reject hidden fees and secret margins. Circulating supply and collateral backing are publicly verifiable on-chain in real time.
- **Professional:** We use clean design layouts and clear messaging, avoiding the speculative hype often associated with crypto projects.
- **Simple:** We abstract complex blockchain operations, providing a user experience that can be understood by a first-time investor in minutes.

---

## 4. Brand Voice & Tone Guidelines

Our communications use a **clear, informative, and direct** tone.

| Communication Channel    | Tone                       | Example Message                                                                                                           |
| :----------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Website & Apps**       | Direct & Helpful           | "Deposit stablecoins to mint UVBTCETH and get diversified exposure to Bitcoin and Ethereum in a single transaction."      |
| **Documentation**        | Technical & Precise        | "The `NAVCalculator` fetches pricing data from Chainlink aggregators and calculates index value based on vault holdings." |
| **Social Media**         | Informative & Professional | "We've integrated on-chain Proof of Reserve metrics. Anyone can verify our backing ratios directly on the Base network."  |
| **System Notifications** | Concise & Accurate         | "Mint transaction completed. 831.66 UVBTCETH delivered to wallet 0x12ab..."                                               |

---

## 5. Messaging Framework

### 5.1. Core Application Messaging

#### Landing Page Header

- **Headline:** "Passive Crypto Investing. Verifiable Safety."
- **Body Copy:** "Get equal exposure to Bitcoin and Ethereum in a single transaction. Fully backed by on-chain reserves and secured by Base Layer-2 infrastructure."

#### Wallet Connection Message

- **Instructional Text:** "Connect your wallet to securely access your portfolio. Signing this message registers your address on the Base network."

#### Proof of Reserve Notice

- **Copy:** "Fully Collateralized. Every unit of UVBTCETH in circulation is backed 1-to-1 by matching reserves held in our custody vaults. Verify the balances on-chain."

---

## 6. Target Taglines

- **Primary Tagline:** "Simple. Transparent. Index-Backed."
- **Developer Focus:** "Developer-first index infrastructure on Base."
- **Investor Focus:** "Blue-chip crypto exposure, simplified."

---

## 7. Logo Design Principles

The UnifyVault logo represents safety, balance, and growth.

```
       [U] Shield Shape            [V] Core Intersection
  (Represents secure custody)   (Represents equal asset weights)
```

- **Symbolism:** The logo mark combines a shield (representing secure custody) with intersecting geometric lines (representing the balance between Bitcoin and Ethereum).
- **Safe Area:** The logo requires a minimum clear space equal to 50% of the mark's total height on all sides.
- **Adaptability:** The logo must be legible at small sizes, including favicon (16x16px) and application icon formats.

---

## 8. Color Palette System

Our color palette uses colors that communicate safety, clarity, and stability:

| Color Role          | Hex Code  | HSL Value            | Accessibility Contrast (on Base Background) |
| :------------------ | :-------- | :------------------- | :-----------------------------------------: |
| **Primary Indigo**  | `#4F46E5` | `HSL(239, 84%, 59%)` |          Pass (WCAG AA Large Text)          |
| **Teal Accent**     | `#0D9488` | `HSL(175, 84%, 32%)` |           Pass (WCAG AA Graphics)           |
| **Dark Base**       | `#0B0F19` | `HSL(223, 38%, 7%)`  |          Primary background color           |
| **Light Pearl**     | `#F9FAFB` | `HSL(210, 20%, 98%)` |         Primary container backdrop          |
| **Success Emerald** | `#10B981` | `HSL(162, 76%, 41%)` |     Pass (Verified and solvent labels)      |
| **Warning Amber**   | `#F59E0B` | `HSL(38, 92%, 50%)`  |       Pass (Stale price/alert states)       |
| **Error Rose**      | `#E11D48` | `HSL(347, 77%, 50%)` |  Pass (System paused / transaction failed)  |

---

## 9. Typography Scales

The brand uses two typefaces via Google Fonts to organize content hierarchies:

- **Outfit (Headings):** Used for titles and headers to provide a clean, geometric style.
- **Inter (Body Text):** Used for body text, form elements, and tables to ensure legibility.

```
  H1 Outfit Medium (32px) ────> UnifyVault Protocol
  H2 Outfit Regular (24px) ───> The Flagship UVBTCETH Index
  Body Inter Regular (16px) ──> Mint tokens to acquire diversified exposure.
  Label Inter Medium (12px) ──> TVL: $42,085,900
```

- **`font-mono` (JetBrains Mono):** Used for code snippets, block numbers, transaction hashes, and asset balances.

---

## 10. Design Language Standards

- **Cards:** Uses flat cards with subtle borders (`1px solid border-slate-200`) and rounded corners (`rounded-xl` / `12px`).
- **Interactive Buttons:** Primary buttons use solid indigo backgrounds with clear hover transitions. Secondary buttons use transparent backdrops and borders.
- **Forms & Inputs:** Standard inputs display values clearly, with error states outlined in red.
- **Empty States:** Uses simple illustrations and clear descriptions, avoiding cluttered layouts.

---

## 11. Iconography System

- **Visual Style:** Icons use a uniform 2px stroke weight with rounded terminals (`stroke-round`).
- **Theme Consistency:** Icons adapt color states based on their context (e.g., using amber for stale status states and green for verified backing status).

---

## 12. Website Copy Outline

### Hero Section

- **Title:** "Passive Crypto Investing. Verifiable Safety."
- **Subtext:** "Get equal exposure to Bitcoin and Ethereum. Fully backed by on-chain reserves and secured by Base Layer-2."
- **CTA:** "Connect Wallet to Start"

### Proof of Reserve Section

- **Headline:** "Cryptographic Verification"
- **Body Copy:** "UnifyVault uses on-chain Proof of Reserve verification. Anyone can audit the vault contracts to verify that our circulating supply is backed 1-to-1 by assets in custody."

---

## 13. Social Media Presence

- **LinkedIn:** Focused on corporate updates, security audits, and institutional integrations.
- **X (formerly Twitter):** Used for real-time announcements, integration alerts, and community updates.
- **GitHub:** The repository for development updates, open issues, and code reviews.

---

## 14. Community Values

- **Open-Source Philosophy:** All smart contracts and SDKs are open-source to support collaborative development and audits.
- **Moderation Principles:** Community channels (such as Discord and Telegram) focus on developer support and product feedback, filtering out speculative price hype.

---

## 15. Brand Governance

- **Naming Conventions:** The name is always written as a single word: **UnifyVault**. Baskets are capitalized as **UVBTCETH**.
- **Trademark Policy:** Partner platforms can display the logo to indicate integration but must not modify its geometry or colors.
