# SparkyEstimate - AI-Powered Electrical Estimating Web App

## What This Is
Professional electrical estimating web application for Canadian residential contractors.
Features AI-powered drawing analysis (Gemini), CEC 2021 compliance, customer/invoice workflow,
per-employee labor rates, company logo on PDFs, and electric blue + amber "Sparky" branding.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Express.js 5 (TypeScript, ESM)
- **Database**: PostgreSQL 16 + Drizzle ORM
- **AI**: Google Gemini API (`@google/genai`) for floor plan / electrical drawing analysis
- **PDF**: jsPDF + jspdf-autotable for client estimates, material lists, CEC reports, invoices
- **Routing**: wouter (client), Express (server)
- **State**: TanStack Query (React Query) — NO Redux, NO Zustand
- **Validation**: Zod schemas (shared between client and server via drizzle-zod)

## Project Structure
```
sparkyestimate/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Router + layout (sidebar + main)
│   │   ├── components/       # shadcn/ui + custom components
│   │   │   ├── ui/           # shadcn/ui primitives (DO NOT modify)
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/            # Route pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── projects.tsx / project-detail.tsx
│   │   │   ├── estimates.tsx / estimate-detail.tsx
│   │   │   ├── invoices.tsx / invoice-detail.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── employees.tsx
│   │   │   ├── ai-analysis.tsx
│   │   │   └── settings-page.tsx
│   │   ├── hooks/            # Custom React hooks (useQuery wrappers)
│   │   ├── lib/              # Utilities (queryClient, utils)
│   │   └── index.css         # Tailwind + CSS variables
│   └── index.html
├── server/                    # Express backend
│   ├── index.ts              # Server entry point (port 5000)
│   ├── routes.ts             # ALL API endpoints + Zod validation
│   ├── storage.ts            # IStorage interface + DatabaseStorage class
│   ├── db.ts                 # Drizzle + pg pool setup
│   ├── seed.ts               # Seeds device assemblies, wire types, service bundles, sample projects
│   ├── vite.ts               # Vite dev middleware
│   ├── static.ts             # Production static file serving
│   └── cec-devices.ts        # CEC compliance device data
├── shared/
│   └── schema.ts             # ALL Drizzle table definitions + Zod insert schemas + types
├── attached_assets/          # Reference docs and images from design phase
├── drizzle.config.ts         # Drizzle Kit config (PostgreSQL)
├── vite.config.ts            # Vite config with path aliases
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Database Schema (16 tables in shared/schema.ts)
- `customers` — Client database (name, email, phone, address, province)
- `employees` — Labor rate management (role, hourlyRate, isActive)
- `projects` — Jobs (clientName, address, dwellingType, status)
- `estimates` — Quotes per project (overheadPct, profitPct, laborRate)
- `estimate_items` — Line items (deviceType, room, quantity, materialCost, laborHours, wireType)
- `invoices` — Billing (invoiceNumber, status, subtotal, taxRate, taxAmount, total)
- `invoice_items` — Invoice line items (description, quantity, unitPrice)
- `device_assemblies` — Device catalog (29 defaults, category, box/cover/wire/labor/cost)
- `ai_analyses` — Gemini analysis results (fileName, analysisMode, results JSONB)
- `settings` — Key/value app settings
- `wire_types` — Wire catalog with costPerFoot
- `service_bundles` — Bundled services (items JSONB, materialCost, laborHours)
- `panel_circuits` — Panel schedule circuits (circuitNumber, amps, poles, GFCI/AFCI)
- `estimate_services` — Services attached to estimates
- `compliance_documents` — CEC document uploads
- `supplier_imports` — Supplier price list imports

## Key Constants (shared/schema.ts)
- `PROJECT_STATUSES`: draft, in_progress, bid_sent, won, lost
- `INVOICE_STATUSES`: draft, sent, paid, overdue
- `DWELLING_TYPES`: single, duplex, triplex, fourplex
- `DEVICE_CATEGORIES`: receptacles, switches, lighting, safety, data_comm, specialty, service
- `EMPLOYEE_ROLES`: owner, journeyman, apprentice, helper

## API Pattern
All routes in `server/routes.ts`. Pattern:
- REST: GET/POST collection, GET/PATCH/DELETE individual
- Validation: Zod schemas from shared/schema.ts
- Storage: `storage.*` methods (DatabaseStorage class in storage.ts)
- File uploads: multer (100MB limit for AI analysis)

## Frontend Patterns
- **Routing**: wouter `<Route path="/path" component={Page} />`
- **Data fetching**: TanStack Query `useQuery` / `useMutation` with `apiRequest()` helper
- **UI components**: shadcn/ui (in `client/src/components/ui/`) — DO NOT edit these directly
- **Path aliases**: `@/` = client/src, `@shared/` = shared/, `@assets/` = attached_assets/
- **Theme**: CSS variables in index.css, ThemeProvider for dark/light mode
- **Branding**: Electric blue primary (217 91% 40%), amber accent (37 92% 50%)

## Design Conventions
- Electric blue (#1565C0 area) + amber (#F59E0B area) "Sparky" branding
- Housecall Pro-inspired but better — clean, professional, spacious
- Inline editing with `defaultValue` + `key` + `onBlur` pattern
- Colored status badges for project/invoice statuses
- Tabs pattern for detail pages (estimate has 5 tabs, settings has 7 tabs)
- Sidebar navigation with icon + label

## Rules for AI Assistants
1. **Read before edit** — Always read a file before modifying it
2. **Follow existing patterns** — Match the code style, naming, and architecture already in use
3. **Schema is source of truth** — All data types come from `shared/schema.ts`
4. **Don't modify shadcn/ui** — Files in `client/src/components/ui/` are generated; don't edit
5. **Use storage interface** — All DB operations go through `storage.*` in storage.ts, not raw SQL
6. **Validate with Zod** — Use insert schemas from shared/schema.ts for API input validation
7. **Canadian context** — CEC 2021 code, GST/PST/HST, provinces not states, postal codes not zip codes
8. **No new state libraries** — Use TanStack Query for server state, React state for UI state
9. **Keep routes.ts as single file** — All API endpoints live in routes.ts (don't split into modules yet)
10. **Seed data is idempotent** — seed.ts checks for existing data before inserting

## Running Locally
```bash
# Prerequisites: PostgreSQL 16 running, database "sparkyestimate" created
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
npm run dev        # Starts Express + Vite on http://localhost:3000
npm run db:push    # Push schema changes to database
npm run build      # Production build
npm run check      # TypeScript type checking
```

## Environment Variables (.env)
- `DATABASE_URL` — PostgreSQL connection string (required)
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key (required for AI analysis)
- `SESSION_SECRET` — Express session secret
