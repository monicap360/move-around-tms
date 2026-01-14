# Incident Creation Flow (Logic Map)

```
Alert Trigger
   │
   ├─ Health Check Failure
   ├─ Threshold Exceeded
   ├─ PM2 Restart Loop
   ├─ Error Rate Spike
   └─ Manual Detection
   │
   ↓
Create Incident Record
   │
   ├─ Generate unique ID
   ├─ Set severity (info/warning/critical)
   ├─ Set status (open)
   ├─ Record timestamp
   └─ Store organization context
   │
   ↓
Capture System Snapshot
   │
   ├─ Memory usage
   ├─ Disk usage
   ├─ PM2 status
   ├─ Nginx status
   ├─ Error rates
   ├─ Upload metrics
   └─ Recent deploy info
   │
   ↓
Safe Stabilization
   │
   ├─ Evaluate incident type
   ├─ Determine safe actions
   ├─ Execute safe actions:
   │   ├─ PM2 restart (if needed)
   │   ├─ Nginx reload (if safe)
   │   ├─ Pause jobs (if overloaded)
   │   ├─ Rate limit (if spike)
   │   └─ Clear temp (if disk pressure)
   ├─ Log all actions
   └─ Update incident status
   │
   ↓
Classification
   │
   ├─ Analyze metrics
   ├─ Review violations
   ├─ Classify type:
   │   ├─ memory_exhaustion
   │   ├─ disk_pressure
   │   ├─ upload_spike
   │   ├─ bad_deploy
   │   ├─ dependency_outage
   │   └─ network_issue
   └─ Update incident type
   │
   ↓
Decision Brief
   │
   ├─ Generate summary (1-2 lines)
   ├─ Calculate time window
   ├─ List auto-actions taken
   ├─ Capture current state
   ├─ Generate recommendation
   └─ Assess risk if no action
   │
   ↓
Customer Impact Assessment
   │
   ├─ Detect customer-facing impact
   ├─ Count affected customers
   ├─ Assess impact level
   ├─ Identify affected features
   └─ Estimate downtime
   │
   ↓
Customer Message Draft (If Impact)
   │
   ├─ Draft safe status message
   ├─ Set appropriate tone
   ├─ Suggest channels (email/SMS/in-app/status page)
   ├─ Mark as requires approval
   └─ Store draft (NEVER auto-send)
   │
   ↓
Recommendations
   │
   ├─ Analyze incident
   ├─ Generate recommendations
   ├─ Assess risk levels
   ├─ Mark as requires approval
   └─ Wait for human approval
   │
   ↓
Resolution
   │
   ├─ Human marks as resolved
   ├─ Record resolution time
   ├─ Update status
   └─ Trigger learning loop
   │
   ↓
Learning Loop
   │
   ├─ Review incident timeline
   ├─ Identify root cause
   ├─ Propose prevention steps
   ├─ Suggest alert improvements
   ├─ Recommend automation
   ├─ Identify UX friction
   └─ Feed back into system
```

## Flow Notes

- **All steps are logged** in `tms_incident_events`
- **All actions are recorded** in `tms_incident_actions`
- **All recommendations require approval** before execution
- **Customer messages never auto-send** - always require approval
- **Learning loop feeds back** into thresholds and alerts

## Decision Points

1. **After Safe Stabilization**: Is system stable?
   - Yes → Monitor
   - No → Generate recommendations

2. **After Classification**: Is customer impact likely?
   - Yes → Draft message
   - No → Continue monitoring

3. **After Recommendations**: Are actions safe?
   - Yes → Auto-execute (if configured)
   - No → Require approval

4. **After Resolution**: Was root cause identified?
   - Yes → Propose prevention
   - No → Flag for review
