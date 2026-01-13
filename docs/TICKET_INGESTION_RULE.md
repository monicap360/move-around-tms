# The Only Ticket Rule You Need Internally

## Core Rule

**Ticket ingestion does not fail.**

It either:
- ✅ **Extracts with high confidence**, or
- ✅ **Extracts with low confidence and flags risk.**

This protects you **legally and operationally**.

---

## Why This Rule Exists

### Legal Protection

- **No data loss:** Tickets are never dropped or ignored
- **Audit trail:** Every ticket attempt is logged and tracked
- **Risk disclosure:** Low confidence is flagged, not hidden
- **Compliance:** All attempts are documented for audits

### Operational Protection

- **No silent failures:** Users see what's happening
- **Risk visibility:** Low confidence tickets are clearly marked
- **Manual review queue:** Low confidence tickets go to review
- **Continuous improvement:** Failed extractions are tracked for pattern analysis

---

## Implementation

### High Confidence Extraction

**When:** OCR/extraction succeeds with confidence score ≥ 0.7

**Action:**
- Ticket is created and processed normally
- Confidence badge shows green/yellow
- No manual review required
- Ticket proceeds through normal workflow

### Low Confidence Extraction

**When:** OCR/extraction succeeds but confidence score < 0.7

**Action:**
- Ticket is created with low confidence flag
- Confidence badge shows red/yellow
- Ticket is flagged for manual review
- Anomaly event is created
- Exception is added to review queue
- Ticket processing continues (not blocked)

### Failed Extraction (Never Happens)

**What we DON'T do:**
- ❌ Drop the ticket
- ❌ Return error to user
- ❌ Delete the uploaded file
- ❌ Fail silently

**What we DO:**
- ✅ Store the file with "pending" status
- ✅ Create ticket record with low confidence
- ✅ Flag for manual entry
- ✅ Log extraction attempt
- ✅ Track patterns in failed extractions

---

## Where You Are 100% Safe to Sell Today

You can **confidently sell** to:

### ✅ Safe Use Cases

1. **Aggregates with scale tickets**
   - Clear, printed tickets
   - Standard formats
   - Good image quality
   - High confidence extraction expected

2. **Quarries using legacy scale software**
   - Digital or printed tickets
   - Standardized formats
   - Known patterns
   - Predictable extraction

3. **Mixed paper + digital operations**
   - Some paper tickets (scanned)
   - Some digital tickets
   - Hybrid workflows
   - Manual review for low confidence items

4. **Accounting teams needing reconciliation**
   - Clear ticket images
   - Standard formats
   - High accuracy requirements
   - Manual review capability

---

## What You Should Avoid Promising

You should **avoid promising** (or set clear expectations):

### ❌ Avoid Promising

1. **Handwritten tickets**
   - Low OCR accuracy
   - Unpredictable formats
   - Requires manual entry
   - Set expectation: "Best effort, manual review required"

2. **Extreme low-quality images without review**
   - Blurry photos
   - Poor lighting
   - Cropped/incomplete tickets
   - Set expectation: "Manual review required for low quality"

3. **Zero-touch automation**
   - 100% automated processing
   - No manual review ever
   - Set expectation: "High confidence automation, low confidence review"

---

## Sales Positioning

### What to Say

> "Our system processes tickets with high confidence automatically. If confidence is low, we flag it for your review. You never lose a ticket — you either process it automatically or review it manually."

### What NOT to Say

- ❌ "100% automated, no manual work"
- ❌ "Handles handwritten tickets perfectly"
- ❌ "Works with any image quality"
- ❌ "Zero-touch processing"

### Instead Say

- ✅ "High confidence automation, low confidence review"
- ✅ "Best effort on handwritten, manual review recommended"
- ✅ "Works best with clear images, reviews low quality"
- ✅ "Automated when possible, reviewed when needed"

---

## Technical Implementation

### Confidence Thresholds

- **High Confidence (≥ 0.7):** Green badge, automated processing
- **Medium Confidence (0.5-0.7):** Yellow badge, optional review
- **Low Confidence (< 0.5):** Red badge, required review

### Risk Flagging

- Low confidence tickets are flagged in exception queue
- Confidence events are logged in `data_confidence_events`
- Anomaly events are created for review
- Tickets remain in system (never dropped)

### Manual Review Workflow

1. Low confidence ticket appears in exception queue
2. User reviews ticket details
3. User can:
   - Approve as-is
   - Edit extracted data
   - Re-upload image
   - Mark as resolved
4. Ticket proceeds through normal workflow

---

## Compliance & Audit

### Audit Trail

- All ticket ingestion attempts are logged
- Confidence scores are stored
- Review actions are tracked
- No tickets are lost or dropped

### Legal Protection

- **No data loss:** All tickets are stored
- **Risk disclosure:** Low confidence is clearly marked
- **Review process:** Low confidence items go to review queue
- **Documentation:** All actions are logged

---

## Key Takeaways

1. ✅ **Ticket ingestion never fails** — it either extracts with high confidence or flags risk
2. ✅ **Safe to sell** to aggregates, quarries, mixed operations, accounting teams
3. ✅ **Avoid promising** handwritten, low-quality, zero-touch automation
4. ✅ **Set clear expectations** about confidence levels and review requirements
5. ✅ **Always flag risk** — never hide low confidence extractions

---

**Remember:** This rule protects you legally and operationally while setting clear expectations with customers.
