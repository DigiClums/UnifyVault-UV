# UnifyVault V2 Design System

## 1. Aesthetic Vision & Design Principles

UnifyVault V2 utilizes a modern, sleek, glassmorphic dark-first aesthetic tailored for institutional-grade DeFi applications.

- **Visual Impact**: Dark slate surfaces (`#090D16`), subtle ambient blue glows, glassmorphism backdrop blurs (`backdrop-blur-md`), and high-contrast typography.
- **Micro-Animations**: Smooth transition effects (`transition-all duration-200 ease-in-out`), hover scale shifts (`hover:scale-[1.01]`), and pulsing loading states (`animate-pulse`).
- **Precision**: Clean data visualization, clear financial metrics, and prominent status indicators.

---

## 2. Color Palette & Tokens

```css
:root {
  /* Surface & Background */
  --bg-primary: #090d16;
  --bg-secondary: #111827;
  --bg-card: rgba(31, 41, 55, 0.6);
  --bg-card-border: rgba(255, 255, 255, 0.08);

  /* Primary Branding (Modern Blue / Indigo) */
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-glow: rgba(59, 130, 246, 0.25);

  /* Success (Emerald) */
  --success-500: #10b981;
  --success-glow: rgba(16, 185, 129, 0.2);

  /* Warning (Amber) */
  --warning-500: #f59e0b;
  --warning-glow: rgba(245, 158, 11, 0.2);

  /* Error / Danger (Rose) */
  --error-500: #ef4444;
  --error-glow: rgba(239, 68, 68, 0.2);

  /* Neutral Grayscale */
  --gray-100: #f3f4f6;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-700: #374151;
  --gray-900: #111827;
}
```

---

## 3. Typography Hierarchy

- **Font Family**: Primary Sans: `Inter`, `Outfit`, sans-serif. Monospace: `JetBrains Mono`, monospace.

| Scale           | Class / Token             | Size / Weight | Usage                            |
| :-------------- | :------------------------ | :------------ | :------------------------------- |
| **Heading 1**   | `text-4xl font-extrabold` | 36px / 800    | Page Titles, Hero Banner         |
| **Heading 2**   | `text-2xl font-bold`      | 24px / 700    | Section Headers, Modal Titles    |
| **Heading 3**   | `text-lg font-semibold`   | 18px / 600    | Card Titles, Form Headers        |
| **Body Large**  | `text-base font-medium`   | 16px / 500    | Main Body, Primary Buttons       |
| **Body Small**  | `text-sm font-normal`     | 14px / 400    | Secondary Descriptions, Labels   |
| **Caption**     | `text-xs font-medium`     | 12px / 500    | Timestamps, Footers, Badges      |
| **Mono Metric** | `font-mono text-xl`       | 20px / 600    | Financial Values, Token Balances |

---

## 4. Spacing, Radius & Elevation System

- **Spacing Grid**: 4px base unit (`gap-2` = 8px, `gap-4` = 16px, `p-6` = 24px, `p-8` = 32px).
- **Border Radius**:
  - `rounded-lg` (8px): Inputs, Buttons, Small Badges.
  - `rounded-xl` (12px): Standard Cards, Modals.
  - `rounded-2xl` (16px): Large Container Sections, Hero Cards.
- **Shadow System**:
  - `shadow-sm`: Subtle element separation (`0 1px 2px rgba(0,0,0,0.5)`).
  - `shadow-glow-blue`: Ambient primary card glow (`0 0 25px rgba(59,130,246,0.15)`).
  - `shadow-glow-green`: Success alert glow (`0 0 20px rgba(16,185,129,0.15)`).
