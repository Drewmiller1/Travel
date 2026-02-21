# CLAUDE.md — Travel / Adventure Ledger

This file provides AI assistants with a complete map of the codebase, conventions,
and workflows for the **Travel** project (internally branded "The Adventure Ledger").

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Development Workflow](#development-workflow)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [Architecture & Key Patterns](#architecture--key-patterns)
8. [Component Guide](#component-guide)
9. [Data Layer (api.js)](#data-layer-apijs)
10. [Authentication Flow](#authentication-flow)
11. [Styling Conventions](#styling-conventions)
12. [Known Gaps & Conventions to Follow](#known-gaps--conventions-to-follow)

---

## Project Overview

A **Kanban-style vacation planner** with a polished Indiana Jones adventure theme.
Users sign up, get auto-seeded sample trips, and manage vacation plans through four
stages: Dreams → Planning → Booked → Completed.

**Key capabilities:**
- Drag-and-drop reordering across columns
- Location system with 50+ presets (lat/lng)
- Tag & continent classification
- Star ratings for completed trips
- Demo mode (no account required)
- Mobile-responsive tab navigation
- Real-time sync status indicator (Saved / Saving / Error)
- Per-user editable board title and subtitle

---

## Tech Stack

| Layer       | Technology                        | Version  |
|-------------|-----------------------------------|----------|
| UI          | React                             | ^19.2.4  |
| Build       | Vite                              | ^7.3.1   |
| Backend     | Supabase (PostgreSQL + Auth)      | ^2.49.1  |
| Linting     | ESLint 9 + react-hooks plugin     | ^9.39.2  |
| Styling     | Inline styles + CSS variables     | —        |
| Testing     | **None** (not yet set up)         | —        |
| Deployment  | Vercel (documented in README)     | —        |

> There is **no backend server**. The React app calls the Supabase JS SDK directly.
> Row-Level Security (RLS) policies on the database enforce per-user data isolation.

---

## Repository Structure

```
Travel/
├── index.html                  # Vite HTML entry point
├── vite.config.js              # Vite config (uses @vitejs/plugin-react)
├── eslint.config.js            # ESLint flat config (ES2020, JSX)
├── package.json                # Scripts & deps
├── package-lock.json
├── .gitignore
├── README.md                   # Minimal Vite template README
├── CLAUDE.md                   # ← this file
├── public/                     # Static assets served as-is
└── src/
    ├── main.jsx                # React entry — mounts <App />
    ├── App.jsx                 # Root: auth state machine, routing
    ├── App.css                 # Mostly unused; prefer index.css vars
    ├── index.css               # Global CSS variables & keyframe animations
    ├── AuthScreen.jsx          # Login / sign-up screen
    ├── VacationPlanner.jsx     # Main board (919 lines, core app logic)
    ├── api.js                  # All Supabase CRUD operations
    ├── auth.js                 # Thin wrappers around supabase.auth.*
    ├── supabaseClient.js       # Supabase client singleton
    ├── supabase-setup.sql      # Full DB schema + RLS + auto-seed trigger
    ├── README.md               # Detailed setup/deployment instructions
    └── assets/
        ├── hero.png
        ├── react.svg
        └── vite.svg
```

---

## Development Workflow

### Install & Run

```bash
npm install
npm run dev          # Vite dev server (hot reload)
```

### Build & Preview

```bash
npm run build        # Output to dist/
npm run preview      # Serve built output locally
```

### Lint

```bash
npm run lint         # ESLint check across src/
```

There is **no test suite**. If you add tests, use **Vitest** (already compatible with
the Vite setup) and install `@testing-library/react`.

### Git Conventions

- Main production branch: `main` (remote)
- Local default: `master`
- Feature branches follow pattern: `claude/<description>-<id>`
- Commit messages are short, imperative, lowercase (e.g., `add demo mode`)
- No conventional-commits format enforced

### Database Changes

Edit `src/supabase-setup.sql`, then run the relevant SQL in the Supabase dashboard
SQL editor. Never drop and recreate tables in production — write additive `ALTER TABLE`
migrations instead. The README notes migration patterns for adding columns.

---

## Environment Variables

Create a `.env` file in the project root (never commit it):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both are required. The Supabase client (`src/supabaseClient.js`) warns to the console
if either is missing. Vite exposes only variables prefixed with `VITE_` to the browser.

---

## Database Schema

### `expeditions` table

| Column       | Type               | Notes                                      |
|--------------|--------------------|--------------------------------------------|
| `id`         | `UUID`             | PK, auto-generated                         |
| `user_id`    | `UUID`             | FK → `auth.users`, RLS enforced            |
| `status`     | `TEXT`             | `dreams` \| `planning` \| `booked` \| `completed` |
| `continent`  | `TEXT`             | `north_america` \| `south_america` \| `europe` \| `africa` \| `asia` \| `oceania` \| `antarctica` |
| `title`      | `TEXT`             | Required                                   |
| `description`| `TEXT`             | Optional                                   |
| `image`      | `TEXT`             | Emoji string, default `🗺️`                |
| `budget`     | `TEXT`             | Free-form, e.g. `"$2,500"`               |
| `dates`      | `TEXT`             | Free-form, e.g. `"Oct 2026"`             |
| `tags`       | `TEXT[]`           | Array, e.g. `["adventure","ruins"]`       |
| `rating`     | `INTEGER`          | 1–5, only meaningful for `completed`       |
| `sort_order` | `INTEGER`          | Position within a column                   |
| `latitude`   | `DOUBLE PRECISION` | From location preset or manual input       |
| `longitude`  | `DOUBLE PRECISION` | From location preset or manual input       |
| `created_at` | `TIMESTAMPTZ`      | Auto-set                                   |

**Important naming quirk:** The app uses the property name `column` for what the
database stores as `status`. This is because `column` is a reserved word in PostgreSQL.
The mapping functions `rowToCard()` and `cardToRow()` in `api.js` handle the translation.

### `user_settings` table

| Column           | Type          | Notes                                   |
|------------------|---------------|-----------------------------------------|
| `user_id`        | `UUID`        | PK + FK → `auth.users`                 |
| `board_title`    | `TEXT`        | Default: `"THE ADVENTURE LEDGER"`      |
| `board_subtitle` | `TEXT`        | Default: `"Fortune & Glory Vacation Planner"` |
| `updated_at`     | `TIMESTAMPTZ` | Auto-updated                            |

### Row-Level Security

All tables have RLS enabled. Every query is automatically scoped to
`auth.uid() = user_id`. You do not need to filter by user in `api.js` — RLS
handles it. Adding a new table? Always enable RLS and add the four standard
policies (SELECT / INSERT / UPDATE / DELETE) from `supabase-setup.sql`.

### Auto-Seed Trigger

A PostgreSQL trigger fires on every new user signup and inserts:
- A default `user_settings` row
- 8 sample expeditions (Petra, Machu Picchu, Iceland, Rome, Kyoto, Serengeti,
  Great Barrier Reef, Grand Canyon)

The trigger is defined at the bottom of `src/supabase-setup.sql`.

---

## Architecture & Key Patterns

### Component Tree

```
App.jsx                          ← auth gate, global session state
├── AuthScreen.jsx               ← shown when no session / no demo mode
└── VacationPlanner.jsx          ← main app (shown when authenticated)
```

### State Management

React local state only (`useState`, `useEffect`, `useCallback`, `useRef`).
No Redux, Zustand, or Context API. State lives in:

- `App.jsx` — `user`, `session`, `demoMode`
- `VacationPlanner.jsx` — `cards`, `userSettings`, UI state (modal, drag, filter…)

### Optimistic UI

User actions (create, delete, reorder) update local state immediately, then
sync to Supabase asynchronously. On Supabase error, a save-status indicator
shows "Error" but does **not** auto-revert the local state. Keep this pattern
when adding new mutations.

### Debouncing

Reorder operations and board-title saves use an 800 ms debounce to avoid
hammering the database during rapid drag interactions. Use `useRef` to store
the timeout id (see existing pattern in `VacationPlanner.jsx`).

### Demo Mode

When `demoMode` is `true` (set in `App.jsx`), `VacationPlanner` receives
`user={null}` and skips all Supabase calls. State is ephemeral — it is lost on
refresh. Demo data is hard-coded in `VacationPlanner.jsx` as `DEMO_CARDS`.

### Mobile Responsiveness

- Breakpoint: **768 px** (via the `useIsMobile(768)` custom hook)
- Mobile: single-column view with tab bar to switch between the four columns
- Desktop: horizontal multi-column Kanban

When adding UI, always test both layouts. The `isMobile` boolean is available
throughout `VacationPlanner.jsx`.

### Drag & Drop

Uses the native **HTML5 Drag API** (no third-party library). Key event handlers:
`onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`. After a drop, `bulkUpdateOrder()`
in `api.js` is called (debounced) to persist the new `sort_order` values.

---

## Component Guide

### `App.jsx`

- Manages `user`, `session`, `demoMode` state
- Subscribes to `supabase.auth.onAuthStateChange` in a `useEffect`
- Renders a full-screen loading spinner while the initial session check is pending
- Passes `onLogout` and `onDemoMode` callbacks down to children

### `AuthScreen.jsx` (~240 lines)

- `mode` state toggles between `"login"` and `"signup"`
- After successful signup, shows an email-confirmation screen
- Email/password form validation: password ≥ 6 chars, passwords must match on signup
- No external form library; plain controlled inputs

### `VacationPlanner.jsx` (~919 lines)

Large single-file component. Key sections (by approximate line range):

| Lines    | Content                                         |
|----------|-------------------------------------------------|
| 1–60     | Imports, constants (`COLUMNS`, `CONTINENTS`, `LOCATION_PRESETS`, `DEMO_CARDS`) |
| 60–130   | `getTagColor()`, `rowToCard()`, `cardToRow()`, `useIsMobile()` |
| 130–250  | Component declaration, all `useState` / `useRef` hooks |
| 250–420  | `useEffect` hooks (data load, settings load, keyboard handlers) |
| 420–600  | Event handlers (drag, modal open/close, save, delete, reorder) |
| 600–919  | JSX render (header, filter bar, Kanban columns, modals)  |

> When modifying this file, keep related logic together. Avoid splitting into
> sub-files unless the component clearly exceeds maintainability limits.

### `api.js` (~170 lines)

Pure data functions. No React. Each function is `async` and returns
`{ data, error }` (Supabase convention). Always check `error` before using `data`.

| Function             | Description                                    |
|----------------------|------------------------------------------------|
| `fetchExpeditions()` | SELECT all user's expeditions, ordered by `sort_order`, then `created_at` |
| `createExpedition(card)` | INSERT one expedition                      |
| `updateExpedition(id, updates)` | UPDATE by id                      |
| `deleteExpedition(id)` | DELETE by id                               |
| `bulkUpdateOrder(updates)` | UPSERT array of `{id, sort_order}` rows  |
| `fetchUserSettings()` | SELECT user_settings row for current user   |
| `updateUserSettings(settings)` | UPSERT user_settings               |

### `auth.js` (~52 lines)

Thin wrappers — do not add business logic here. Each function simply delegates
to the Supabase auth API and returns the raw result.

### `supabaseClient.js` (~12 lines)

Exports a single `supabase` client instance. Import it as:

```js
import { supabase } from "./supabaseClient";
```

Do not create multiple client instances.

---

## Data Layer (api.js)

### Column ↔ Status mapping

```js
// Database row → app card
function rowToCard(row) {
  return { ...row, column: row.status };
}

// App card → database row
function cardToRow(card) {
  const { column, ...rest } = card;
  return { ...rest, status: column };
}
```

Always run card objects through these mappers at the api.js boundary. Never
pass raw card objects directly to Supabase insert/update calls.

### Adding a new field

1. Add the column to `supabase-setup.sql` (`ALTER TABLE` for existing DBs)
2. Add the column to the auto-seed trigger if it needs a default
3. Update `rowToCard()` / `cardToRow()` if the field needs transformation
4. Update the modal form in `VacationPlanner.jsx`
5. Update `createExpedition` and `updateExpedition` calls

---

## Authentication Flow

```
App mounts
  └─ getSession()
       ├─ Session found → set user → show VacationPlanner
       └─ No session
            ├─ Demo mode enabled → show VacationPlanner (no user)
            └─ Not demo → show AuthScreen
                  ├─ Login → signIn() → onAuthStateChange fires → set user
                  └─ Signup → signUp() → show email-confirm screen
                                           (user clicks link → onAuthStateChange fires)

Logout → signOut() → onAuthStateChange fires → clear user → show AuthScreen
```

`onAuthStateChange` in `App.jsx` is the single source of truth for session
updates. Do not manually set `user` state outside of this listener.

---

## Styling Conventions

### CSS Variables (index.css)

Global theme tokens are defined in `:root`:

```css
--primary-gold: #d4a017;
--accent-red: #8b1a1a;
--parchment: #f5e6c8;
--dark-leather: #2c1810;
/* … see index.css for full list */
```

Use these variables in inline styles with `var(--token-name)` when possible.

### Inline Styles

The project uses **inline style objects** throughout (not CSS classes). This is
the established pattern — follow it for new UI rather than adding CSS files.
Use `camelCase` property names.

```jsx
// Good
<div style={{ backgroundColor: "var(--parchment)", borderRadius: 8 }}>

// Avoid introducing new .css class selectors for component-level styles
```

### Keyframe Animations

Defined in `index.css`: `slideIn`, `float`, `fadeIn`, `pulseBar`. Reference them
via `animation` in inline styles:

```jsx
style={{ animation: "slideIn 0.3s ease" }}
```

### Emoji as Icons

The project uses emoji extensively (🗺️ 🏔️ ✈️ 🌍 etc.) as visual icons.
Do not introduce an icon library. Continue using emoji for new icons.

---

## Known Gaps & Conventions to Follow

### No Tests

There is no test suite. When adding tests:
- Use **Vitest** (zero-config with Vite) + `@testing-library/react`
- Place test files adjacent to source as `*.test.jsx`
- Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
- Add `"test": "vitest"` to `package.json` scripts

### No CI/CD

No GitHub Actions workflows exist. If adding CI, a minimal workflow should run:
```
npm ci && npm run lint && npm run build
```

### No TypeScript

The project is plain JavaScript/JSX. Do not introduce `.ts`/`.tsx` files unless
the entire project is migrated. Keep new files as `.jsx` or `.js`.

### Direct Supabase Dependency

There is no API abstraction layer between the app and Supabase. All data logic
lives in `api.js`. If migrating to a different backend, only `api.js` and
`auth.js` need to change — keep this separation intact.

### Large VacationPlanner.jsx

At ~919 lines, this file is large but intentionally kept together for now.
Avoid splitting it unless a logical sub-component clearly emerges (e.g., a
standalone `CardModal` component). If you do extract sub-components, create
them in `src/` alongside the existing files.

### No Error Boundary

There is no React Error Boundary. For production robustness, consider adding
one around `VacationPlanner`.

### Reserved Word Gotcha

`column` is a reserved PostgreSQL identifier. The database field is named
`status`. Always use the `rowToCard` / `cardToRow` mappers — never bypass them.
