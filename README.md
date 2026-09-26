# EvalPro - Neo-Brutalist Mark Scoring Portal

An official, tamper-proof hackathon and competition evaluation portal connected to **Supabase PostgreSQL** with live Realtime synchronization.

---

## ⚡ Features
- **Public Leaderboard**:
  - Displays official standings: Rank, Team Name & Members, Round 1 Mark, Round 2 Mark, and Cumulative Final Score.
  - **Strict Anonymity**: No jury names or jury counts are displayed on the public dashboard — only teams and their marks.
  - Dynamic search filter (instant query by team name or student member).
  - Round selectors: Cumulative, Round 1, Round 2.
- **Jury Scoring Console**:
  - Dedicated login for authenticated evaluators.
  - Multi-criteria scoring sliders: Innovation (0-25), Tech (0-25), Feasibility (0-25), Presentation (0-25).
  - Automatic mark locking once submitted for the active round.
- **Super Admin Dashboard**:
  - Full round sequencing controls: Activate Round 1, Activate Round 2, or Lock Round 1 to start Round 2.
  - Auto-generating jury accounts with secure passwords and instant "Copy Credentials" button.
  - CSV bulk team import (supports `.csv` upload or plain text paste).
  - Full override console: Edit individual scores or delete marks to allow fresh re-evaluation.
- **Supabase PostgreSQL & Realtime**:
  - Full database persistence across `teams`, `juries`, `evaluations`, and `app_settings`.
  - WebSocket Realtime broadcasts: Leaderboard updates live on presenter screens the second a judge submits marks.

---

## 🚀 Getting Started

### 1. Configure Supabase Anon Key in `.env`
Open `.env` and paste your Supabase project **Anon Key** (found in your Supabase Dashboard under `Project Settings -> API`):

```env
VITE_SUPABASE_URL="https://rfzoryifrccrgzdectca.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
```

---

## 🔐 Credentials & Default Logins

| Role | Username / Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `ravitejaraviteja900@gmail.com` | `prompthon_final_dashboard` | Full dashboard override, leaderboard toggle & round control |
| **Jury Panel 01** | `jury1@evalpro.org` | `Jury#9412!X` | Evaluation console for Round 1 & Round 2 |
| **Jury Panel 02** | `jury2@evalpro.org` | `Jury#8831!K` | Evaluation console for Round 1 & Round 2 |
| **Jury Panel 03** | `jury3@evalpro.org` | `Jury#7124!M` | Evaluation console for Round 1 & Round 2 |

*(Additional juries can be generated at any time inside the Super Admin Dashboard with auto-passwords).*
