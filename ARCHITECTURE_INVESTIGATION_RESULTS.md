# Architecture Investigation Results

## Key Finding: README Says "Keep Real Company Slugs"

The `app/api/company/README.md` states:
> "Only keep folders for real company slugs (e.g., move-around-tms, ronyx-logistics-llc). Remove all placeholder folders like [organization_code]."

**This suggests the folders SHOULD exist, but they need REAL implementations, not placeholders!**

## Comparison: Different Implementations Found

### Move-Around-TMS Routes:
- `dispatch/auto-assign/route.ts` - ❌ PLACEHOLDER (just returns message)
- `dispatch/assign/route.ts` - ❌ PLACEHOLDER (just returns message)
- `drivers/available/route.ts` - ❌ PLACEHOLDER (just returns message)
- `loads/pending/route.ts` - ❌ PLACEHOLDER (just returns message)
- All others - ❌ PLACEHOLDERS

### Ronyx-Logistics-LLC Routes:
- `dispatch/auto-assign/route.ts` - ✅ **HAS IMPLEMENTATION** (database operations)
- `loads/pending/route.ts` - ✅ **HAS IMPLEMENTATION** (database operations)
- Others - ❌ PLACEHOLDERS

### Dynamic Routes:
- `[organization_code]/dispatch/auto-assign/route.ts` - ✅ FULL IMPLEMENTATION
- `[organization_code]/dispatch/assign/route.ts` - ✅ FULL IMPLEMENTATION
- `[organization_code]/drivers/available/route.ts` - ✅ FULL IMPLEMENTATION
- `[organization_code]/loads/pending/route.ts` - ✅ FULL IMPLEMENTATION

## Architecture Pattern Analysis

### From Documentation:

1. **DOMAIN_MAP.md** says:
   - **Company**: UI/routing/branding layer (client-facing)
   - **Organization**: Internal/system-level entity (backend)
   - Company is a "view" of an Organization

2. **NAMING_CONVENTIONS.md** says:
   - Use `company` for UI/routing/branding
   - Use `organization` internally
   - Never mix them at the same route level

3. **Company README** says:
   - "Keep folders for real company slugs"
   - "Remove placeholder folders like [organization_code]"

## Potential Purpose (Multi-Tenant Pattern)

**Theory**: Company-specific routes may allow for:
1. **Company-specific customizations** - Different business logic per company
2. **Overrides** - Company routes can override default dynamic routes
3. **Branding/UI differences** - Different responses per company
4. **Legacy support** - Supporting hardcoded company endpoints

## Evidence for This Theory:

- ✅ `ronyx-logistics-llc/dispatch/auto-assign` HAS different implementation than dynamic route
- ✅ README says "keep folders for real company slugs"
- ✅ Architecture docs separate "company" (UI/branding) from "organization" (system)
- ✅ Multiple companies exist (move-around-tms, ronyx-logistics-llc)

## Evidence Against:

- ❌ Most company routes are just placeholders
- ❌ Zero references to company routes in codebase (except tickets)
- ❌ Dynamic routes work for all companies
- ❌ No company-specific logic differences found

## Comparison with Axon/Rose Rocket

**No references found** to Axon or Rose Rocket routing patterns in the codebase.
- Only found: "Accepted columns (Axon, Rose Rocket, etc.)" in FastScan page

## Conclusion

### Two Possible Scenarios:

#### Scenario A: Routes Should Be Deleted
- They're unused placeholders
- Dynamic routes handle all cases
- README might be outdated
- Zero references = no purpose

#### Scenario B: Routes Should Be Implemented
- README says "keep folders for real company slugs"
- `ronyx-logistics-llc` has some implementations (shows the pattern)
- Architecture allows company-specific overrides
- They're placeholders waiting for implementation

## Recommendation

**Given the README explicitly says "keep folders for real company slugs"**, I recommend:

**Option 1 (Conservative)**: Keep the folders but implement them (use dynamic route logic as base)

**Option 2 (Pragmatic)**: Delete placeholder routes, but keep structure if company-specific customization is needed later

**Option 3 (Hybrid)**: Delete unused placeholders, but implement routes that have different logic (like ronyx-logistics-llc examples show)

The fact that `ronyx-logistics-llc` has SOME implementations suggests the pattern might be intentional, but most routes were never completed.
