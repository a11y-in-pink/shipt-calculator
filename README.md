# 🛒 Shipt Calculator

> **Is this batch worth it?** A profitability calculator for Shipt shoppers — available as a React app and a TypeScript CLI.

Built for real-world Shipt shopping decisions: punch in the batch offer, estimated tip, any bonuses, miles, and time — and get an instant verdict based on *your* thresholds, not some generic guideline.

---

## Features

- **Dual threshold verdict** — flags batches that fail your minimum net hourly rate *or* minimum net pay (both must pass for a green light)
- **Tip + bonus aware** — enter offer, estimated tip, and on-time bonuses separately, just like they appear on the Shipt card
- **Minutes, not hours** — enter the estimated time directly from the card, no mental math
- **Effort scoring** — rates physical effort based on item count, miles, and number of stores
- **Weekly strategy** — set your schedule and see projected weekly and monthly net income
- **Your car, your gas** — enter your actual gas cost per mile (defaults to a 2015 Honda Civic @ Orlando gas prices)

---

## React App

### Usage

Drop `ShiptCalculator.jsx` into any React project:

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
# copy ShiptCalculator.jsx into src/
```

Update `src/App.jsx`:

```jsx
import ShiptCalculator from './ShiptCalculator'
export default function App() { return <ShiptCalculator /> }
```

```bash
npm run dev
```

### Tabs

**📦 Evaluate Batch** — Enter the batch details straight from the Shipt card and get an instant TAKE IT / SKIP IT / BORDERLINE verdict with a breakdown of why.

**📅 Weekly Strategy** — Set your target net hourly rate, minimum net pay per batch, and your schedule. Drives the verdict logic on the batch tab.

---

## CLI

### Requirements

```bash
npm install -g ts-node typescript
```

### Usage

```bash
ts-node shipt-cli.ts
```

Follow the prompts to evaluate a single batch, plan your weekly strategy, or both.

---

## How the Math Works

```
Net Pay     = (Base Offer + Tip + Bonus) - (Miles × (Gas/mi + $0.08 wear & tear))
Net Hourly  = Net Pay ÷ (Minutes ÷ 60)

Verdict:
  ✅ TAKE IT     → clears both your hourly AND net pay thresholds
  🤔 BORDERLINE  → fails one threshold
  ❌ SKIP IT     → fails both thresholds
```

Effort score (1–10) is a weighted composite of items/hour, miles/hour, and number of stores. Higher effort slightly adjusts the profitability signal — a $15/hr batch with brutal effort is worth less than a $15/hr easy one.

---

## Default Values

| Setting | Default | Why |
|---|---|---|
| Gas cost/mile | $0.096 | 2015 Honda Civic @ $2.87/gal ÷ 30 MPG |
| Wear & tear/mile | $0.08 | Conservative estimate, auto-applied |
| Target hourly | $15/hr | Adjust to your needs |
| Min net pay | $10 | Adjust to your needs |

---

## Stack

- React (no dependencies beyond React itself)
- TypeScript (CLI)
- Zero UI libraries — all inline styles

---

*Not tax advice. Wear & tear is an estimate. Your mileage will vary — literally.*
