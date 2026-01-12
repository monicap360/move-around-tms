# Hands-Free Voice Interface — Technical Specification

## Overview

The Hands-Free Voice Interface enables drivers to interact with MoveAround safely when texting is not possible (while driving or working). This is a **system-generated voice interface** designed for accessibility and safety.

**One-Sentence Description:**
"MoveAround includes a hands-free, system-generated voice interface that allows drivers to interact safely with routine workflows when texting is not possible."

## Design Principles (Non-Negotiable)

- ✅ **Safety First**: Enables hands-free operation for drivers
- ✅ **Synthetic Voice Only**: Uses clearly system-generated voices (not human-like)
- ✅ **Spoken UI Layer**: This is an interface tool, not a person replacement
- ✅ **Human Oversight**: All actions require human review and approval
- ✅ **Audit Logging**: Full logging of all voice interactions
- ✅ **Manual Override**: Human staff can always override system suggestions
- ✅ **No Conversational AI**: Command-based, deterministic interactions
- ✅ **No Emotional Language**: Factual, neutral responses only
- ✅ **No Autonomous Decisions**: System provides information, humans decide

## Supported Users

### ✅ Allowed (v1)
- Drivers (primary)
- Optional: Yard workers / field operators

### ❌ Not Supported (v1)
- Dispatch staff
- Admin users
- Management

## Supported Environments

- Mobile app (primary)
- ELD / in-cab device (future)
- Bluetooth headset compatible
- Voice feature must not require screen interaction

## Activation Rules

### Voice Activation
- Push-to-talk button
- Optional wake phrase (system-defined, not human name)

### Safety Guardrails
- Voice automatically limits response length while vehicle is moving
- System limits response length while driving
- Complex info deferred until parked
- Long responses disabled automatically when vehicle moving

## Approved Voice Command Whitelist (v1)

### Status & Load Commands
- "What is my current load?"
- "What is my next load?"
- "What is my status?"
- "Any issues with my load?"

### Workflow Actions
- "I am arriving"
- "I am loaded"
- "I am finished"
- "Mark load complete"

### Ticket Handling
- "Submit ticket"
- "Upload ticket now"
- "Ticket submitted"

### Compliance & Alerts
- "Am I clear?"
- "Any violations?"
- "Any flags today?"

### Help
- "Repeat"
- "Cancel"
- "Help"

**Any command outside this list is rejected politely.**

## System Voice Responses (Rules)

Responses must be:
- ✅ Factual
- ✅ Neutral
- ✅ Short
- ✅ Instructional

### Example Response
"Load 4832. Destination: Pit 7. Status: Clear."

### Disallowed Response Types
- ❌ Opinions
- ❌ Suggestions beyond system rules
- ❌ Emotional phrasing
- ❌ Humor
- ❌ Human-like conversation

## Command Design Philosophy

- **Short**: Brief, clear commands
- **Deterministic**: Same command = same result
- **Command-based**: Think voice buttons, not chat
- **No open-ended dialogue**: No back-and-forth conversation
- **No conversational AI**: Simple pattern matching only

## Usage

### Basic Setup

```typescript
import { voiceUIEngine, SYNTHETIC_VOICES } from '@/lib/voice-ui';

// Initialize voice UI for driver
const config = voiceUIEngine.initializeVoiceUI('driver-123', {
  language: 'en-US',
  syntheticVoice: 'system-neutral', // Must be synthetic
  speed: 1.0,
  volume: 1.0,
  enableHandsFree: true,
});
```

### Processing Voice Commands

```typescript
// Process voice command (ONLY accepts whitelisted commands)
const command = await voiceUIEngine.processVoiceCommand(
  'what is my current load',
  'driver-123'
);

// Generate system response
const response = voiceUIEngine.generateSystemResponse(
  command,
  {
    currentLoad: {
      id: 'L4832',
      destination: 'Pit 7',
      status: 'assigned'
    }
  },
  vehicleMoving = false // Safety guardrail
);

// Get synthetic voice audio URL
const audioURL = voiceUIEngine.getSyntheticVoiceURL(response.text, config);
```

