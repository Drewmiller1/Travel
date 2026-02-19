# 🏺 The Adventure Ledger

An Indiana Jones-themed vacation planner with a Trello-style kanban board and drag-and-drop reordering. Built with React + Supabase, deployable on Vercel.

---

## Quick Start

### 1. Create a Supabase Project (free)

1. Go to [supabase.com](https://supabase.com) and sign up / sign in
2. Click **New Project** → pick a name and password → create
3. Wait ~30 seconds for it to provision

### 2. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire contents of `supabase-setup.sql` from this project
4. Click **Run** — this creates the `expeditions` table, `user_settings` table, and seeds sample data

### 3. Get Your API Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy these two values:
   - **Project URL** → looks like `https://abcdefg.supabase.co`
   - **anon / public key** → the long `eyJ...` string

### 4. Set Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — you should see your board loaded from Supabase.

---

## Project Structure

```
adventure-ledger/
├── src/
│   ├── supabaseClient.js   # Supabase connection (reads env vars)
│   ├── auth.js              # Auth helpers (signIn, signUp, signOut, session)
│   ├── api.js               # All CRUD operations + user settings (user-scoped via RLS)
│   ├── AuthScreen.jsx       # Login / signup screen
│   ├── VacationPlanner.jsx  # Main board component
│   ├── App.jsx              # Root: manages auth state, routes to AuthScreen or Planner
│   └── main.jsx             # Vite entry point
├── supabase-setup.sql       # Database tables + auth + RLS + seed trigger (run once)
├── .env.example             # Template for env vars
└── package.json
```

---

## Deploying to Vercel

### From StackBlitz → GitHub → Vercel:

1. **StackBlitz**: Open the project, connect to GitHub, push to a new repo
2. **Vercel**: Go to [vercel.com](https://vercel.com), import your GitHub repo
3. **Environment Variables**: In Vercel project settings → Environment Variables, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. **Deploy** — Vercel auto-builds on push

---

## How It Works

| Feature | Implementation |
|---|---|
| **Auth** | Supabase Auth with email/password — login, signup, email confirmation |
| **Multi-user** | Row Level Security (RLS) — each user only sees their own expeditions |
| **Auto-seed** | New users get 8 sample cards + default settings via a Postgres trigger on signup |
| **Database** | Supabase PostgreSQL (free tier: 500MB, unlimited API calls) |
| **CRUD** | `api.js` wraps all Supabase operations with clean card ↔ row mapping |
| **Reordering** | Drag-and-drop updates `sort_order` column; debounced bulk save (800ms) |
| **Optimistic UI** | Cards appear instantly, Supabase syncs in background |
| **Save indicator** | Header shows ✓ Saved / ⟳ Saving / ✗ Error in real time |
| **Editable Title** | Board title and subtitle are customizable per user, stored in `user_settings` table |
| **Location Coordinates** | Each card supports latitude/longitude with a built-in location search |
| **Error handling** | Loading screen, connection error screen with retry, console warnings |

---

## Migration Notes

If you're upgrading from a previous version, run the new `supabase-setup.sql` in your SQL Editor. It will:
- Add `latitude` and `longitude` columns to `expeditions` (if missing)
- Create the `user_settings` table with RLS
- Update the seed trigger to include coordinates and default settings

---

## Dependencies

```bash
npm install @supabase/supabase-js
```

That's the only addition to a standard Vite + React project.
