# Company Route Scaffold

This folder contains the future-proof, client-facing company route for MoveAround TMS.

- Use `[company]` for all UI/routing/branding needs.
- Do **not** use `[org]` or `organization` in this layer.
- Internal logic, Fast Scan, and compliance should continue to use `organization`.

## Structure

- `/app/company/[company]/page.tsx` — Company dashboard entry point
- `/app/company/[company]/layout.tsx` — Layout for company routes

## Best Practices
- Keep this folder clean and isolated from internal system logic.
- Only add new routes/components here when ready for client-facing features.
- See project documentation for domain mapping and naming conventions.

## Guardrails

- ESLint rule blocks [org], [tenant], [slug] dynamic segments under app/
- Pre-commit hook fails if forbidden segments exist
- Never introduce new dynamic segments without review
