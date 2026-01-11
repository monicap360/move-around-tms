# Accounting & Invoicing Module

## Overview
This module provides automated invoice generation, PDF downloads, and admin/customer UI for your TMS. It integrates with the Zelle-only payment flow and is ready for Supabase integration.

## Key Files
- `invoice.types.ts`: TypeScript types for invoices and line items
- `invoice.logic.ts`: Core logic for invoice creation, status updates, and Zelle linking
- `pdf.ts`: PDF invoice generation using pdf-lib
- `app/accounting/page.tsx`: Customer invoice list UI
- `app/accounting/admin.tsx`: Admin invoice management UI

## Next Steps
- Connect logic to Supabase (CRUD for invoices)
- Wire up PDF generation and storage
- Integrate with Zelle payment approval flow
- Add notifications (optional)
