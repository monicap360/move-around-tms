# MOVEAROUND TMS — DEMO FLOWS BY COMPANY TYPE

**Goal:** Make the pain visible in under 7 minutes

**Principle:** Same product, different story. You're not demoing four products—you're demoing the same system with different emphasis based on what hurts them most.

---

## 🔹 DEMO FLOW #1 — AGGREGATES / QUARRY OPERATORS

**Buyer:** VP Operations, Controller  
**Core Pain:** Scale disputes, audits, silent revenue loss  
**Vertical:** `aggregates_quarry`

### Demo Narrative

> "Let me show you how we prove weights and surface money risk."

### Flow (7 minutes)

1. **Open a scale ticket**
   - Point to net weight
   - Show confidence badge (Green/Yellow/Red)
   - **Say:** "This ticket looks normal at first glance — but the system compares it to this site's historical norm."
   - Hover over badge
   - **Tooltip shows:** "Outside historical range for this quarry"
   - **Say:** "No one has to guess — we show why it's questionable."

2. **Go to Exceptions page** (`/exceptions`)
   - Show Top 5 issues
   - Highlight one labeled: "Potential revenue risk"
   - **Say:** "This is what actually needs attention today."

3. **Open Revenue at Risk** (`/revenue-risk`)
   - Show dollar estimate
   - **Say:** "This is money you may already be losing — quietly."

4. **Generate Audit Packet**
   - Click "Generate Audit Packet" button
   - Show packet preview/download
   - **Say:** "This is what we hand your auditor."

### Close Line

> "We don't replace your scale — we prove it."

---

## 🔹 DEMO FLOW #2 — CONSTRUCTION HAULING

**Buyer:** Director of Ops  
**Core Pain:** Ticket disputes, missing loads, driver inconsistency  
**Vertical:** `construction_hauling`

### Demo Narrative

> "Let me show you which loads are most likely to become disputes."

### Flow (7 minutes)

1. **Open job view**
   - Show list of tickets
   - Highlight one with low confidence badge
   - Show driver history/pattern
   - **Say:** "This isn't about one ticket — it's about trend visibility."

2. **Exceptions page** (`/exceptions`)
   - Show exceptions labeled:
     - "Likely dispute"
     - "Missing verification"
   - **Say:** "This list is ranked by financial impact."

3. **Revenue exposure**
   - Show estimate tied to job/project
   - **Say:** "This is what turns into phone calls later."

### Close Line

> "We help you fix disputes before customers call."

---

## 🔹 DEMO FLOW #3 — WASTE & RECYCLING

**Buyer:** Ops Manager, Compliance  
**Core Pain:** Repeat issues, contamination disputes, compliance drift  
**Vertical:** `waste_recycling`

### Demo Narrative

> "Let me show you how repeat problems surface automatically."

### Flow (7 minutes)

1. **Open route or site view**
   - Show recurring anomaly indicator
   - **Say:** "This issue didn't happen once — it's repeating."

2. **Source reliability view**
   - Show confidence trending down over time
   - **Say:** "This is where problems usually start."

3. **Exception ranking** (`/exceptions`)
   - Highlight "repeat issue" label
   - **Say:** "The system escalates repeat risk automatically."

4. **Compliance view** (if available)
   - Show drift indicator
   - **Say:** "This flags risk before it becomes a violation."

### Close Line

> "We reduce repeat problems without adding work."

---

## 🔹 DEMO FLOW #4 — READY-MIX CONCRETE

**Buyer:** Ops, Dispatch  
**Core Pain:** Timing sensitivity, rejected loads, same-day chaos  
**Vertical:** `ready_mix`

### Demo Narrative

> "Let me show you which deliveries are most likely to fail today."

### Flow (7 minutes)

1. **Today's deliveries view**
   - Highlight one flagged with risk indicator
   - **Say:** "This delivery is at risk — before it happens."

2. **Timing confidence**
   - Show deviation from norm
   - **Say:** "We compare today to what normally works."

