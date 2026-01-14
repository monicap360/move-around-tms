# Plant Operations Workflow Automation

## Ticket Creation Triggers
Matching exceptions automatically generate workflow tickets:
- **Quantity discrepancies** → Warehouse ticket
- **Price variances** → Procurement approval ticket
- **Quality issues** → Accounting hold ticket
- **Timing mismatches** → Accounting validation ticket
- **Missing PO/Receipt** → Warehouse or Procurement review

## Department Routing
- Warehouse Receiving → quantity, UOM, missing receipt
- Procurement → price variance, missing PO
- Accounting → invoice timing + quality hold
- Supplier → escalation (manual step in Phase 2)

## Sources
- Matching engine (`/api/matching/run`)
- Excel import diagnostics (`/setup/import-data`)

## UI
- `/workflows/plant-ops` shows ticket queue and status updates.

## Phase Notes
Phase 1 focuses on Excel replacement + automated exception tickets. ERP/EDI and supplier portal integrations follow.
