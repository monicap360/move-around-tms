# Automation Assistant System

## Overview

The Automation Assistant provides **routine automation support** to help human dispatchers and staff work more efficiently. This system **generates suggestions** - human staff make all final decisions.

**Important Design Principles:**
- ✅ **Assists Humans**: Helps human dispatchers, does not replace them
- ✅ **Suggests Only**: Provides suggestions, never auto-assigns
- ✅ **Human Review Required**: All suggestions require human approval
- ✅ **Audit Logging**: Full logging of all suggestions and decisions
- ✅ **Manual Override**: Human staff can always override suggestions

## Purpose

- **Efficiency**: Reduces routine analysis work for dispatchers
- **Consistency**: Applies rules consistently across all loads
- **Speed**: Quickly analyzes multiple factors
- **Support Tool**: Helps humans make better decisions faster

## How It Works

### Suggestion Generation

The system analyzes loads and drivers to generate **suggestion** lists:

```typescript
import { automationAssistantEngine } from '@/lib/automation-assistant';

// Generate suggestions (NOT assignments)
const result = await automationAssistantEngine.generateSuggestions(
  loads,
  drivers,
  {
    useOptimization: true,
    requireHumanReview: true, // Always true
  }
);

// Result contains SUGGESTIONS only
result.suggestions.forEach(suggestion => {
  console.log(`Load ${suggestion.loadId} → Driver ${suggestion.suggestedDriverId}`);
  console.log(`Confidence: ${suggestion.confidence}`);
  console.log(`Reason: ${suggestion.reason}`);
  console.log(`REQUIRES REVIEW: ${suggestion.requiresReview}`); // Always true
});
```

### Human Review Process

1. **System generates suggestions** with factors and confidence scores
2. **Human dispatcher reviews** each suggestion
3. **Human makes decision**: Accept, reject, or override
4. **System logs decision** for audit trail
5. **Human assigns load** based on their decision

### Logging Human Decisions

```typescript
// When human accepts a suggestion
automationAssistantEngine.logHumanDecision(
  suggestion.loadId,
  'dispatcher-user-123',
  'accepted',
  'Approved based on proximity and driver availability'
);

// When human rejects a suggestion
automationAssistantEngine.logHumanDecision(
  suggestion.loadId,
  'dispatcher-user-123',
  'rejected',
  'Driver has scheduling conflict not visible to system'
);

// When human manually overrides
automationAssistantEngine.logHumanDecision(
  loadId,
  'dispatcher-user-123',
  'override',
  'Manual assignment due to customer preference'
);
```

## Suggestion Factors

The system considers multiple factors when generating suggestions:

- **Geographic Proximity**: Distance from driver to pickup location
- **Driver Performance**: Rating, on-time rate, safety score
- **Availability Windows**: Driver availability vs. load time windows
- **Certifications**: Required certifications match
- **Load Priority**: High-priority loads to high-performing drivers
- **Cost Optimization**: Estimated cost and time

## Audit Logging

All automation actions are logged:

```typescript
// Get audit logs
const logs = automationAssistantEngine.getAuditLogs(100);

// Logs include:
// - Suggestion generated
// - Human decision (accept/reject/override)
// - User ID (who made decision)
// - Timestamp
// - Reason/notes
```

**Audit Log Types:**
- `suggestion_generated`: System created a suggestion
- `suggestion_accepted`: Human accepted suggestion
- `suggestion_rejected`: Human rejected suggestion
- `manual_override`: Human made manual assignment

## Integration Example

```typescript
// 1. System generates suggestions
const suggestions = await automationAssistantEngine.generateSuggestions(
  pendingLoads,
  availableDrivers,
  { requireHumanReview: true }
);

// 2. Present to human dispatcher
// (UI shows suggestions with factors and confidence)

// 3. Human reviews and decides
// (Human clicks Accept/Reject/Override button)

// 4. Log human decision
if (humanDecision === 'accept') {
  automationAssistantEngine.logHumanDecision(
    suggestion.loadId,
    userId,
    'accepted',
    userNotes
  );
  
  // 5. Human dispatcher makes actual assignment
  await assignLoad(suggestion.loadId, suggestion.suggestedDriverId);
}
```

## Safety and Compliance

### Human Control
- ✅ All suggestions require human review
- ✅ Human dispatchers make all final decisions
- ✅ System never auto-assigns loads
- ✅ Manual override always available

### Audit Requirements
- ✅ All suggestions logged
- ✅ All human decisions logged
- ✅ Full audit trail maintained
- ✅ Compliance-ready logging

### Transparency
- ✅ Suggestions show reasoning
- ✅ Factors are visible to humans
- ✅ Confidence scores displayed
- ✅ Clear distinction between suggestion and decision

## What This System Does NOT Do

- ❌ **Does NOT replace dispatchers**: Humans make all decisions
- ❌ **Does NOT auto-assign**: Only generates suggestions
- ❌ **Does NOT make exceptions**: Complex cases handled by humans
- ❌ **Does NOT override humans**: System always defers to human judgment

## Benefits

### For Dispatchers
- Faster analysis of multiple factors
- Consistent rule application
- Reduced routine work
- Better decision support

### For Operations
- Faster load assignment
- More consistent assignments
- Better resource utilization
- Full audit trail

### For Drivers
- Faster assignment decisions
- More consistent treatment
- Better load matches
- Human oversight maintained

## Best Practices

1. **Always require review**: Never auto-approve suggestions
2. **Show reasoning**: Display factors and confidence to humans
3. **Log everything**: Full audit trail is essential
4. **Allow override**: Humans must be able to override
5. **Transparent factors**: Show why suggestion was made
6. **Human control**: System assists, humans decide
