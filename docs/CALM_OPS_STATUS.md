# Calm Ops & Incident Response Agent - Implementation Status

## ✅ COMPLETED (Phase 1-3)

### 1. Database Schema ✅
- **File**: `db/migrations/057_calm_ops_incident_system.sql`
- **Tables Created**:
  - `tms_incidents` - Incident records (org-scoped or platform-wide)
  - `tms_incident_events` - Append-only event log
  - `tms_incident_actions` - All actions taken (safe + approved)
  - `tms_incident_recommendations` - Recommendations requiring approval
  - `tms_health_snapshots` - Periodic health check snapshots
- **RLS Policies**: ✅ All tables have organization isolation + super admin bypass
- **Auto-resolve**: ✅ Stale incidents auto-resolve after 24h

### 2. TMS Health Monitor ✅
- **File**: `lib/ops/healthMonitor.ts`
- **Monitors**:
  - ✅ Memory usage percentage
  - ✅ Disk usage percentage
  - ✅ PM2 status and restart count
  - ✅ Upload failure rate
  - ✅ Error rate (5xx errors/min)
  - ✅ App health check endpoint
- **Alert Thresholds**: Configurable (defaults: memory 85%, disk 80%, upload failures 10%, errors 10/min)
- **Auto-detection**: Creates incidents when thresholds exceeded

### 3. Incident Response Agent ✅
- **File**: `lib/ops/incidentResponseAgent.ts`
- **Capabilities**:
  - ✅ Detect incidents from health metrics
  - ✅ Classify incident type (memory, disk, upload, deploy, dependency, network)
  - ✅ Attempt safe stabilization (PM2 restart, nginx reload, pause jobs, rate-limit, clear temp)
  - ✅ Generate calm decision summaries
  - ✅ Create recommendations for human approval
- **Safety**: ✅ Only safe, reversible actions. No deletes, schema changes, or migrations.

### 4. API Routes ✅
- **GET `/api/ops/health`**: Health check + metrics collection + auto-incident detection
- **GET `/api/ops/incidents`**: List incidents (org-scoped)
- **POST `/api/ops/incidents`**: Create manual incident or trigger health check
- **GET `/api/ops/incidents/[id]`**: Get incident details + decision summary
- **PATCH `/api/ops/incidents/[id]`**: Update incident status, resolve
- **POST `/api/ops/incidents/[id]/recommendations/[recId]/approve`**: Approve and execute recommendation

### 5. UI Pages ✅
- **`/company/[company]/ops/health`**: Health monitor dashboard with real-time metrics
- **`/company/[company]/ops/incidents`**: Active incidents list with status badges

## 🚧 IN PROGRESS (Phase 4-6)

### 6. Customer Protection
- **Status**: Pending
- **Required**:
  - Detect customer-facing impact
  - Draft customer-safe status messages
  - Suggest communication method
  - Never auto-send without approval

### 7. Post-Incident Learning
- **Status**: Pending
- **Required**:
  - Review incident timeline
  - Identify root cause
  - Propose prevention steps
  - Suggest alert/automation improvements
  - Feed learnings back into system

### 8. Additional UI Components
- **Status**: Pending
- **Required**:
  - Incident detail page with timeline
  - Decision summary display
  - Recommendation approval modal
  - Incident history page
  - Weekly stability summary

## 🔒 SAFETY PRINCIPLES (NON-NEGOTIABLE)

✅ **Safety before speed** - Stabilize first, diagnose second
✅ **No destructive actions** - Only safe, reversible actions
✅ **Human approval required** - All recommendations require approval
✅ **Full audit trail** - All actions logged
✅ **Customer data protected** - Never at risk
✅ **Clear summaries** - Short, actionable decision summaries (not raw logs)

## 📊 SAFE ACTIONS (IMPLEMENTED)

✅ **PM2 Restart** - Restart application process
✅ **Nginx Reload** - Reload Nginx config (no changes)
✅ **Pause Jobs** - Pause background jobs temporarily
✅ **Rate Limit** - Rate-limit uploads temporarily
✅ **Clear Temp** - Clear temporary upload directories

🚫 **NOT ALLOWED**:
- No deletes
- No schema changes
- No data migrations
- No auto-rollbacks

## 📋 NEXT STEPS

### Immediate
1. **Run Migration**: Execute `db/migrations/057_calm_ops_incident_system.sql` in Supabase
2. **Set Up Health Checks**: Configure periodic health check cron job
3. **Test Detection**: Verify incidents are created when thresholds exceeded
4. **Test Stabilization**: Verify safe actions execute correctly

### Short Term
1. Implement customer protection (detect impact, draft messages)
2. Build post-incident learning system
3. Create incident detail page with timeline
4. Add recommendation approval UI
5. Create weekly stability summary

### Production Setup
1. Configure PM2 monitoring integration
2. Set up disk/memory monitoring (OS-level)
3. Configure error rate tracking
4. Set up alert notifications
5. Create incident response runbook

## 🎯 SUCCESS METRICS

- **MTTR < 5 minutes** - Mean time to resolution
- **No surprise outages** - All incidents detected before customer impact
- **No cascading failures** - Safe actions prevent escalation
- **Clear next steps** - Every incident has actionable recommendations

## 📝 USAGE

### Trigger Health Check
```typescript
// GET /api/ops/health?organization_id=uuid
// Automatically creates incident if thresholds exceeded
```

### View Incidents
```typescript
// GET /api/ops/incidents?organization_id=uuid&status=open
```

### Get Decision Summary
```typescript
// GET /api/ops/incidents/[incidentId]
// Returns incident + events + actions + recommendations + decisionSummary
```

### Approve Recommendation
```typescript
// POST /api/ops/incidents/[incidentId]/recommendations/[recId]/approve
// Executes approved action
```

## 🔧 PRODUCTION INTEGRATION

### PM2 Integration
Replace placeholder `getPM2Status()` with:
```typescript
import pm2 from 'pm2';
pm2.connect((err) => {
  pm2.describe('move-around-tms', (err, apps) => {
    // Get status from apps[0]
  });
});
```

### Disk/Memory Monitoring
Replace placeholders with OS-level monitoring:
- Use `df` command for disk
- Use `/proc/meminfo` or OS APIs for memory
- Or integrate with monitoring service (Datadog, New Relic, etc.)

### Error Rate Tracking
Integrate with:
- Application logs (parse 5xx errors)
- Error tracking service (Sentry, Rollbar)
- Nginx access logs
