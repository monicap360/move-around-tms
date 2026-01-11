# API Route Usage Analysis

## Summary

After comprehensive search of the codebase, here are the findings:

### ✅ ROUTES THAT ARE BEING USED

**Only 1 company-specific route is actively used:**

1. **`/api/company/move-around-tms/tickets/list`**
   - Used in:
     - `app/driver/[driver_uuid]/tickets.tsx`
     - `company/move-around-tms/tickets/widgets.tsx`
     - `company/move-around-tms/tickets/page.tsx`
   - **Status: NEEDS IMPLEMENTATION** (currently likely a placeholder)

2. **`/api/company/move-around-tms/tickets/payroll-calc`**
   - Used in: `company/move-around-tms/tickets/payroll-summary.tsx`
   - **Status: NEEDS IMPLEMENTATION** (currently likely a placeholder)

### ❌ ROUTES THAT ARE NOT BEING USED

**All other placeholder routes have ZERO references in the codebase:**

#### Move-Around-TMS Routes (NOT USED):
- ❌ `/api/company/move-around-tms/dispatch/assign` - 0 references
- ❌ `/api/company/move-around-tms/dispatch/auto-assign` - 0 references
- ❌ `/api/company/move-around-tms/drivers` - 0 references
- ❌ `/api/company/move-around-tms/loads` - 0 references
- ❌ `/api/company/move-around-tms/trucks` - 0 references
- ❌ `/api/company/move-around-tms/plants` - 0 references
- ❌ `/api/company/move-around-tms/safety` - 0 references
- ❌ `/api/company/move-around-tms/hr` - 0 references

#### Ronyx-Logistics-LLC Routes (NOT USED):
- ❌ `/api/company/ronyx-logistics-llc/dispatch/assign` - 0 references
- ❌ `/api/company/ronyx-logistics-llc/drivers` - 0 references
- ❌ `/api/company/ronyx-logistics-llc/loads` - 0 references
- ❌ `/api/company/ronyx-logistics-llc/trucks` - 0 references
- ❌ `/api/company/ronyx-logistics-llc/plants` - 0 references
- ❌ `/api/company/ronyx-logistics-llc/reports` - 0 references

### ✅ WHAT IS BEING USED INSTEAD

The codebase uses **dynamic routes** with `organization_code`:

- `/api/company/${organization_code}/tickets/create` ✅ (used)
- `/api/company/${organization_code}/tickets/list` ✅ (used)
- `/api/company/${organization_code}/tickets/payroll-calc` ✅ (used)
- `/api/company/${organization_code}/plants` ✅ (used)
- `/api/company/${organization_code}/payroll/weeks` ✅ (used)
- `/api/company/${organization_code}/dispatch/auto-assign` ✅ (fully implemented)
- `/api/company/${organization_code}/dispatch/assign` ✅ (fully implemented)
- `/api/company/${organization_code}/drivers/available` ✅ (fully implemented)

## Recommendation

### Option 1: Remove Unused Routes (Recommended)
Delete all unused placeholder routes since:
1. They have zero references in the codebase
2. The dynamic `[organization_code]` routes are fully implemented and being used
3. The README (`app/api/company/README.md`) suggests removing placeholders

**Routes to DELETE:**
- All `/api/company/move-around-tms/*` routes EXCEPT `/tickets/list` and `/tickets/payroll-calc`
- All `/api/company/ronyx-logistics-llc/*` routes

### Option 2: Implement Only Used Routes
If the tickets routes are needed, implement:
- `/api/company/move-around-tms/tickets/list`
- `/api/company/move-around-tms/tickets/payroll-calc`

But these could also be replaced with dynamic routes.

## Conclusion

**14-16 placeholder routes are NOT being used** and can be safely removed. Only 2 routes (`/tickets/list` and `/tickets/payroll-calc`) have references, but they should likely use the dynamic route pattern instead.
