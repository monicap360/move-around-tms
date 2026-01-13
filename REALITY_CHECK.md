# The Anti-Scam Checklist

**Use this checklist before every demo, sales call, or customer interaction.**

If every item is checked, you are safe.

---

## ✅ Pre-Demo/Sales Checklist

- [ ] We do not claim full automation
- [ ] We do not promise perfect OCR
- [ ] We show confidence, not certainty
- [ ] We always show explanations
- [ ] We always show artifacts (PDF, list, ticket)
- [ ] We clearly state limitations
- [ ] We never replace existing systems

---

## 📋 Detailed Explanations

### ✅ We do not claim full automation

**What this means:**
- We don't say "100% automated"
- We don't promise "zero-touch processing"
- We acknowledge manual review is sometimes needed
- We position as "intelligent assistance" not "full replacement"

**What to say instead:**
- ✅ "High confidence automation, low confidence review"
- ✅ "Automated when possible, reviewed when needed"
- ✅ "We flag risk, you make decisions"

**What NOT to say:**
- ❌ "Fully automated"
- ❌ "Zero-touch processing"
- ❌ "No manual work required"

---

### ✅ We do not promise perfect OCR

**What this means:**
- We don't guarantee 100% accuracy
- We acknowledge OCR has limitations
- We show confidence scores, not guarantees
- We explain when review is needed

**What to say instead:**
- ✅ "High confidence extraction with confidence scores"
- ✅ "Works best with clear, printed tickets"
- ✅ "Low confidence items flagged for review"

**What NOT to say:**
- ❌ "Perfect OCR accuracy"
- ❌ "Works with any image quality"
- ❌ "100% extraction accuracy"

---

### ✅ We show confidence, not certainty

**What this means:**
- Confidence badges (Green/Yellow/Red)
- Confidence scores (0-1 scale)
- Tooltips with explanations
- Variance percentages from baseline

**What to show:**
- ✅ Confidence badges on tickets
- ✅ Tooltip explanations
- ✅ Baseline comparisons
- ✅ Variance percentages

**Implementation:**
- `WeightConfidenceBadge.tsx` - Shows confidence with tooltip
- `ConfidenceBadge.tsx` - Generic confidence display
- Confidence scores stored in `data_confidence_events`

---

### ✅ We always show explanations

**What this means:**
- Every confidence badge has tooltip explanation
- Every exception has explanation text
- Every anomaly has reason description
- No black-box decisions

**What to show:**
- ✅ "Outside historical norm for this site"
- ✅ "Net weight deviates 103% from baseline"
- ✅ "Extended site delay - efficiency impact"
- ✅ Clear, human-readable explanations

**Implementation:**
- Tooltips on confidence badges
- Explanation text in exception queue
- Anomaly event descriptions
- Audit packet narratives

---

### ✅ We always show artifacts (PDF, list, ticket)

**What this means:**
- Real tickets visible in system
- Exceptions list with data
- Audit packets downloadable (PDF/ZIP)
- Revenue estimates with numbers
- Nothing is hidden or abstract

**What to show:**
- ✅ Real-looking ticket from demo org
- ✅ Exceptions list (3-5 items) with dollar amounts
- ✅ Revenue at risk dashboard with estimate
- ✅ Audit packet (PDF or ZIP) that can be downloaded
- ✅ Confidence badges with explanations

**Implementation:**
- `/aggregates/tickets` - Ticket list
- `/exceptions` - Exceptions list
- `/revenue-risk` - Revenue dashboard
- `EvidencePacketGenerator` - Audit packet component

---

### ✅ We clearly state limitations

**What this means:**
- We acknowledge review requirements
- We explain confidence thresholds
- We set expectations about image quality
- We don't over-promise

**What to say:**
- ✅ "Some tickets need review — the system tells you which ones"
- ✅ "Works best with clear, printed tickets"
- ✅ "Low confidence items require manual verification"
- ✅ "We're not claiming perfect automation"

**The Honesty Script (Word-for-Word):**

> "We're not claiming perfect automation.
> What we do is show you which tickets are most likely to cause problems, why, and how much money is at risk.
> Most operators already do this mentally — we just make it visible and auditable."

---

### ✅ We never replace existing systems

**What this means:**
- We sit above operations, not replace them
- We complement existing systems
- We provide intelligence layer
- We don't require system replacement

**What to say:**
- ✅ "We sit above your operations to analyze risk"
- ✅ "We complement your existing scale/dispatch systems"
- ✅ "We don't replace your scale — we prove it"
- ✅ "We analyze your data, you keep your systems"

**What NOT to say:**
- ❌ "Replace your current system"
- ❌ "Rip and replace your dispatch"
- ❌ "We're a complete TMS replacement"

---

## 🎯 How to Use This Checklist

### Before Every Demo:

1. Review each item
2. Check off each requirement
3. If any item is unchecked, fix it before demo
4. Use this as pre-flight checklist

### During Sales Calls:

1. Reference this checklist internally
2. Use honesty script when appropriate
3. Show artifacts (tickets, lists, PDFs)
4. State limitations clearly

### In Documentation:

1. Include this checklist in sales materials
2. Reference in demo scripts
3. Use for team training
4. Update as needed

---

## 💬 Key Talking Points (Safe Version)

### Confidence, Not Certainty:
> "We show confidence scores, not guarantees. High confidence means automated processing. Low confidence means review required."

### Explanations Always:
> "Every flag comes with an explanation. We tell you why something is questionable, not just that it is."

### Artifacts Visible:
> "You can see the tickets, the exceptions list, the dollar estimates, and download audit packets. Nothing is hidden."

### Limitations Stated:
> "Some tickets need review. We tell you which ones. That's honest and professional."

### Complementary, Not Replacement:
> "We sit above your operations. We don't replace your systems — we make them smarter."

---

## ✅ Final Verification

**If every item is checked, you are safe.**

Before any customer interaction, verify:

- [ ] ✅ We do not claim full automation
- [ ] ✅ We do not promise perfect OCR
- [ ] ✅ We show confidence, not certainty
- [ ] ✅ We always show explanations
- [ ] ✅ We always show artifacts (PDF, list, ticket)
- [ ] ✅ We clearly state limitations
- [ ] ✅ We never replace existing systems

**If all checked: You're ready to demo.**

**If any unchecked: Fix it before proceeding.**

---

## 🚨 Red Flags (Stop If You See These)

If you find yourself:
- ❌ Promising 100% automation
- ❌ Claiming perfect accuracy
- ❌ Hiding limitations
- ❌ Not showing explanations
- ❌ Promising system replacement

**Stop. Reset. Use honesty script. Start over.**

---

**Remember:** This checklist protects you legally and builds trust professionally. Use it religiously.
