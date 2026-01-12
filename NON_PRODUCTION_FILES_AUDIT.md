# Non-Production Ready Files Audit

Comprehensive list of files that are not production ready, organized by category and priority.

## ❌ CRITICAL - Core Business Logic Missing

### API Routes - Stubs/Placeholders
1. **`app/api/company/[organization_code]/health/route.ts`**
   - Status: ❌ Placeholder
   - Issue: Returns simple `{ status: "ok", message: "Company health check working." }`
   - Needs: Real health check (database connectivity, service status)

2. **`app/api/company/move-around-tms/health/route.ts`**
   - Status: ❌ Placeholder
   - Issue: Returns simple status message
   - Needs: Real health check implementation

3. **`app/api/company/ronyx-logistics-llc/health/route.ts`**
   - Status: ❌ Placeholder
   - Issue: Returns simple status message
   - Needs: Real health check implementation

### ELD/Tracking Integrations - Stubs
4. **`integrations/eld.ts`**
   - Status: ⚠️ Partial Implementation
   - Issue: KeepTruckin and Geotab providers throw "not configured" errors
   - Functions: `fetchDriverLocations()`, `fetchTruckStatus()`, `fetchHOS()`
   - Note: Samsara provider IS implemented
   - Needs: API credentials and real integrations for KeepTruckin and Geotab

5. **`app/tracking/trackingDataProvider.ts`**
   - Status: ⚠️ Multiple TODOs
   - Functions with TODO comments:
     - `fetchGeotabTrackingData()` - Returns empty array
     - `fetchMotiveTrackingData()` - Returns empty array
     - `fetchVerizonTrackingData()` - Returns empty array
     - `fetchOmnitracsTrackingData()` - Returns empty array
     - `fetchFleetCompleteTrackingData()` - Returns empty array
   - Needs: Real ELD provider API integrations
   - Priority: **MEDIUM** - Requires external API credentials

---

## ⚠️ MEDIUM PRIORITY - Mock/Hardcoded Data

### Analytics/Intelligence Routes
6. **`app/api/analytics/dashboard/route.ts`**
   - Status: ⚠️ Mock Data
   - Comment: "Mock analytics data - in production, this would query your actual database"
   - Issue: Returns randomly generated metrics instead of real database queries
   - Needs: Real database queries for analytics

7. **`app/api/analytics/performance/route.ts`**
   - Status: ⚠️ Mock Data
   - Comment: "Generate mock performance trend data"
   - Issue: Generates random performance data
   - Needs: Real performance calculations from database

8. **`app/api/intelligence/tickets/analyze/route.ts`**
   - Status: ⚠️ Hardcoded Data
   - Issue: Returns hardcoded `forensic_score: 93, anomalies: ["weight_mismatch", "date_offset"]`
   - Needs: Real ticket analysis logic, fraud detection algorithms

9. **`app/api/fleetpulse/reconstruct-day/route.ts`**
   - Status: ⚠️ Hardcoded Data
   - Issue: Returns hardcoded reconstruction timeline array
   - Needs: Real day reconstruction from tickets, GPS, ELD data

### Payment/Merchandise Integration
10. **`app/api/merch/create-checkout/route.ts`**
    - Status: ⚠️ Mock URL
    - Comment: "mocked checkout URL. Replace the mock with provider integration when ready."
    - Issue: Returns `https://checkout.move-around-tms.example/mock-session`
    - Needs: Real payment provider integration (Stripe, Shopify, etc.)

### Push Notifications
11. **`app/api/push/send/route.ts`**
    - Status: ⚠️ Stub
    - Comment: "TODO: Integrate with push notification service (e.g., Firebase, OneSignal)"
    - Issue: Only logs to console, doesn't send actual notifications
    - Needs: Real push notification service integration

---

## 📊 LOW PRIORITY - In-Memory Stores (Demo/Dev)

### FastScan Routes
12. **`app/api/fastscan/upload.ts`**
    - Status: ⚠️ In-Memory Store
    - Comment: "In-memory store for demo purposes"
    - Issue: Uses in-memory arrays instead of database
    - Uses: Mock OCR result with "MOCK_OCR_TEXT"
    - Needs: Database storage and real OCR integration

13. **`app/api/fastscan/list.ts`**
    - Status: ⚠️ In-Memory Store
    - Comment: "Use the same in-memory store as upload.ts for demo"
    - Issue: Returns empty array from in-memory store
    - Needs: Database queries

### Compliance Routes
14. **`app/api/compliance/list.ts`**
    - Status: ⚠️ Mock Data
    - Comment: "For demo: mock Fast Scan data"
    - Issue: Uses empty arrays for scans, documents, results, tickets
    - Needs: Real database queries

15. **`app/api/compliance/evaluate.ts`**
    - Status: ⚠️ Mock Data
    - Comment: "For demo: mock Fast Scan data"
    - Issue: Uses empty arrays
    - Needs: Real database queries

---

## 🎨 UI/Frontend - Mock Data or TODOs

### Pages with Mock Data
16. **`app/driver-portal/page.tsx`**
    - Status: ⚠️ Mock Data
    - Comment: "In production, get driver data based on authentication. For now, we'll simulate with mock data"
    - Issue: Hardcoded driver data, documents, trainings, goals
    - Needs: Real database queries with authentication

