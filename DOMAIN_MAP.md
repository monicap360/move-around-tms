# Domain Model Map: MoveAround TMS

## Key Entities

- **Organization**: Internal, system-level entity. Used for compliance, Fast Scan, audit, and multi-tenant logic. (e.g., `organizationId`, `orgCode`)
- **Company**: UI/routing/branding layer. Human-friendly, client-facing. (e.g., `/company/[company]`)
- **Carrier**: Entity representing a logistics provider or fleet operator. May map 1:1 or 1:many with Organization/Company.
- **Driver**: End user, associated with a Carrier/Company/Organization.

## Mapping Example

- `companyId` = `organizationId` (in most cases)
- Company is a view of an Organization
- Carrier may be a Company or Organization, depending on business logic

## Naming Conventions

- Use `organization` internally (system, DB, Fast Scan, compliance)
- Use `company` for all UI/routing/branding (Next.js routes, dashboards)
- Never mix `[org]` and `[company]` in the same route level

## Future-proofing

- Only refactor internal names when freezing APIs or schemas
- Use adapters/views for public APIs if needed
- Document all mappings for future devs and partners
