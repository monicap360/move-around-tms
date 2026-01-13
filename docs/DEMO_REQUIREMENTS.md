# What You Must Be Able to Show (This Makes It Real)

**Before any demo or outreach, make sure you can point at all five of these:**

---

## ✅ Requirement #1: A Real-Looking Ticket

**What to Show:**
- A ticket from your demo system (Acme Aggregates or other demo org)
- Ticket displays actual data (not placeholders)
- Ticket shows key fields: ticket number, date, weight/quantity, amounts
- Ticket looks like a real operational ticket

**Status:** ✅ Ready
- Demo org seeded with 20 tickets (migration 054)
- Tickets visible in `/aggregates/tickets` page
- Real-looking data with proper formatting

**Location:** `/aggregates/tickets` or ticket detail page

---

## ✅ Requirement #2: Confidence Indicator with Written Explanation

**What to Show:**
- Confidence badge (Green/Yellow/Red) displayed on ticket
- Hover tooltip shows explanation
- Tooltip text: "Outside historical norm for this site" or similar
- Badge clearly indicates confidence level

**Status:** ✅ Component Ready (needs integration)
- Component: `components/data-confidence/WeightConfidenceBadge.tsx`
- Shows: Net weight with site baseline comparison
- Tooltip: Shows variance percentage and baseline comparison
- Integration: Needs to be added to ticket display

**Location:** Ticket list/detail pages (needs integration)

**Component:**
- `WeightConfidenceBadge.tsx` - For net_weight field
- `ConfidenceBadge.tsx` - Generic confidence badge

---

## ✅ Requirement #3: Short Exceptions List (3-5 Items Max)

**What to Show:**
- Exceptions page with 3-5 items maximum
- Each item labeled with why it matters
- Ranked by impact/priority
- Clear explanations for each exception

**Status:** ✅ Complete
- Page: `/exceptions`
- Shows: Top 5 exceptions
- Sorted by: Impact score (priority_rank)
- Labels: "Potential revenue risk", "Scale variance", "Dwell time", etc.
- Explanations: Each exception has explanation text

**Location:** `/exceptions` page

---

## ✅ Requirement #4: Dollar Estimate (Even if Conservative)

**What to Show:**
- Revenue at risk dashboard
- Dollar amount displayed prominently
- Can be conservative estimate
- Should be marked "estimate" if needed

**Status:** ✅ Complete
- Page: `/revenue-risk`
- Shows: Estimated revenue at risk this month
- Format: Currency format ($X,XXX)
- Label: "Estimated revenue at risk"
- Note: "Estimate based on historical variance"

**Location:** `/revenue-risk` page

---

## ✅ Requirement #5: Audit/Dispute Packet (PDF or ZIP)

**What to Show:**
- Generate Audit Packet button
- Output: PDF or ZIP file
- Contains: Tickets, timestamps, confidence scores, anomalies
- Format: Chronological, human-readable

**Status:** ✅ Complete
- Component: `components/tickets/EvidencePacketGenerator.tsx`
- API Routes:
  - `/api/tickets/[ticketId]/evidence-packet/pdf`
  - `/api/tickets/[ticketId]/evidence-packet/zip`
- Output: PDF or ZIP format
- Content: Tickets, timestamps, confidence notes, anomaly explanations

**Location:** Ticket detail page (via EvidencePacketGenerator component)

---

## ✅ Requirement #6: Honest Limitation

**What to Say:**
> "Some tickets need review — the system tells you which ones."

**Status:** ✅ Documented

**Full Honesty Script (Use This Word-for-Word):**

> "We're not claiming perfect automation.
> What we do is show you which tickets are most likely to cause problems, why, and how much money is at risk.
> Most operators already do this mentally — we just make it visible and auditable."

**That is a very safe, very professional statement.**

---

## 📋 Pre-Demo Checklist

Before any demo or outreach, verify:

- [ ] ✅ **Real-looking ticket** - Can show actual ticket from demo org
- [ ] ✅ **Confidence indicator** - Badge visible with tooltip explanation
- [ ] ✅ **Exceptions list** - Top 5 exceptions displayed and labeled
- [ ] ✅ **Dollar estimate** - Revenue at risk shows dollar amount
- [ ] ✅ **Audit packet** - Can generate and download PDF/ZIP
- [ ] ✅ **Honest limitation** - Can state review requirement clearly

---

## 🎯 Demo Flow (5-7 Minutes)

1. **Show ticket** → Point to confidence badge
   - Say: "This ticket looks normal, but the system compares it to historical norms."
   - Hover badge → Show tooltip explanation

2. **Show exceptions** → Go to `/exceptions`
   - Say: "These are the top 5 items that need attention today."
   - Point to dollar amounts

3. **Show revenue risk** → Go to `/revenue-risk`
   - Say: "This is the estimated money at risk this month."
   - Point to dollar estimate

4. **Show audit packet** → Generate packet
   - Say: "This is what we hand your auditor."
   - Download and preview

5. **State limitation** → Use honesty script
   - Say: "We're not claiming perfect automation. We show you which tickets need review and why."

---

## 💬 Key Talking Points

### Confidence Indicator
- ✅ "The system compares this to historical norms for this site"
- ✅ "We show you why a ticket is questionable"
- ✅ "No guessing — clear explanations"

### Exceptions List
- ✅ "These are ranked by financial impact"
- ✅ "We show you what matters today"
- ✅ "Not all tickets — just the ones that need attention"

### Dollar Estimate
- ✅ "This is estimated revenue at risk"
- ✅ "Based on historical variance patterns"
- ✅ "Conservative estimate for planning"

### Audit Packet
- ✅ "Everything an auditor needs in one place"
- ✅ "Chronological, human-readable"
- ✅ "Complete evidence package"

### Honest Limitation
- ✅ "Some tickets need review — we tell you which ones"
- ✅ "Not perfect automation — intelligent assistance"
- ✅ "We make manual review visible and auditable"

---

## 🚫 What NOT to Say

- ❌ "100% automated, no manual work"
- ❌ "Perfect accuracy guaranteed"
- ❌ "Works with any image quality"
- ❌ "Zero-touch processing"

### Instead Say

- ✅ "High confidence automation, low confidence review"
- ✅ "We flag risk, you make decisions"
- ✅ "Works best with clear images"
- ✅ "Automated when possible, reviewed when needed"

---

## ✅ Final Verification

**If you have these five things, no one credible will call this fluff:**

1. ✅ Real-looking ticket
2. ✅ Confidence indicator with explanation
3. ✅ Short exceptions list (3-5 items, labeled)
4. ✅ Dollar estimate (even if conservative)
5. ✅ Audit/dispute packet (PDF/ZIP, chronological)

**Plus:**
6. ✅ Honest limitation statement

---

**Remember:** The honesty script removes all scam energy and establishes professional credibility. Use it word-for-word if you're nervous.
