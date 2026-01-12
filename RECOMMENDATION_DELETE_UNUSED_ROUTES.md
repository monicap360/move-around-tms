# Recommendation: Delete Unused Placeholder Routes

## Decision: ✅ DELETE ALL UNUSED PLACEHOLDER ROUTES

## Reasoning

### 1. **Zero References = Zero Risk**
- All 14-15 placeholder routes have **0 references** in the codebase
- Deleting them cannot break any existing functionality
- No tests or documentation reference them

### 2. **Architectural Alignment**
- The codebase has moved to **dynamic routes** (`[organization_code]`)
- Dynamic routes are fully implemented and actively used
- The README (`app/api/company/README.md`) explicitly states: "Remove all placeholder folders"
- Keeping placeholders violates the intended architecture

### 3. **Code Quality & Maintenance**
- Placeholder routes create confusion (they look like real routes but don't work)
- They add maintenance burden with no benefit
- They mislead developers about available endpoints
- Clean codebase = easier to understand and maintain

### 4. **Actual Routes Exist Elsewhere**
- The 2 routes that ARE used exist in `api/company/move-around-tms/tickets/` (not `app/api/`)
- They are fully implemented with database operations
- The placeholder routes in `app/api/` are NOT the ones being called

### 5. **Future-Proofing**
- Removing them prevents accidental use
- Prevents confusion about which routes to use
- Encourages use of the correct dynamic route pattern

## Action Plan

### ✅ DELETE (14-15 files):
1. `app/api/company/move-around-tms/dispatch/assign/route.ts`
2. `app/api/company/move-around-tms/dispatch/auto-assign/route.ts`
3. `app/api/company/move-around-tms/drivers/route.ts`
4. `app/api/company/move-around-tms/loads/route.ts`
5. `app/api/company/move-around-tms/trucks/route.ts`
6. `app/api/company/move-around-tms/plants/route.ts`
7. `app/api/company/move-around-tms/safety/route.ts`
8. `app/api/company/move-around-tms/hr/route.ts`
9. `app/api/company/move-around-tms/reports/route.ts`
10. `app/api/company/move-around-tms/tickets/route.ts` (placeholder, real one is in `api/`)
11. `app/api/company/ronyx-logistics-llc/dispatch/assign/route.ts`
12. `app/api/company/ronyx-logistics-llc/drivers/route.ts`
13. `app/api/company/ronyx-logistics-llc/loads/route.ts`
14. `app/api/company/ronyx-logistics-llc/trucks/route.ts`
15. `app/api/company/ronyx-logistics-llc/plants/route.ts`
16. `app/api/company/ronyx-logistics-llc/reports/route.ts`

### ⚠️ KEEP (but verify they're working):
- `app/api/company/move-around-tms/health/route.ts` - Simple health check (acceptable)
- `app/api/company/ronyx-logistics-llc/health/route.ts` - Simple health check (acceptable)
- Routes in `api/company/move-around-tms/tickets/` - Actually implemented and used

### ✅ KEEP (Dynamic Routes):
- All routes in `app/api/company/[organization_code]/` - Fully implemented and used

## Benefits of Deletion

1. **Cleaner Codebase** - Remove 14-15 files of dead code
2. **Less Confusion** - Developers won't be misled by placeholder routes
3. **Better Architecture** - Enforces use of dynamic routes
4. **Easier Maintenance** - Less code to maintain
5. **No Risk** - Zero references = zero breakage

## Conclusion

**DELETE THEM.** This is a clear win with no downsides. The routes are unused, violate the architecture, create confusion, and serve no purpose.
