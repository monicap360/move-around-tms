# Dispatcher Dictation System

## Overview

The Dispatcher Dictation System allows dispatchers to **dictate messages** instead of typing. Messages are converted to text and delivered to drivers as **text or system voice** - drivers **do NOT hear live dispatcher voices**.

**One-Sentence Description:**
"Dispatchers can dictate messages instead of typing, but all communication is delivered as system messages to ensure safety, clarity, and auditability."

## Design Principles

- ✅ **Speech-to-Text Only**: Dispatchers speak, system converts to text
- ✅ **System-Mediated Delivery**: Drivers receive text/system voice, NOT live dispatcher voice
- ✅ **Safety First**: No live voice calls or conversations
- ✅ **Full Auditability**: All messages logged and reviewable
- ✅ **Review Before Send**: Dispatchers review transcribed text (recommended)
- ✅ **Professional Boundaries**: Maintains clear communication channel

## How It Works

### Clean Flow

1. Dispatcher presses "Dictate" button
2. Dispatcher speaks short instruction
3. System converts speech → text (STT)
4. Dispatcher reviews transcribed text (optional but recommended)
5. Dispatcher edits if needed
6. Message is sent
7. Driver receives:
   - Text notification (always)
   - Optional system voice readout (if driver enabled)
   - **NOT live dispatcher voice**

### Message Delivery

**Allowed:**
- ✅ Text message to driver
- ✅ System voice readout (synthetic voice reading the text)
- ✅ Both text + system voice

**NOT Allowed:**
- ❌ Live dispatcher voice calls
- ❌ Dispatcher voice played directly to drivers
- ❌ Voice back-and-forth conversations
- ❌ Anything that bypasses logs or records

## Usage

### Basic Setup

```typescript
import { dictationEngine } from '@/lib/dispatcher-dictation';

// Initialize dictation for dispatcher
const config = dictationEngine.initializeDictation('dispatcher-123', {
  language: 'en-US',
  autoPunctuation: true,
  requireReview: true, // Recommended: review before sending
});
```

### Dictation Workflow

```typescript
// 1. Start dictation session
const sessionId = dictationEngine.startDictation('dispatcher-123');

// 2. Transcribe speech to text
const message = await dictationEngine.transcribeSpeech(
  audioData, // From microphone/audio input
  'dispatcher-123',
  sessionId
);

// 3. Review and edit if needed
const reviewed = dictationEngine.reviewMessage(sessionId, editedText);

// 4. Send to driver (as text/system voice, NOT live voice)
const delivery = await dictationEngine.sendMessage(
  sessionId,
  'driver-456',
  'text' // or 'system_voice' or 'both'
);
```

### Message Delivery Options

```typescript
// Option 1: Text only (default, safest)
await dictationEngine.sendMessage(messageId, driverId, 'text');

// Option 2: System voice only (synthetic voice reads text)
await dictationEngine.sendMessage(messageId, driverId, 'system_voice');

// Option 3: Both text and system voice
await dictationEngine.sendMessage(messageId, driverId, 'both');

// NEVER: Live dispatcher voice
// This is NOT supported and NOT allowed
```

## Safety & Compliance Guardrails

### Enforced Rules

- ✅ **Max message length**: 500 characters (prevents overly long messages)
- ✅ **Review before send**: Optional but recommended (configurable)
- ✅ **Timestamp + sender ID**: All messages logged with metadata
- ✅ **Read receipt**: Track when driver receives/reads message
- ✅ **Acknowledgement**: Driver can acknowledge receipt

### Audit Logging

All dictation actions are logged:
- Dictation started
- Dictation completed (with transcribed text)
- Message sent (with recipient and delivery method)
- Message cancelled

```typescript
// Get audit logs
const logs = dictationEngine.getAuditLogs('dispatcher-123', 100);

// Logs include:
// - Dispatcher ID
// - Action type
// - Message text
// - Recipient
// - Timestamp
// - Delivery method
```

## Why This Design

### Dispatcher Benefits

- ✅ Reduces typing fatigue
- ✅ Speeds up message sending
- ✅ Reduces errors
- ✅ Improves accessibility
- ✅ Does NOT impersonate anyone
- ✅ Normal enterprise software behavior

### Driver Safety

- ✅ No distracting live voice calls
- ✅ Messages are logged and reviewable
- ✅ System voice is clear and consistent
- ✅ Text backup always available
- ✅ No "he said / she said" disputes

### Operational Benefits

- ✅ Full audit trail
- ✅ Clear communication records
- ✅ Professional boundaries maintained
- ✅ Compliance-ready
- ✅ Liability protection

## Implementation Notes

### Speech-to-Text Services

**Production Options:**
- Google Cloud Speech-to-Text
- AWS Transcribe
- Azure Speech Services

**Features Needed:**
- Auto-punctuation
- Multi-language support
- Confidence scoring
- Real-time transcription

### Message Storage

All messages must be:
- Stored in database
- Logged in audit system
- Associated with dispatcher ID
- Timestamped
- Searchable for compliance

### Delivery System

**Text Delivery:**
- Push notification
- In-app message
- SMS (if configured)

**System Voice Delivery:**
- Generate synthetic voice audio (using Voice UI system)
- Play via driver's device
- Text backup always available

## What This System Does NOT Do

- ❌ **Does NOT allow live voice calls**: No real-time voice conversations
- ❌ **Does NOT play dispatcher voice**: Drivers never hear dispatcher's actual voice
- ❌ **Does NOT bypass logging**: All messages must be logged
- ❌ **Does NOT replace typing**: Dispatchers can still type messages
- ❌ **Does NOT auto-send**: Review before send is recommended

## Public Description

If asked about this feature:

**"Dispatchers can dictate messages instead of typing, but all communication is delivered as system messages to ensure safety, clarity, and auditability."**

This is:
- ✅ Honest
- ✅ Professional
- ✅ Safe
- ✅ Truthful

## Best Practices

1. **Require review**: Enable review-before-send by default
2. **Limit message length**: Enforce character limits
3. **Log everything**: Full audit trail is essential
4. **System voice only**: Never deliver as live dispatcher voice
5. **Text backup**: Always provide text version
6. **Clear boundaries**: Maintain professional communication channels
