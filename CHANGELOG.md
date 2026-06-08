# Changelog

## 2026-06-08 — Security hardening + billing single-source-of-truth

### Security
- **Employee PIN sessions are now privilege-separated.** A PIN-portal session (field worker) previously reached almost every non-admin API — financials, customer PII, coworker pay rates, and destructive deletes. A deny-by-default middleware now limits PIN sessions to the 7 field-portal endpoints they actually use; everything else requires an office account (`requireOfficeUser`). Verified: PIN session gets 403 on financials/customers/invoice-delete/settings, 200 on the portal's project list.
- **Employee PINs are bcrypt-hashed.** They were stored + compared in plaintext. New PINs hash on create/update; existing plaintext PINs upgrade to a hash on first successful login (`verifyPin`/`hashPin`). `/api/employee-login` + `/api/employee-auth` are now rate-limited (10/15min) — brute-force returns 429.
- **AI (Gemini) endpoints rate-limited** (30/hr) so a logged-in user can't run up unbounded API cost.
- **`POST /api/settings` and `PATCH /api/permit-fee-schedules/:id` now require admin** (an estimator could previously zero the GST rate or edit the active fee table).
- **Money inputs validated** — `convert-to-invoice` and `addon-invoice` reject negative / NaN / Infinity / non-numeric line amounts (400); money/rate columns in `shared/schema.ts` are constrained to finite & non-negative.
- **Secrets/crypto/config** — `SESSION_SECRET` hard-fails at startup in production (was a public dev default); credential encryption can use a separate `CREDENTIAL_ENCRYPTION_KEY`; 5xx errors no longer leak internals in production; multer now has a type allow-list + 40MB cap (was 100MB, any type); `xlsx` moved to the patched SheetJS CDN build (CVE-2023-30533 / CVE-2024-22363); added `.env.example` + `render.yaml` secret provisioning.

### Billing
- **One source of truth for the estimate total** — `shared/billing.ts`. The customer-facing math was copy-pasted in 4 places (estimate screen, PDF/export, convert-to-invoice, financials hub) and had drifted: the server used wire `costPerFoot` while the screen used `costPerMeter`, and the server dropped the permit handling fee. All sites now call one function. Verified: screen, financials hub, and export summary all report **$31,144.42** incl. tax for the Guse estimate.

### Note
- These changes required `npm install` (xlsx CDN). Because the repo lives in iCloud Drive, that triggered an iCloud re-sync of `node_modules`, which stalled the first server boot while iCloud re-downloaded the ~1,800-file `googleapis` package. Resolved by materializing the files; boot is back to ~13s. Long-term, keeping `node_modules` out of iCloud sync avoids this.

## 2026-06-05 (batch 3) — Progressive / milestone billing

### Added
- **GST now shows on the estimate.** The Estimate Summary (screen) and PDF both show `Grand Total (before tax)` → `GST 5%` → `Total incl. tax`, so the estimate matches what the invoice charges — no 5% surprise. (Guse: $29,661.35 → $1,483.07 GST → $31,144.42.)
- **Split / progressive invoicing.** A project's estimate can be billed in pieces, each its own independently-sent/paid invoice:
  - **By phase** — `singlePhase: "service" | "roughin" | "finish"` on `POST /api/estimates/:id/convert-to-invoice` bills just that phase's items + labour (with tax), and tags `invoice.phase` so the hub tracks it.
  - **Custom amount / %** — a deposit or progress payment via `customItems` (e.g. "20% service deposit").
- **Add-on invoices.** `POST /api/projects/:id/addon-invoice` bills extra mid-project work as its own invoice with `estimateId = null`, so it never counts against the estimate's billed/remaining.
- **Project billing hub** (Financials tab). Per estimate: contract total (incl. tax), a billed-vs-remaining progress bar (Billed / Paid / Remaining), and **New Invoice** (phase or custom %/$) + **Add-on Invoice** buttons. Lists every project invoice with type (phase / estimate / add-on) and status. `GET /api/projects/:id/financials` now returns `estimateBreakdown`, `addOnTotal`, `addOnCount`.
- **Receipt reachable from the invoice list.** Paid rows get a **Receipt** action (opens the invoice where Generate/Download Receipt live), and the "mark paid" toast points there. (Receipt is still download-only; emailing needs a Resend key.)

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
