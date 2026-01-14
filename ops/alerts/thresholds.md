# MoveAround TMS Alert Thresholds

## CRITICAL (Create Incident Immediately)

These conditions trigger immediate incident creation:

- **App health endpoint fails twice in 60s**
  - `/api/health` returns non-200 status
  - Two consecutive failures within 60 seconds

- **PM2 restart loop (3 restarts in 5 min)**
  - PM2 process restarts 3+ times within 5 minutes
  - Indicates application crash loop

- **Memory usage > 85% for 2 min**
  - System memory usage exceeds 85% for 2+ minutes
  - Risk of OOM (Out of Memory) errors

- **Disk usage > 80%**
  - Disk space below 20% free
  - Risk of write failures

- **HTTP 5xx rate > 5% for 2 min**
  - More than 5% of requests return 5xx errors
  - Sustained for 2+ minutes

## WARNING (Monitor Closely)

These conditions trigger warnings but don't create incidents:

- **Memory > 75% for 5 min**
  - Approaching critical threshold
  - Monitor for escalation

- **Disk > 70%**
  - Approaching critical threshold
  - Consider cleanup actions

- **Upload failure rate spikes**
  - Upload failures increase significantly
  - May indicate external service issues

- **Background job lag > expected window**
  - Jobs taking longer than expected
  - May indicate resource constraints

## INFO (Log Only)

These events are logged but don't trigger alerts:

- **Deploy completed**
  - Successful deployment detected
  - Logged for audit trail

- **PM2 restarted successfully**
  - Normal restart (not a loop)
  - Logged for monitoring

- **Nginx reloaded**
  - Configuration reloaded successfully
  - Logged for audit

## RULE

**All CRITICAL alerts create an incident automatically.**

No human intervention required for incident creation.
Human approval required for all actions beyond safe stabilization.

## Threshold Configuration

Thresholds can be adjusted per organization via:
- Database: `tms_health_snapshots` table
- API: `POST /api/ops/health` with custom thresholds
- Environment variables (future enhancement)

## Alert Escalation

1. **First Alert**: Create incident, attempt safe actions
2. **No Resolution in 10 min**: Escalate to human review
3. **Critical for 30 min**: Require immediate human intervention
4. **Customer Impact**: Draft status message, require approval
