# Artha — Investment & Net Worth Tracker

A minimal, modern, and aesthetic **Investment & Net Worth Tracker** tailored for Indian retail investors, built with **Cloudflare Workers**, **Cloudflare D1 (SQLite)**, **React 19**, **TanStack Query & Router**, and **Tailwind CSS**.

---

## ✨ Key Features

1. **Comprehensive Investment Asset Class Support**:
   - 📈 **Indian Stocks (Equities)**: Direct NSE/BSE shares imported from Groww reports.
   - 🌐 **US Stocks & ETFs**: Direct US equities and ETFs (e.g. `VOO`, `QQQM`, `AAPL`, `NVDA`, `MSFT`) with USD & INR dual tracking imported from INDmoney / Alpaca reports or manual entry.
   - 📊 **Mutual Funds**: Direct and regular MF schemes with AMC breakdown, categories, and XIRR.
   - 🪙 **SGBs (Sovereign Gold Bonds)**: Exchange-traded SGBs (Groww) and manual primary bank/RBI tranches with 2.5% coupon tracking.
   - 💎 **Indian ETFs**: Index ETFs, Gold ETFs (e.g. HDFC Gold ETF, NiftyBees).
   - 🛡️ **EPF (Employee Provident Fund)**: Multi-year client-side parsing of EPFO Member Passbook PDFs with month-level transaction preservation.
   - 📜 **PPF (Public Provident Fund)**: 15-year maturity tracking, annual deposit logs, and 7.1% tax-free interest.
   - 🏦 **Fixed Deposits (FDs)**: Bank and corporate FDs with compounding interest calculator and maturity calendar.

2. **Authoritative Statement Import (Source of Truth)**:
   - **Groww Stocks Statement (`.xlsx`)**: Auto-classifies Stocks, ETFs, and SGBs with purchase prices, quantities, and closing valuations.
   - **Groww Mutual Funds Statement (`.xlsx`)**: Extracts schemes, folios, units, invested capital, current value, and XIRRs.
   - **US Stocks Statement (`.xls`/`.xlsx`)**: Parses INDmoney / Alpaca reports (`sample-us-stocks.xls`) with USD shares, average purchase prices, and INR conversions.
   - **EPFO Member Passbook (`.pdf`)**: Browser-based multi-year parsing of member ID, establishment, closing balances, and 12-month contribution lines.

3. **Intelligent Edge Caching on Cloudflare Workers**:
   - **Mutual Funds**: Cached for **24 Hours** (AMFI NAVs update once daily in the evening).
   - **Indian & US Stocks / ETFs**: Updated every **60 Minutes during market hours** (09:15 to 15:30 IST for Indian scrips; live ticker data for US scrips like VOO, QQQM).
   - **Client-Side TanStack Query Cache**: Persisted to browser `localStorage` for **0ms instant startup hydration**.

4. **Point-in-Time Manual Net Worth Snapshots**:
   - Capture timestamped portfolio snapshots on demand.
   - Historical **Net Worth Trajectory Area Chart** (Invested vs Total Net Worth over time).
   - Milestone tracking table with **Delta growth comparisons** (₹ and % growth vs previous snapshot).

5. **Aesthetic Fintech UI & Mobile-First Design**:
   - Dark mode fintech aesthetic with high-contrast emerald gains and typography.
   - **Mobile Bottom Navigation Bar** with Quick Action drawer.
   - **Responsive Card View** on mobile phones and full rich table on desktop.
   - **Privacy Mode (👁️ Toggle)** to mask balances in public.

---

## 🏗️ Project Structure

```text
investment-tracker/
├── backend/                  # Cloudflare Workers API (Hono + D1 SQLite + JWT)
│   ├── src/
│   │   ├── index.ts          # API entry point & CORS
│   │   ├── routes/           # Auth, Holdings, Snapshots, Market Proxy
│   │   ├── services/         # AMFI 24h & Stock 60m market-hours cached services
│   │   └── db/schema.sql     # D1 SQLite schema
│   ├── scripts/              # Local DB seeding & migration script (ensure-dev-admin.mjs)
│   └── wrangler.jsonc        # Cloudflare configuration
│
├── frontend/                 # React 19 SPA (Vite + TanStack Router + Tailwind)
│   ├── src/
│   │   ├── components/       # Header, MobileNav, Hero metrics, Donut, Trajectory chart, Modals
│   │   ├── parsers/          # Client-side XLSX/PDF parsers (Groww Stocks, Groww MF, US Stocks, EPFO)
│   │   ├── hooks/            # useHoldings, useSnapshots, useAuth
│   │   └── lib/              # API client and calculations
│   └── vite.config.ts
│
├── shared/                   # Shared TypeScript models, schemas & formulas
└── package.json              # Monorepo workspaces
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed / Migrate Local D1 Database
```bash
node backend/scripts/ensure-dev-admin.mjs
```

### 3. Start Backend & Frontend

#### Terminal 1: Backend API (Port 8787)
```bash
npm run dev:backend
```

#### Terminal 2: Frontend App (Port 5173)
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) and log in with default seeded dev credentials:
- **Username**: `admin`
- **Password**: `password123`
