# 🏆 EvalPro — Comprehensive Project Documentation & Architecture Guide

Welcome to the full technical and architectural overview of **EvalPro: Neo-Brutalist Hackathon Mark Scoring Portal**.

This document covers everything you need to know about the project: what it is, how every component works, the database architecture, user roles, real-time mechanics, scoring formulas, and deployment workflows.

---

## 📑 Table of Contents
1. [Project Overview & Core Purpose](#1-project-overview--core-purpose)
2. [Technology Stack](#2-technology-stack)
3. [Architecture & System Flow](#3-architecture--system-flow)
4. [User Roles & Key Features](#4-user-roles--key-features)
5. [Scoring Rubric & Evaluation Logic](#5-scoring-rubric--evaluation-logic)
6. [Database Schema & Supabase Integration](#6-database-schema--supabase-integration)
7. [Repository File & Directory Structure](#7-repository-file--directory-structure)
8. [Real-time Synchronization Mechanics](#8-real-time-synchronization-mechanics)
9. [Configuration & Environment Variables](#9-configuration--environment-variables)
10. [Local Development, Build & Deployment](#10-local-development-build--deployment)

---

## 1. Project Overview & Core Purpose

**EvalPro** is an official, tamper-proof hackathon and competition management portal designed to streamline multi-round project evaluations, eliminate manual Excel scorekeeping, and present real-time, broadcast-ready leaderboards.

### Key Value Propositions:
- **Zero-Latency Live Leaderboard**: Instantly updates over WebSockets the exact second a jury submits or modifies marks.
- **Fairness & Anonymity**: The public dashboard strictly hides jury names and jury counts to maintain evaluation impartiality and confidentiality.
- **Multi-Round Lifecycle**: Supports distinct rounds (Round 1 preliminary evaluation, round locking, and Round 2 final evaluation).
- **Neo-Brutalist Visual Design**: High-contrast, bold borders, vivid retro accents, and clean typography tailored for live projector display.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18** (TypeScript) | Component-driven, responsive UI with strict type safety. |
| **Build Tool & Bundler** | **Vite 6** | Ultra-fast Hot Module Replacement (HMR) and optimized rollup production bundles. |
| **Styling System** | **Tailwind CSS 3** + Custom Neo-Brutalist Tokens | Bold typography, high-contrast borders, sharp shadows, and badge components. |
| **Icons** | **Lucide React** | Clean, modern vector icons for actions, states, and indicators. |
| **Backend & Database** | **Supabase (PostgreSQL 15)** | Relational database hosting teams, juries, evaluations, and app states. |
| **Real-time Protocol** | **Supabase Realtime (WebSockets)** | Server-to-client push updates on database INSERT/UPDATE/DELETE events. |
| **Deployment Target** | **Cloudflare Pages** via **Wrangler** | Global edge CDN hosting with microsecond latency and SSL. |

---

## 3. Architecture & System Flow

```
+─────────────────────────────────────────────────────────────────────────────+
│                                CLIENT BROWSER                               │
│                                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│   │  Public Leaderboard │  │  Jury Portal Panel  │  │ Super Admin Console│  │
│   │  (Presenter View)   │  │  (Score Input)      │  │ (Rounds / Juries)  │  │
│   └──────────▲──────────┘  └──────────┬──────────┘  └─────────┬──────────┘  │
+──────────────┼────────────────────────┼───────────────────────┼─────────────+
               │                        │                       │              
               │ WebSocket Push         │ REST Insert / Update  │ REST Admin   
               │ (Realtime Broadcast)   │                       │ Controls     
               │                        ▼                       ▼              
+──────────────┴──────────────────────────────────────────────────────────────+
│                           SUPABASE CLOUD PLATFORM                           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      PostgreSQL 15 Database                         │   │
│   │   ├── teams (id, name, members, tag, created_at)                    │   │
│   │   ├── juries (id, email, password, name, created_at)                │   │
│   │   ├── evaluations (id, team_id, jury_id, round, criteria, total)    │   │
│   │   └── app_settings (key: competition_state, value: jsonb)           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│   ┌─────────────────────────────────▼───────────────────────────────────┐   │
│   │            Supabase Realtime Engine (Postgres WAL CDC)              │   │
│   │   Broadcasts table mutations to connected clients                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 4. User Roles & Key Features

### 👤 1. Public Viewer / Presenter Screen
- **Leaderboard View**: Displays rankings based on Round 1, Round 2, or Cumulative overall score.
- **Search & Filter**: Real-time fuzzy search by team name or student member names.
- **Strict Privacy**: Evaluator identities, comments, and internal metrics are hidden from this view.

### ⚖️ 2. Jury Member (Evaluator Console)
- **Dedicated Authentication**: Log in using assigned Jury credentials.
- **Assigned Team List**: View list of registered teams and evaluation status (Pending / Evaluated).
- **Interactive Scoring Rubric**: Sliders and number inputs with automatic real-time total calculation.
- **Mark Locking**: Once scores are submitted for an active round, entries lock to prevent accidental modification unless unlocked by the Admin.

### 🛡️ 3. Super Admin Console
- **Default Super Admin**: `ravitejaraviteja900@gmail.com`
- **Round Sequencing**:
  - Start / Pause Round 1.
  - Lock Round 1 marks (freezes preliminary scores).
  - Activate Round 2 (unlocks final evaluation matrix).
- **Jury Account Manager**: Instantly generate jury accounts with randomized secure passwords and one-click copy.
- **Bulk CSV Import**: Upload a CSV file or paste raw student team data (Team Name, Members, Track/Tag).
- **Score Overrides**: View breakdown per judge, edit individual scores, or delete submissions to permit re-evaluations.
- **Export Data**: Download complete competition scoring sheets as CSV/Excel.

---

## 5. Scoring Rubric & Evaluation Logic

Each evaluation is graded across **4 core criteria** (each out of 25 marks, totaling 100):

| Criterion | Max Marks | Focus Area |
| :--- | :---: | :--- |
| **💡 Innovation & Originality** | 25 | Uniqueness of idea, novel problem-solving approach. |
| **⚙️ Technical Complexity** | 25 | Architecture, depth of code, scalability, technical hurdles overcome. |
| **🎯 Feasibility & Impact** | 25 | Practical viability, user relevance, market/social utility. |
| **🎤 Presentation & Q&A** | 25 | Clarity of pitch, live demonstration, defensive answering in Q&A. |
| **Total Possible** | **100** | Cumulative mark per jury evaluation. |

### Aggregation Formula:
- **Round 1 Team Score** = Average of all Jury marks submitted for Team $T$ in Round 1:
  $$\text{Score}_{R1} = \frac{\sum \text{Total}_{R1}}{N_{Juries}}$$
- **Round 2 Team Score** = Average of all Jury marks submitted for Team $T$ in Round 2:
  $$\text{Score}_{R2} = \frac{\sum \text{Total}_{R2}}{N_{Juries}}$$
- **Cumulative Final Score** = Combined performance across both rounds:
  $$\text{Final Score} = \text{Score}_{R1} + \text{Score}_{R2}$$

---

## 6. Database Schema & Supabase Integration

The database is built on PostgreSQL with Row Level Security (RLS) and JSONB support:

### `public.teams`
Stores all registered hackathon teams.
```sql
CREATE TABLE public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    members TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `public.juries`
Stores jury panel accounts and credentials.
```sql
CREATE TABLE public.juries (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `public.evaluations`
Stores every individual mark sheet submitted by judges.
```sql
CREATE TABLE public.evaluations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    jury_id TEXT NOT NULL REFERENCES public.juries(id) ON DELETE CASCADE,
    jury_email TEXT NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 1),
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- { innovation: 24, tech: 23, feasibility: 22, presentation: 24 }
    total INTEGER NOT NULL DEFAULT 0,
    remarks TEXT DEFAULT '',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `public.app_settings`
Stores global competition states (Active round, locked states, visibility toggles).
```sql
CREATE TABLE public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Repository File & Directory Structure

```
prompthon_final_dashboard/
├── .env                      # Live secrets (Supabase credentials & Cloudflare tokens)
├── .env.example              # Template environment variables
├── index.html                # HTML5 root template
├── package.json              # Project dependencies, build and deploy scripts
├── tsconfig.json             # TypeScript compiler rules
├── tailwind.config.js        # Neo-brutalist styling theme configuration
├── vite.config.ts            # Vite bundler configuration & local dev proxy
├── data_from_user.csv        # Seed CSV containing registered hackathon teams
├── supabase_schema.sql       # Full PostgreSQL database schema definition
├── setup_supabase.py         # Python database migration and schema setup script
├── seed_supabase.py          # Python seeding script for initial teams and juries
├── scripts/                  # Node.js maintenance & database verification scripts
│   ├── check_data.js         # Queries current rows in tables
│   ├── enable_realtime.js    # Ensures PostgreSQL CDC publication is active
│   ├── verify_all.js         # Comprehensive health-check script
│   └── setup_real_auth.js    # Seeds jury panels and accounts
└── src/                      # Frontend Application Source Code
    ├── main.tsx              # React DOM initialization & entry point
    ├── App.tsx               # Main UI, routing, views, modal consoles
    ├── index.css             # Tailwind base layers and custom CSS utilities
    ├── types/                # TypeScript interfaces (Team, Jury, Evaluation, etc.)
    │   └── index.ts
    ├── lib/                  # Supabase client singleton initialization
    │   └── supabaseClient.ts
    └── services/             # API data access layer
        └── competitionService.ts
```

---

## 8. Real-time Synchronization Mechanics

EvalPro utilizes Supabase's Realtime protocol (backed by PostgreSQL Write-Ahead Log replication):

1. When the client loads [App.tsx](file:///e:/prompthon_final_dashboard/src/App.tsx), it registers a real-time subscription on:
   - `public.evaluations`
   - `public.teams`
   - `public.app_settings`
2. Whenever any judge clicks **"Submit Marks"**:
   - An `INSERT` or `UPDATE` payload is written to PostgreSQL.
   - Supabase Realtime pushes a change notification over WebSockets to all connected clients.
   - The React state automatically updates and recalculates ranks **without requiring page refreshes**.

---

## 9. Configuration & Environment Variables

Create or maintain your [.env](file:///e:/prompthon_final_dashboard/.env) with the following structure:

```env
# Supabase Database Direct & Connection Pool Settings
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
SUPABASE_URL="https://[PROJECT-ID].supabase.co"
SUPABASE_DB_HOST="db.[PROJECT-ID].supabase.co"
SUPABASE_DB_PORT="5432"
SUPABASE_DB_NAME="postgres"
SUPABASE_DB_USER="postgres"
SUPABASE_DB_PASSWORD="[PASSWORD]"

# Vite Public Environment Variables (Exposed to Browser)
VITE_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
VITE_SUPABASE_ANON_KEY="[ANON-PUBLIC-KEY]"

# Cloudflare Deployment Credentials
CLOUDFLARE_ACCOUNT_ID="[CLOUDFLARE-ACCOUNT-ID]"
CLOUDFLARE_API_TOKEN="[CLOUDFLARE-API-TOKEN]"
```

---

## 10. Local Development, Build & Deployment

### 1. Run Development Server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:3000` with instant Hot Module Replacement (HMR).

### 2. Type Check & Production Build
```bash
npm run build
```
Executes `tsc` (TypeScript compiler) and `vite build`, bundling static assets into `dist/`.

### 3. Deploy to Cloudflare Pages
```bash
npm run deploy
```
Builds the latest distribution and deploys to Cloudflare Pages using Wrangler.

---

## 🏁 Summary Checklist
- [x] **Database Configured**: Supabase schema and tables active.
- [x] **Realtime Connected**: Instant WebSocket updates enabled.
- [x] **Python Environment Configured**: Python 3.12 + `psycopg2` ready for script automation.
- [x] **Production Verified**: `npm run build` generates clean output.
