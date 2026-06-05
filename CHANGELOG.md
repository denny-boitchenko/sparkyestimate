# Changelog

## 2026-06-05 (batch 2)

### Fixed
- **Panel demand was hugely overstated.** Electric space heating was summed into the CEC 8-200 demand at 100% nameplate; now uses the code factor (first 10kW @100%, remainder @75%) in both `server/cec-rules.ts` and the client panel summary. A 4200 sqft home no longer false-flags as overloaded.
- **Estimate grand total ignored the Labour tab.** The total used raw item-hours × bill rate, so the job-type multiplier and the manual hours override did nothing. Unified the effective-hours logic across the screen, the PDF export, and invoice generation. Also fixed the PDF export omitting the permit fee.

### Added
- **Misc / Expenses line** on estimates (fuel, dump fees) — flows through screen + PDF + invoice (`estimates.misc_expenses`).
- **Editable service parts breakdown** — services now expand to an editable parts list (name / qty / $ each / hrs each, add/remove); service totals recompute from the parts; bundles copy their parts (`estimate_services.items`).
- **Per-photo notes** — note field on each photo (uses existing caption backend).
- **Customer invoices grouped by phase** — Service / Rough-In / Finish / General with subtotals on the customer page.
- **Multi-supplier pricing** — new `part_supplier_prices` table; supplier imports upsert by part+supplier (re-imports no longer overwrite other suppliers); effective price = preferred-or-cheapest, mirrored to `parts_catalog.unit_cost`. Admin endpoints under `/api/parts-catalog/:id/supplier-prices` and `/api/part-supplier-prices/:id/preferred`.

### Notes
- 6 of the 11 requested items already existed (assembly search, invoice payment method, Material/Labour Excel exports, estimate PDF color, customer invoices tab, photo caption backend).
- Receipt is download-only for now; emailing it needs a Resend API key.
- Remaining: per-part supplier-price management UI (backend done), optional PDF amber accent.

## 2026-06-05

### Fixed
- **AI floor-plan analysis returned 0 rooms (silently).** Three stacked bugs in `server/routes.ts`:
  - Model `gemini-2.0-flash` was retired by Google (404); errors were swallowed and the pipeline fell back to CEC-minimum "DWELLING EXTRAS" devices. Moved to `gemini-2.5-flash` via a single `GEMINI_MODEL` constant (env-overridable).
  - `gemini-2.5-flash` is a thinking model; the 8192 output budget was consumed by thinking, truncating the JSON. Added `thinkingConfig: { thinkingBudget: 0 }` to all Gemini calls (also ~4x faster).
  - Room dedup stored array indices in a Map then mutated the array with `splice()`, invalidating them and crashing on `undefined.devices`. Rewrote 4 dedup blocks to key by room name (no index mutation).

### Added
- **Authentication / login portal.** `server/auth.ts`: express-session + connect-pg-simple, bcrypt (12 rounds), `users` table, `requireAuth` (guards all `/api` except login + employee PIN) and `requireAdmin`. First-run admin seeded from `ADMIN_USERNAME`/`ADMIN_PASSWORD` (generates a random password if unset — no default credential). Client login page + auth gate + sign-out.
- **Settings → User Accounts tab.** Admin-only user CRUD (add/edit/role/activate/delete, with self- and last-admin guards) and employee PIN management.
- **HTTPS security hardening.** helmet headers (HSTS, X-Frame-Options, nosniff; CSP intentionally off for per-deploy tuning), express-rate-limit on login, session regeneration on login, 8-char min password, `secure` cookie + `trust proxy` in production.
- **Google Drive credentials via the UI.** Admin pastes Client ID + Secret in the Photos tab (no `.env` editing). Secret encrypted at rest (`server/crypto.ts`, AES-256-GCM). The UI shows the exact OAuth redirect URI to register and warns to publish the consent screen (Testing mode expires tokens after 7 days). Falls back to env vars.
- **Permit fee schedules: add / edit / activate / delete.** Admin-only create (copies the active schedule's rates), set-active (deactivates others), and delete (active schedule protected). Settings → Permits lists all schedules.

### Removed
- "CEC 2021 Compliant" label from the sidebar footer.

### Notes
- CEC code accuracy is a deterministic rules engine (`cec-devices.ts`, `cec-rules.ts`) with hardcoded clause citations and quantities calibrated from real BC projects. The LLM does room perception only; it does not reference a code book. Uploaded CEC documents are reference storage, not an AI input.
- `npm run check` (tsc) has pre-existing drizzle-zod type errors; the app runs via `tsx` regardless. Verify changes by running, not by tsc.
