# Naming Conventions: MoveAround TMS

## Internal/System Layer

- Use `organization`, `organizationId`, `orgCode` for all backend, compliance, Fast Scan, and audit logic.
- Never expose `organization` in URLs or client-facing UI.

## UI/Routing/Branding Layer

- Use `company`, `companyId`, `/company/[company]` for all Next.js routes, dashboards, and client-facing features.
- Never use `[org]` or `organization` in the App Router or URLs.

## Folder/Route Rules

- Only one dynamic segment per route level (e.g., `/company/[company]`)
- Never mix `[org]`, `[company]`, `[slug]` at the same level
- Remove all `[org]` folders from app/

## Refactor Policy

- Do not rename internal logic until APIs/schemas are frozen
- Only refactor for public API, investor, or compliance needs
- Document all changes in DOMAIN_MAP.md

## Example

- Good: `/company/[company]/dashboard`
- Bad: `/company/[org]/dashboard` or `/company/[slug]/dashboard`

## Enforcement

- Add this file to code review checklist
- Reference in onboarding docs for new devs
