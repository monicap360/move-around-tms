# Ronyx Module Structure (SaaS TMS)

This document defines the **best-in-class** Ronyx module structure for a SaaS TMS. It is a **target architecture** to keep the product scalable, tenant-isolated, and deployable on `ronyx.movearoundtms.com`.

## Goals
- Single source of truth for Ronyx features
- Strict tenant isolation
- Scalable module layout (loads, finance, tracking, HR, materials, tickets)
- No PIT module
- Works with Next.js + Supabase + edge/serverless

## Target Structure

```
ronyx.movearoundtms.com/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── loads/
│   │   │   │   ├── finance/
│   │   │   │   ├── tracking/
│   │   │   │   ├── hr/
│   │   │   │   ├── materials/
│   │   │   │   └── tickets/
│   │   │   └── api/
│   │   │       └── ronyx/
│   │   │           ├── loads/
│   │   │           ├── finance/
│   │   │           └── tickets/
│   │   └── public/
│   │       ├── ronyx-logo.png
│   │       └── favicon.ico
│   └── mobile/
│       ├── src/
│       │   ├── screens/
│       │   └── lib/
│       └── app.json
├── packages/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── ronyx/
│   │   │   └── shared/
│   │   └── migrations/
│   │       └── ronyx/
│   ├── config/
│   │   ├── ronyx.config.ts
│   │   ├── features.ts
│   │   └── compliance.ts
│   └── utils/
│       ├── ronyx-validators.ts
│       ├── ronyx-calculators.ts
│       └── ronyx-formatters.ts
├── services/
│   ├── ticket-intelligence/
│   ├── payroll/
│   └── compliance/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── scripts/
└── docker-compose.ronyx.yml
```

## Current Repo Mapping (MoveAround TMS)
This repo already implements many pieces of the above structure:
- **Finance**: `app/(dashboard)/ronyx/financial` + `app/fleet/FleetView.tsx`
- **Loads / Dispatch**: `app/(dashboard)/ronyx/loads`, `app/(dashboard)/ronyx/dispatch/*`
- **Tracking**: `app/(dashboard)/ronyx/tracking` and `app/tracking`
- **Tickets**: `app/(dashboard)/ronyx/tickets`, API routes under `app/api/ronyx/*`
- **HR / Payroll**: `app/api/ronyx/payroll/*`, `app/api/payroll/*`
- **AI Validation**: `lib/ronyx/aiValidationEngine.ts` + API

## SaaS Best Decision (Applied)
We use **organization scoping** on all financial endpoints and modules to enforce strict tenant isolation:
- `/api/ronyx/financial/insights`
- `/api/ronyx/financial/costs`
- `/api/ronyx/financial/tabs`
- `/api/ronyx/invoices`
- `/api/analytics/performance`

## Next Steps (Optional)
1. Create `ronyx.config.ts` and `features.ts` for environment-based module toggles.
2. Move Ronyx-only routes under `app/(dashboard)/ronyx` for consistency.
3. Create a shared `/packages/utils` for Ronyx-specific calculators and validators.

If we decide to fully split into a monorepo, this doc becomes the implementation checklist.
