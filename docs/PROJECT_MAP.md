# SparkyEstimate — Project Map (plain English)

A guide to where everything lives, written for a non-coder. You don't need to edit
these files yourself; this is so you know what's what and can point an engineer (or me)
straight to the right place.

## The two halves of the app

- **`client/`** = the website you SEE and click (the front end).
- **`server/`** = the engine behind it that does the work and talks to the database (the back end).
- **`shared/`** = a few things both halves need to agree on (mainly the database shape).

Everything else in the top folder is configuration, dependencies, or docs.

## "I want to change X" — quick reference

| You want to change... | Go to this file |
|---|---|
| What electrical devices each room gets (CEC rules) | `server/cec-devices.ts` |
| Wire sizing, circuit, and demand-load rules | `server/cec-rules.ts` |
| The AI floor-plan analysis (prompts, model, behavior) | `server/routes.ts` (search "ai-analyze") |
| Login, passwords, who's allowed in | `server/auth.ts` |
| Any button/screen that loads or saves data (the API) | `server/routes.ts` |
| The database tables and fields | `shared/schema.ts` |
| A specific screen the user sees | `client/src/pages/` (one file per screen) |
| Reusable UI pieces (sidebar, tabs, etc.) | `client/src/components/` |
| Secrets and config (keys, passwords, DB) | `.env` (never share this file) |
| Starting/sample data loaded into a fresh database | `server/seed.ts` |

## server/ — the engine (each file, in plain English)

- **`index.ts`** — starts the server. The "on switch."
- **`routes.ts`** — the switchboard. Every action the app can do (load projects, save an
  estimate, run the AI, log in) is an endpoint defined here. It's the biggest file.
- **`auth.ts`** — security. Login, logout, passwords (hashed), and who can access what
  (admins vs. estimators vs. employees).
- **`crypto.ts`** — locks up sensitive secrets (like the Google Drive secret) so they're
  encrypted in the database, not stored in plain text.
- **`storage.ts`** — the only place that reads from and writes to the database. Everything
  goes through here.
- **`db.ts`** — the database connection itself.
- **`seed.ts`** — loads the starter data (device assemblies, permit fee tables, etc.) into a
  fresh database. Safe to re-run; it skips data that already exists.
- **`cec-devices.ts`** — the electrical brain. For each room type, decides what devices the
  estimate needs, per Canadian Electrical Code. Quantities are calibrated from real BC jobs.
- **`cec-rules.ts`** — the code tables: wire sizes, circuit rules, service demand-load math.
- **`google-drive.ts`** — stores inspection photos in the customer's Google Drive.
- **`r2.ts`** — stores inspection photos in Cloudflare R2 (the default).
- **`static.ts` / `vite.ts`** — plumbing that serves the website. You won't touch these.

## client/ — the website (what users see)

- **`client/src/pages/`** — one file per screen. Names match what you see:
  `dashboard`, `projects`, `estimates`, `invoices`, `customers`, `employees`,
  `settings-page`, `login`, `employee-portal`, `ai-analysis`.
- **`client/src/components/`** — reusable building blocks used across screens, e.g.
  `app-sidebar` (the left menu) and `user-accounts-tab` (the User Accounts settings).
- **`client/src/components/ui/`** — generic buttons, inputs, cards, etc. Don't edit these by
  hand; they're generated.
- **`client/src/lib/` and `hooks/`** — small helpers (how the front end talks to the server,
  reusable logic). Background plumbing.

## shared/

- **`schema.ts`** — the single source of truth for the database: every table (users,
  projects, estimates, invoices, employees, device assemblies, permit fee schedules, etc.)
  and its fields. Both the engine and the website read from this so they always agree.

## Top-level files (config + docs — rarely touched)

- **`.env`** — your secrets and settings (database, API keys, admin login). Private. Never
  commit or share it.
- **`package.json`** — the list of tools the app depends on, plus the commands to run it.
- **`CHANGELOG.md`** — a running history of what changed and when.
- **`CLAUDE.md`** — instructions and architecture notes for AI assistants working on this code.
- **`PROJECT_MAP.md`** — this file.
- **`drizzle.config.ts`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`,
  `postcss.config.js`, `components.json`** — build and tooling configuration. Leave alone
  unless an engineer tells you otherwise.
- **`uploads/`** — files uploaded through the app (e.g. analyzed PDFs).
- **`dist/`, `node_modules/`** — generated/installed; never edited by hand, never committed.

## How to run it (for reference)

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"   # so the database tools are found
npm run dev                                               # starts the app at http://localhost:3000
```

## A note on file names

The file names are already organized by what they do (`auth`, `routes`, `cec-devices`).
They can't be freely renamed because the files reference each other by name, so renaming
one means updating every place that points to it. This map is the safe way to navigate
without that risk.
