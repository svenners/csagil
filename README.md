# CS AGIL FINANCE — Brazilian Fiscal & Financial Ledger Suite

[![Next.js](https://img.shields.io/badge/Next.js-16%20App%20Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20Passed-green)](https://vitest.dev/)

**CS AGIL FINANCE** is a modern, high-precision financial ledger and Brazilian fiscal document management platform. It is engineered from the ground up as a production-grade evolution of the legacy `csfinance` application, designed specifically for Brazilian business compliance (NFS-e / NF-e, BACEN PIX, IBPT, Simples Nacional) and seamless collaboration with external accountants.

---

## 🌟 Key Improvements Over `csfinance`

| Feature | Legacy `csfinance` | **CS AGIL FINANCE** |
| :--- | :--- | :--- |
| **Framework & Hosting** | Client-only Vite SPA | **Next.js 16 App Router + Vercel + Supabase SSR** |
| **Data Persistence** | Browser `localStorage` (loss risk) | **ACID PostgreSQL (Supabase / Docker)** with Row Level Security |
| **Currency & Math** | JavaScript floating-point numbers | **Exact Integer Centavos (`bigint`)** eliminating rounding drift |
| **Accountant Access** | None (full write access or nothing) | **Enforced Read-Only Role**: View ledger, preview receipts, download Closing Packs, with server-enforced mutation blocking (`403 Forbidden`) |
| **PIX QR Standards** | Non-standard Tag 01 (`12`) | **Official BACEN EMV BR Code (Tag 01 = `11`)** verified by Central Bank banking apps |
| **Withholding Taxes** | Not recalculated on invoice total | **Accurate Fiscal Deduction**: Net Payable = Gross - Retenções (ISS, PIS, COFINS, CSLL, IRRF) |
| **Languages** | Hardcoded strings / partial translation | **Full English & Portuguese (PT-BR) toggle** with synchronized currency formatting |
| **Bank Statements** | Fragile regex parsing | **Pure-JS Multi-Format Engine**: Caixa Extratos, OFX, CSV, Excel (XLSX), and digital PDF bank extracts with duplicate detection |
| **Rule Integrity** | Orphan rules upon category deletion | **PostgreSQL Foreign Keys with `ON DELETE CASCADE`** and instant batch rule execution |
| **Migration** | Manual re-entry | **1-Click JSON Backup Importer** to migrate directly from `csfinance` |

---

## 🏗️ Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router with Server Actions & API Routes) + React 19.
- **Styling:** Tailwind CSS v4 with custom cream & forest green aesthetic (`#f8fae5`, `#2f5c40`, `#4a7c59`).
- **Database & ORM:** PostgreSQL 16 managed via Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Authentication:** Supabase SSR Auth with cookie session management + local development bypass (`DEV_AUTH_BYPASS=true`).
- **Fiscal Utilities:** Central Bank PIX CRC16/CCITT-FALSE generator, 44-digit NF-e access key generator with IBGE state codes, Modulo 11 check digits, and CPF/CNPJ validators.
- **Document Generation:** Client-side vector PDF generator (`jspdf`) and monthly accountant Closing Pack exporter (`xlsx`).
- **Testing:** Comprehensive Vitest unit test suite covering fiscal math, bank statement parsers, category rules, and accountant read-only security guards.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v20+ or v22+
- `npm` or `pnpm`

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/svenners/csagil.git
cd csagil
npm install
```

### 3. Start Local PostgreSQL Database
Run the included Docker Compose container (PostgreSQL 16 on port 5432):
```bash
docker compose up -d
```

### 4. Configure Environment
Copy the environment template:
```bash
cp .env.example .env.local
```

The default `.env.local` is already configured for local Docker development:
```env
DATABASE_URL=postgres://csagil_user:csagil_secret_password@localhost:5432/csagil_db
DEV_AUTH_BYPASS=true
DEV_USER_ROLE=owner
DEV_USER_EMAIL=admin@csagil.local
```

### 5. Push Database Schema
Apply the normalized database schema (tables, foreign keys, and indexes) to Postgres:
```bash
npx drizzle-kit push --force
```

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🛡️ Testing Accountant (Read-Only) Role

To verify how the application behaves for an external accountant:
1. Open `.env.local` and change:
   ```env
   DEV_USER_ROLE=accountant
   ```
2. Restart or reload `http://localhost:3000`.
3. Notice:
   - Visual **Accountant (Read-Only)** badge appears in the header and sidebar.
   - All mutation buttons ("Add Transaction", "Emit Fiscal Document", "New Category", "Delete") are disabled or hidden.
   - Any direct mutation requests to `/api/transactions`, `/api/invoicing`, or `/api/categories` are blocked with HTTP `403 Forbidden`:
     `FORBIDDEN_ACCOUNTANT_READ_ONLY: The accountant role has read-only access and cannot modify financial records.`

---

## ☁️ Production Cloud Deployment (Vercel + Supabase)

CS AGIL FINANCE is designed to be deployed to **Vercel** with a free or pro **Supabase PostgreSQL** backend.

### Step 1: Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings -> Database**, locate your **Connection String (URI)**.
   Format:
   ```text
   postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
3. In **Project Settings -> API**, copy:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public key` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role secret key` (`SUPABASE_SERVICE_ROLE_KEY`)

### Step 2: Push Database Schema to Supabase
Run the schema push against your Supabase connection string:
```bash
DATABASE_URL="postgres://postgres.[REF]:[PASS]@[HOST]:6543/postgres?sslmode=require" npx drizzle-kit push --force
```

### Step 3: Deploy to Vercel
1. Push your repository to GitHub (`svenners/csagil`).
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the following **Environment Variables** in Vercel project settings:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Supabase pooled connection URI with `?sslmode=require` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role secret key |
| `DEV_AUTH_BYPASS` | `false` (enables full Supabase OAuth & Magic Link auth) |

4. Click **Deploy**. Vercel will build and launch your application globally.

---

## 📥 Migrating from `csfinance`

If you have existing financial records in `csfinance`:
1. In `csfinance`, click **Export / Backup JSON** to download your database snapshot.
2. In **CS AGIL FINANCE**, navigate to **Settings -> Restore from csfinance Backup JSON**.
3. Select your `.json` file and click **Restore**.
4. The migration engine automatically:
   - Converts monetary floats to integer centavos.
   - Preserves all transaction dates, merchants, and descriptions.
   - Re-links categories and rebuilds automated rules.
   - Migrates registered customers and emitted invoices with verified tax totals.

---

## 🧪 Running Automated Tests

Run the test suite via Vitest:
```bash
npm test
# or
npx vitest run
```

Run TypeScript verification:
```bash
npx tsc --noEmit
```

Test production compilation:
```bash
npm run build
```

---

## 📄 Reference Documents
The original specification and user manual are preserved under:
- `docs/reference/CS_Agil_Finance_User_Guide.pdf`

---

## 🔒 License
Proprietary — Charlton Shaw / Agil Finance. All rights reserved.