### Audit Logging

```typescript
// Get interaction logs (required for audit)
const logs = voiceUIEngine.getInteractionLogs('driver-123', 50);

// Logs include:
// - Command text
// - Intent recognized
// - Response generated
// - Confidence score
// - Timestamp
// - Success/failure
// - Vehicle moving status
```

## Error Handling

When uncertain:
- Ask for confirmation
- Or respond with: "I can't complete that request. Please check the app when safe."
- **Never guess**

Commands outside whitelist:
- Response: "I can't complete that request. Please check the app when safe."
- Logged as 'unknown' intent

## Permissions & Security

- Driver can only access their own data
- Voice actions respect role-based access control
- Sensitive data (pay, disputes) summarized only
- No personal data read aloud unless explicitly allowed

## Dispatch & Staff Relationship

Voice feature:
- Handles routine interactions only
- Surfaces exceptions to humans
- Does not override dispatcher authority

Dispatch remains:
- Oversight
- Escalation
- Judgment
- Relationship management

## What Is Explicitly Out of Scope (v1)

- ❌ Live avatars
- ❌ Conversational AI
- ❌ Negotiation
- ❌ Emotional support
- ❌ Multi-step dialogue trees
- ❌ Replacing human roles
- ❌ Visual assistants

## Naming (Use Consistently)

**Recommended:**
- Hands-Free Voice Interface
- Voice-Enabled Driver Workflow
- System Voice Commands

**Do NOT use:**
- AI Dispatcher
- Virtual Dispatcher
- Digital Employee
- Virtual Assistant

## Safety & Compliance

### Human Control
- ✅ All voice-initiated actions require human review
- ✅ Suggestions are presented to dispatchers for approval
- ✅ Manual override always available
- ✅ Human staff maintain final decision authority

### Audit Requirements
- ✅ All voice interactions are logged
- ✅ Logs include command, intent, response, confidence, vehicle status
- ✅ Logs are retained for compliance review
- ✅ Human review flags for low-confidence commands

### Synthetic Voice Requirements
- ✅ Must use clearly synthetic/system voices
- ✅ No imitation of real person voices
- ✅ Voice must be clearly identifiable as system-generated
- ✅ Optimized for clarity and safety over naturalness

## Implementation Notes

### Speech-to-Text
- Use Web Speech API (browser) or cloud STT services (production)
- Configure for hands-free operation (push-to-talk or wake phrase)
- Handle noise cancellation for vehicle environments
- Support multiple languages

### Text-to-Speech
- Use cloud TTS services with synthetic voice settings
- Google Cloud TTS: Use "Neural2" voices with synthetic characteristics
- AWS Polly: Use "Neural" voices with system voice settings
- Azure Speech: Use "Neural" voices with synthetic parameters
- **Must be clearly synthetic, not human-like**

### Command Recognition
- Pattern-based recognition (no conversational AI)
- Only accepts commands from approved whitelist
- Clear command patterns for safety
- Confidence scoring for reliability
- Error handling for unclear commands

## Best Practices

1. **Keep responses short**: Drivers need quick, clear information
2. **Limit length while driving**: Automatically truncate long responses
3. **Use confirmation**: Critical actions require explicit confirmation
4. **Log everything**: Full audit trail is required
5. **Human review**: Low-confidence commands flagged for review
6. **Clear synthetic voice**: Must be obviously system-generated
7. **Safety first**: Design for hands-free, distracted-free operation
8. **Whitelist only**: Reject commands not in approved list

## Limitations

- **Not a replacement**: This is a UI tool, not a person replacement
- **Routine interactions only**: Complex decisions require human staff
- **Requires confirmation**: Critical actions need explicit approval
- **Human oversight**: All suggestions reviewed by human dispatchers
- **Audit required**: All interactions logged for compliance
- **Whitelist only**: Only approved commands are accepted
