# Remaining Stubs and Placeholders Needing Implementation

This document lists all remaining stub functions, placeholder implementations, and TODO comments that need business logic.

## High Priority - Critical Business Functions

### 1. **`app/api/company/[organization_code]/dispatch/auto-assign/route.ts`**
   - Status: ❌ Placeholder
   - Issue: Just returns `{ status: "ok", message: "Dispatch auto-assign endpoint working." }`
   - Needs: Actual auto-assignment logic to match loads with drivers
   - Note: There's a similar route at `api/company/[org]/dispatch/auto-assign/route.ts` that HAS implementation, but the `[organization_code]` version doesn't

### 2. **`app/api/company/[organization_code]/drivers/available/route.ts`**
   - Status: ❌ TODO Comment
   - Issue: Has TODO comment "Replace with real available drivers logic"
   - Needs: Query database for available drivers filtered by organization

### 3. **`lib/driver.ts` - `submitDispatcherRating()`**
   - Status: ❌ Stub with TODO
   - Issue: Just returns `{ success: true }` with TODO comment
   - Needs: Save dispatcher rating/feedback to database
   - Note: This was supposed to be implemented earlier, need to verify

## Medium Priority - ELD/Tracking Integrations

### 4. **`app/tracking/trackingDataProvider.ts`**
   - Status: ⚠️ Multiple TODOs
   - Functions with TODO comments:
     - `fetchGeotabTrackingData()` - Returns empty array with TODO
     - `fetchMotiveTrackingData()` - Returns empty array with TODO
     - `fetchVerizonTrackingData()` - Returns empty array with TODO
     - `fetchOmnitracsTrackingData()` - Returns empty array with TODO
     - `fetchFleetCompleteTrackingData()` - Returns empty array with TODO
   - Needs: Real ELD provider API integrations
   - Note: These require external API credentials

### 5. **`integrations/eld.ts`**
   - Status: ⚠️ Stub Implementations (KeepTruckin, Geotab)
   - Issue: Functions throw errors saying "not configured"
   - Providers: `keepTruckin`, `geotab`
   - Functions: `fetchDriverLocations()`, `fetchTruckStatus()`, `fetchHOS()`
   - Needs: Real API integrations with credentials
   - Note: Samsara provider IS implemented, but KeepTruckin and Geotab are stubs

## Low Priority - AI/Analytics Routes (Using Dummy Data)

### 6. **`api/company/[org]/ai/lane-profitability/route.ts`**
   - Status: ⚠️ Dummy Data
   - Issue: Returns hardcoded lane profitability data
   - Needs: Real analytics calculations from database

### 7. **`api/company/[org]/ai/fraud-anomaly/route.ts`**
   - Status: ⚠️ Dummy Data
   - Issue: Returns hardcoded fraud alerts
   - Needs: Real fraud detection algorithms

### 8. **`api/company/[org]/ai/gps-geofencing/route.ts`**
   - Status: ⚠️ Dummy Data
   - Issue: Returns hardcoded location/geofencing data
   - Needs: Real GPS/geofencing integration

## UI Placeholders (Not Critical - Features Coming Soon)

### 9. **Various Pages with "Coming Soon" Messages**
   - `app/compliance/ifta-reports-tab.tsx` - Multiple "coming soon" features
   - `app/fleet/page.tsx` - Maintenance scheduling, inspection tracking (coming soon)
   - `components/hud/MaintenanceAlerts.tsx` - "coming soon"
   - `components/hud/LiveTelemetry.tsx` - "coming soon"
   - Various marketplace pages - "coming soon" alerts

### 10. **Dashboard Pages Using Mock Data**
   - `app/partners/dashboard/page.tsx` - Uses mock data (has comment to replace)
   - `partners/dashboard/page.tsx` - Uses mock data
   - `owner/dashboard/page.tsx` - Uses mock data
   - `app/customer-portal/page.tsx` - Uses mock data for load requests and invoices

### 11. **Other TODOs**
   - `app/ops/tickets-review/page.tsx` - TODO: Load tickets from supabase
   - `app/accounting/page.tsx` - Multiple TODOs for AR, AP, tax compliance
   - `app/marketplace/post/page.tsx` - TODO: Replace with real compliance check
   - `app/marketplace/browse/page.tsx` - TODO: Replace with real compliance checks
   - `app/company/[company]/fast-scan/analytics-dashboard.tsx` - TODO: Replace with actual revenue/cost fields
   - `supabase/functions/hr-doc-scan/index.ts` - TODO: replace with real OCR provider

## Summary

**Critical (Needs Implementation Now):**
- 3 files with critical business logic missing

**Medium Priority (Require External APIs):**
- 2 files with ELD integration stubs (need API credentials)

**Low Priority (Can Use Mock Data for Now):**
- 3 AI/analytics routes using dummy data
- Multiple UI pages with "coming soon" features
- Various dashboard pages using mock data

### Recommendation

1. **Implement immediately:** Dispatch auto-assign route, available drivers route, submitDispatcherRating
2. **Implement when API credentials available:** ELD integrations
3. **Can defer:** AI routes, UI "coming soon" features, mock data dashboards
