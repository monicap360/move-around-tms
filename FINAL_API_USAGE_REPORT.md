# Final API Route Usage Report

## Executive Summary

**14-16 placeholder routes are NOT being used** in the codebase. Only 2 routes have references, and those routes exist in a different location (`api/` instead of `app/api/`).

---

## ✅ Routes That ARE Being Used

### 1. `/api/company/move-around-tms/tickets/list`
- **References Found:** 3 files
  - `app/driver/[driver_uuid]/tickets.tsx`
  - `company/move-around-tms/tickets/widgets.tsx`
  - `company/move-around-tms/tickets/page.tsx`
- **Location:** `api/company/move-around-tms/tickets/list/route.ts` (NOT in `app/api/`)
- **Status:** ✅ EXISTS (need to verify if implemented)

### 2. `/api/company/move-around-tms/tickets/payroll-calc`
- **References Found:** 1 file
  - `company/move-around-tms/tickets/payroll-summary.tsx`
- **Location:** `api/company/move-around-tms/tickets/payroll-calc/route.ts` (NOT in `app/api/`)
- **Status:** ✅ EXISTS (need to verify if implemented)

---

## ❌ Routes That Are NOT Being Used (0 References)

### Move-Around-TMS Routes:
1. ❌ `app/api/company/move-around-tms/dispatch/assign/route.ts` - **0 references**
2. ❌ `app/api/company/move-around-tms/dispatch/auto-assign/route.ts` - **0 references**
3. ❌ `app/api/company/move-around-tms/drivers/route.ts` - **0 references**
4. ❌ `app/api/company/move-around-tms/loads/route.ts` - **0 references**
5. ❌ `app/api/company/move-around-tms/trucks/route.ts` - **0 references**
6. ❌ `app/api/company/move-around-tms/plants/route.ts` - **0 references**
7. ❌ `app/api/company/move-around-tms/safety/route.ts` - **0 references**
8. ❌ `app/api/company/move-around-tms/hr/route.ts` - **0 references**
9. ❌ `app/api/company/move-around-tms/reports/route.ts` - **0 references**

### Ronyx-Logistics-LLC Routes:
10. ❌ `app/api/company/ronyx-logistics-llc/dispatch/assign/route.ts` - **0 references**
11. ❌ `app/api/company/ronyx-logistics-llc/drivers/route.ts` - **0 references**
12. ❌ `app/api/company/ronyx-logistics-llc/loads/route.ts` - **0 references**
13. ❌ `app/api/company/ronyx-logistics-llc/trucks/route.ts` - **0 references**
14. ❌ `app/api/company/ronyx-logistics-llc/plants/route.ts` - **0 references**
15. ❌ `app/api/company/ronyx-logistics-llc/reports/route.ts` - **0 references**

---

## ✅ What IS Being Used Instead

The codebase primarily uses **dynamic routes** with `organization_code`:

- ✅ `/api/company/${organization_code}/tickets/create`
- ✅ `/api/company/${organization_code}/tickets/list`
- ✅ `/api/company/${organization_code}/tickets/payroll-calc`
- ✅ `/api/company/${organization_code}/plants`
- ✅ `/api/company/${organization_code}/payroll/weeks`
- ✅ `/api/company/${organization_code}/dispatch/auto-assign` (fully implemented)
- ✅ `/api/company/${organization_code}/dispatch/assign` (fully implemented)
- ✅ `/api/company/${organization_code}/drivers/available` (fully implemented)

These dynamic routes are **fully wired** and being used throughout the application.

---

## Recommendation

### ✅ SAFE TO DELETE (14-15 routes)

All placeholder routes in `app/api/company/move-around-tms/` and `app/api/company/ronyx-logistics-llc/` can be safely removed because:

1. **Zero references** in the codebase
2. **Dynamic routes** are fully implemented and being used
3. **README confirms** placeholders should be removed (`app/api/company/README.md`)

### ⚠️ KEEP BUT VERIFY (2 routes)

The tickets routes that ARE referenced exist in `api/company/move-around-tms/tickets/` (not `app/api/`), so:
- The `app/api/company/move-around-tms/tickets/route.ts` placeholder can be removed
- The actual routes in `api/company/move-around-tms/tickets/` should be kept and verified

---

## Action Items

1. ✅ **Delete unused placeholder routes** (14-15 files)
2. ⚠️ **Verify tickets routes** in `api/company/move-around-tms/tickets/` are implemented
3. ✅ **Update references** to use dynamic routes if needed

---

## Status: COMPLETE

**Conclusion:** 14-15 placeholder routes are completely unused and can be safely deleted. The codebase uses dynamic `[organization_code]` routes instead, which are fully implemented.