3. **Exceptions list** (today-only filter)
   - Show 3 items max
   - **Say:** "This is all dispatch needs to look at today."

4. **Rejection risk indicator**
   - Show simple risk badge
   - **Say:** "This helps prevent rejected loads."

### Close Line

> "We protect today's revenue, not last week's report."

---

## 🧠 IMPORTANT: SAME PRODUCT, DIFFERENT STORY

You are **not** demoing four products.

You are demoing:
- ✅ The same system
- ✅ With different emphasis
- ✅ Based on what hurts them most

**That's powerful.**

---

## 🎯 PREPARATION CHECKLIST

### For Each Vertical:

- [ ] Create demo org with correct `vertical_type`
- [ ] Seed 1–2 realistic anomalies per org
- [ ] Ensure confidence badge is visible on tickets
- [ ] Ensure exceptions page (`/exceptions`) exists and works
- [ ] Ensure revenue at risk page (`/revenue-risk`) exists and works
- [ ] Prepare 1 audit packet per org (test generation)
- [ ] Practice each flow once out loud

### Demo Org Setup:

- **Aggregates:** Acme Aggregates (already seeded in migration 054)
- **Construction:** Create "ABC Construction" org
- **Waste:** Create "Green Waste Solutions" org
- **Ready-Mix:** Create "Concrete Express" org

### Key Pages to Verify:

1. `/aggregates/tickets` - Ticket list with confidence badges
2. `/exceptions` - Top 5 exceptions ranked by impact
3. `/revenue-risk` - Revenue at risk dashboard
4. Ticket detail page - Audit packet generator button

---

## 💬 KEY PHRASES (Use These Exact Words)

### During Demo:

1. **"This ticket looks off"** - Point to confidence badge
2. **"This is why"** - Show tooltip/explanation
3. **"This is what matters today"** - Show exceptions list
4. **"This is the money"** - Show revenue at risk
5. **"This is the proof"** - Show audit packet

### What NOT to Say:

- ❌ "AI-powered"
- ❌ "Machine learning"
- ❌ "Advanced algorithms"
- ❌ "Cutting-edge technology"

### Instead Say:

- ✅ "Historical baseline comparison"
- ✅ "Pattern recognition"
- ✅ "Risk calculation"
- ✅ "Evidence-based analysis"

---

## ✅ FINAL REALITY CHECK

If during a demo you can say:

- ✅ "this ticket looks off"
- ✅ "this is why"
- ✅ "this is what matters today"
- ✅ "this is the money"
- ✅ "this is the proof"

**Then yes — this is real, and yes — people will pay.**

---

## 📝 DEMO ORG QUICK REFERENCE

| Vertical | Org Name | Vertical Type | Key Focus |
|----------|----------|---------------|-----------|
| Aggregates | Acme Aggregates | `aggregates_quarry` | Scale accuracy, audits |
| Construction | ABC Construction | `construction_hauling` | Disputes, driver patterns |
| Waste | Green Waste Solutions | `waste_recycling` | Repeat issues, compliance |
| Ready-Mix | Concrete Express | `ready_mix` | Timing, rejections |

---

## 🚀 PRODUCTION READINESS

### Before First Demo:

1. ✅ Run migration 054 (Acme Aggregates seed)
2. ✅ Verify confidence badges display on tickets
3. ✅ Verify exceptions page loads with data
4. ✅ Verify revenue risk dashboard calculates correctly
5. ✅ Test audit packet generation
6. ✅ Practice demo script out loud
7. ✅ Take screenshots for sales materials

### Deployment Checklist:

- [ ] All migrations applied
- [ ] Demo orgs created
- [ ] Sample data seeded
- [ ] All pages load correctly
- [ ] Confidence scoring works
- [ ] Exceptions queue populated
- [ ] Audit packets generate
- [ ] Screenshots captured

---

**Remember:** Same system. Different emphasis. Maximum impact.