17. **`app/customer-portal/page.tsx`**
    - Status: ⚠️ Mock Data
    - Comment: "Mock data"
    - Issue: Uses hardcoded invoice and shipment data
    - Needs: Real database queries

18. **`partners/ronyx/page.tsx`**
    - Status: ⚠️ Mock Data
    - Comment: "Mock data - replace with real Supabase queries"
    - Needs: Real database queries

19. **`partners/dashboard/page.tsx`**
    - Status: ⚠️ Mock Data
    - Comment: "Mock data for now - replace with real Supabase queries"
    - Needs: Real database queries

### Pages with TODO Comments
20. **`app/marketplace/post/page.tsx`**
    - Status: ⚠️ TODO
    - Issue: `const orgCompliant = true; // TODO: Replace with real compliance check`
    - Needs: Real compliance check implementation

21. **`app/marketplace/browse/page.tsx`**
    - Status: ⚠️ TODO (from REMAINING_STUBS_INVENTORY.md)
    - Issue: TODO: Replace with real compliance checks
    - Needs: Real compliance validation

22. **`app/ops/tickets-review/page.tsx`**
    - Status: ⚠️ TODO (from REMAINING_STUBS_INVENTORY.md)
    - Issue: TODO: Load tickets from supabase
    - Needs: Real database queries

23. **`app/company/[company]/fast-scan/analytics-dashboard.tsx`**
    - Status: ⚠️ Placeholder Calculation
    - Issue: `const totalProfit = totalRevenue - totalTickets * 50; // Placeholder: $50 cost per ticket`
    - Needs: Real cost calculation from database

24. **`app/accounting/page.tsx`**
    - Status: ⚠️ TODO (from REMAINING_STUBS_INVENTORY.md)
    - Issue: Multiple TODOs for AR, AP, tax compliance
    - Needs: Accounting module implementation

### Pages with "Coming Soon" Features
25. **`app/compliance/ifta-reports-tab.tsx`**
    - Status: ⚠️ "Coming Soon" Features
    - Issues: Multiple features marked "coming soon":
      - Generate IFTA Report PDF / Excel Export
      - Fuel Card Import (EFS, Comdata, WEX, etc.)
      - Auto MPG Calculation per Truck or Driver
      - Reminder Alerts (Quarterly IFTA due dates)
      - Error Checker: Flags missing fuel receipts or mileage logs

26. **`app/fleet/page.tsx`** (from REMAINING_STUBS_INVENTORY.md)
    - Status: ⚠️ "Coming Soon"
    - Issues: Maintenance scheduling, inspection tracking (coming soon)
    - Needs: Fleet management features

27. **`components/hud/MaintenanceAlerts.tsx`** (from REMAINING_STUBS_INVENTORY.md)
    - Status: ⚠️ "Coming Soon"
    - Needs: Maintenance alerts implementation

28. **`components/hud/LiveTelemetry.tsx`** (from REMAINING_STUBS_INVENTORY.md)
    - Status: ⚠️ "Coming Soon"
    - Needs: Live telemetry implementation

---

## 🔧 Backend/Supabase Functions - TODOs

29. **`supabase/functions/hr-doc-scan/index.ts`** (from REMAINING_STUBS_INVENTORY.md)
    - Status: ⚠️ TODO
    - Issue: TODO: replace with real OCR provider
    - Needs: Real OCR integration

---

## 🐛 Debug/Development Files

30. **`app/production-debug/page.tsx`**
    - Status: ⚠️ Debug Page
    - Issue: Uses `alert()` and `console.log()` for debugging
    - Note: This is intentionally a debug page, but should be disabled in production
    - Recommendation: Remove or disable in production builds

31. **`app/api/test-connection/route.ts`**
    - Status: ⚠️ Test Route
    - Issue: Test endpoint, should not be in production
    - Recommendation: Remove or disable in production

32. **`app/api/debug-production/route.ts`**
    - Status: ⚠️ Debug Route
    - Issue: Debug endpoint, should not be in production
    - Recommendation: Remove or disable in production

---

## 📋 Summary

### By Priority

**Critical (Need Implementation Before Production):**
- 3 health check routes (simple placeholders)
- 2 ELD integration files (partial implementations)
- **Total: 5 files**

**Medium Priority (Should Implement for Full Functionality):**
- 5 analytics/intelligence routes (mock/hardcoded data)
- 1 payment integration (mock URL)
- 1 push notification service (stub)
- **Total: 7 files**

**Low Priority (Can Use Mock Data in Development):**
- 4 FastScan/compliance routes (in-memory stores)
- 13 UI pages (mock data, TODOs, "coming soon")
- 1 backend function (OCR TODO)
- **Total: 18 files**

**Debug/Development (Should Remove/Disable in Production):**
- 3 debug/test routes/pages
- **Total: 3 files**

### Grand Total: 33 Non-Production Ready Files

### Recommendations

1. **Before Production Launch:**
   - Implement health checks
   - Remove or disable debug/test routes
   - Replace mock data in critical user-facing pages (driver-portal, customer-portal)

2. **Post-Launch Improvements:**
   - Implement ELD integrations when API credentials available
   - Replace analytics mock data with real calculations
   - Implement payment and push notification integrations
   - Complete "coming soon" features based on user demand

3. **Development/Demo:**
   - Keep FastScan/compliance in-memory stores for demos if needed
   - Document which routes are intentionally using mock data

---

*Generated: $(Get-Date)*
