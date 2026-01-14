# When Things Break — Calm Ops Runbook

## 🚨 STEP 1: DO NOT PANIC

1. **Do NOT panic**
2. **Do NOT SSH blindly**
3. **Do NOT start running random commands**
4. **Do NOT assume the worst**

Take a breath. The system is designed to handle this.

## 🔍 STEP 2: CHECK THE INCIDENT DASHBOARD

1. **Open TMS → Ops → Incidents**
   - Navigate to: `/company/[company]/ops/incidents`
   - Or: `/company/[company]/ops/health`

2. **If an incident exists:**
   - ✅ Read the summary
   - ✅ Review auto-actions taken
   - ✅ Read the decision summary
   - ✅ Follow the recommendation
   - ✅ Approve recommendations if safe

3. **If no incident exists:**
   - Check health dashboard
   - Manually trigger health check: `GET /api/ops/health`
   - Manually create incident if needed

## 📊 STEP 3: UNDERSTAND THE SITUATION

### Read the Decision Summary

Every incident has a **calm decision brief** with:
- **Incident Summary** (1-2 lines)
- **Time Window** (when it started)
- **Auto-Actions Taken** (what the system did)
- **Current System State** (metrics snapshot)
- **Recommendation** (what to do next)
- **Risk if No Action** (why it matters)

### Review the Timeline

- See all events in chronological order
- Understand what happened
- See what actions were attempted
- Check if actions succeeded

## ✅ STEP 4: FOLLOW THE RECOMMENDATION

The Incident Response Agent has analyzed the situation and provided a recommendation.

**If recommendation is safe:**
- Review the action
- Understand the risk level
- Approve if comfortable
- Execute via UI or follow runbook commands

**If recommendation is unclear:**
- Review the incident timeline
- Check system state metrics
- Consult recovery commands runbook
- If still uncertain, wait or escalate

## 🚫 STEP 5: GOLDEN RULE

**If the Incident Response Agent has not recommended an action, do not take it.**

This system exists to protect you from:
- Rushed decisions
- Cascading failures
- Customer data loss
- Unnecessary downtime

## 📞 STEP 6: ESCALATION (If Needed)

If the incident:
- Is critical and unresolved after 30 minutes
- Has customer impact
- Requires actions beyond safe stabilization
- Is unclear or uncertain

**Then:**
1. Document current state
2. Review all recommendations
3. Escalate to technical lead
4. Do NOT take destructive actions

## 🔄 STEP 7: AFTER RESOLUTION

1. **Mark incident as resolved** in UI
2. **Review post-incident learning**
   - Root cause analysis
   - Prevention steps
   - Alert improvements
   - Automation suggestions

3. **Implement prevention steps**
   - Update monitoring thresholds if needed
   - Add alerts if gaps found
   - Implement automation if safe

4. **Update runbooks** if new patterns discovered

## 💡 REMEMBER

- **The system is designed to stabilize itself**
- **Safe actions are automatic**
- **You're here to approve and guide**
- **Not to panic and react**

This is how professional SaaS ops are done, even at large scale.

## 📋 QUICK REFERENCE

| Situation | Action |
|-----------|--------|
| Incident exists | Read summary, follow recommendation |
| No incident | Check health dashboard, trigger health check |
| Critical & unresolved | Escalate, don't take destructive actions |
| Customer impact | Review customer message draft, approve if safe |
| Uncertain | Wait for agent recommendation |

## 🎯 SUCCESS INDICATORS

You're doing it right if:
- ✅ You're reading summaries, not raw logs
- ✅ You're approving recommendations, not guessing
- ✅ You're following the system, not bypassing it
- ✅ You're staying calm, not panicking
- ✅ You're learning, not repeating mistakes
