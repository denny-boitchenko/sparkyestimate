# SparkyEstimate - Electrical Estimating App

## Overview
Professional electrical estimating web application for Canadian residential contractors. Features AI-powered drawing analysis using Gemini API, CEC 2021 compliance, and a clean modern design with electric blue and amber branding.

## Recent Changes
- 2026-02-13: Major feature expansion - added tabbed Settings (General/Materials/Wire/Services), tabbed Estimate Detail (Line Items/Panel Schedule/CEC Compliance/Services), project list/grid view toggle
- 2026-02-13: Added wire_types, service_bundles, panel_circuits, estimate_services, compliance_documents tables
- 2026-02-13: Auto-generate panel schedules from line items, CEC compliance checks, service bundles management
- 2026-02-12: Initial build - complete full-stack application with all pages, API routes, database schema, and Gemini AI integration
- 2026-02-12: Added Zod validation to all backend routes
- 2026-02-12: Fixed dashboard KPI calculation (totalEstimates)

## Project Architecture
- **Frontend**: React + Vite, shadcn/ui, TanStack Query, wouter routing
- **Backend**: Express.js with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google Gemini API for drawing analysis
- **Theme**: Electric blue (217 91% 40%) primary, amber (37 92% 50%) accent

### Key Files
- `shared/schema.ts` - Data models (projects, estimates, estimate_items, device_assemblies, ai_analyses, settings, wire_types, service_bundles, panel_circuits, estimate_services, compliance_documents)
- `server/routes.ts` - All API endpoints with Zod validation
- `server/storage.ts` - Database CRUD operations
- `server/seed.ts` - Seeds 30 device assemblies, 13 wire types, 8 service bundles, and 4 sample projects
- `client/src/App.tsx` - Router with sidebar layout
- `client/src/pages/` - Dashboard, Projects, Estimates, EstimateDetail, AI Analysis, Settings
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

### Pages
- `/` - Dashboard with project stats and recent activity
- `/projects` - Project list with create/filter/search, grid/list view toggle
- `/projects/:id` - Project detail with estimates
- `/estimates` - All estimates list
- `/estimates/:id` - Estimate detail with 4 tabs: Line Items, Panel Schedule, CEC Compliance, Services
- `/ai-analysis` - AI drawing upload and analysis
- `/settings` - 4 tabs: General (rates/markups/company), Materials (device assemblies), Wire Types, Services (bundles)

### API Routes
- `GET/POST /api/projects` - Projects CRUD
- `GET/PATCH/DELETE /api/projects/:id`
- `GET/POST /api/estimates` - Estimates CRUD
- `GET/PATCH/DELETE /api/estimates/:id`
- `GET /api/estimates/:id/items` - Estimate line items
- `POST /api/estimate-items` - Create line item
- `PATCH/DELETE /api/estimate-items/:id`
- `GET/POST /api/device-assemblies` - Device catalog CRUD
- `PATCH/DELETE /api/device-assemblies/:id`
- `GET/POST /api/wire-types` - Wire types CRUD
- `PATCH/DELETE /api/wire-types/:id`
- `GET/POST /api/service-bundles` - Service bundles CRUD
- `PATCH/DELETE /api/service-bundles/:id`
- `GET /api/estimates/:id/panel-circuits` - Panel circuits
- `POST /api/panel-circuits` - Create circuit
- `PATCH/DELETE /api/panel-circuits/:id`
- `POST /api/estimates/:id/generate-panel` - Auto-generate panel schedule
- `GET /api/estimates/:id/services` - Estimate services
- `POST /api/estimate-services` - Add service to estimate
- `DELETE /api/estimate-services/:id`
- `POST /api/estimates/:id/compliance-check` - Run CEC compliance check
- `GET /api/ai-analyses` - Analysis history
- `POST /api/ai-analyze` - Upload and analyze drawing (multipart, 100MB limit)
- `GET/POST /api/settings` - App settings

## User Preferences
- Design: Housecall Pro-inspired but better
- Canadian market focus (CEC 2021 compliance)
- Electric blue and amber "Sparky" branding
