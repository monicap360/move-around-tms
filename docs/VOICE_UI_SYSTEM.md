# Voice UI System

## Overview

The Voice UI System provides a **hands-free, safety-focused interface** for drivers and staff. This is a **system-generated voice interface** designed for accessibility and safety when hands-free operation is required.

**Important Design Principles:**
- ✅ **Safety First**: Enables hands-free operation for drivers
- ✅ **Synthetic Voice Only**: Uses clearly system-generated voices (not human-like)
- ✅ **Spoken UI Layer**: This is an interface tool, not a person replacement
- ✅ **Human Oversight**: All actions require human review and approval
- ✅ **Audit Logging**: Full logging of all voice interactions
- ✅ **Manual Override**: Human staff can always override system suggestions

## Purpose

- **Safety**: Drivers cannot safely text while driving - voice enables hands-free operation
- **Accessibility**: Provides alternative interaction method for all users
- **Efficiency**: Quick status checks and confirmations without manual interaction
- **Routine Automation**: Handles simple, routine system interactions only

## Voice Interface Design

### Synthetic Voice Characteristics

The system uses **clearly synthetic voices** that are:
- System-generated (not human-like)
- Consistent and clear
- Optimized for clarity over naturalness
- Clearly identifiable as a computer/system voice

Available synthetic voices:
- `system-male`: Synthetic male system voice
- `system-female`: Synthetic female system voice
- `system-neutral`: Neutral synthetic system voice

### Command Structure

Commands are **short, clear, and non-conversational**:
- "Check status"
- "Check schedule"
- "Submit ticket"
- "Get directions"
- "Report issue"
- "Cancel"

Responses are **brief and factual**:
- "Current status: assigned. Next pickup: 2:30 PM."
- "Ticket submission started. Please follow prompts."
- "Issue logged. Dispatch will contact you."

## Usage

### Basic Setup

```typescript
import { voiceUIEngine, SYNTHETIC_VOICES } from '@/lib/voice-ui';

// Initialize voice UI for user
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
// Process voice command (from speech-to-text)
const command = await voiceUIEngine.processVoiceCommand(
  'check status',
  'driver-123'
);

// Generate system response
const response = voiceUIEngine.generateSystemResponse(command, {
  status: 'assigned',
  nextLoad: { id: 'L123', pickup: '123 Main St' }
});

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
```

## Supported Commands

### Check Status
- **Command**: "Check status", "What's my status"
- **Response**: Current assignment status and next action
- **Example**: "Current status: assigned. Next pickup: 2:30 PM."

### Check Schedule
- **Command**: "Check schedule", "What's next"
- **Response**: Upcoming loads and schedule
- **Example**: "Next load: L123. Pickup: 123 Main St at 2:30 PM."

### Submit Ticket
- **Command**: "Submit ticket", "Enter ticket"
- **Response**: Instructions for ticket submission
- **Example**: "Ticket submission started. Please follow prompts."
- **Note**: Initiates ticket flow - requires confirmation

### Get Directions
- **Command**: "Get directions", "Navigate to pickup"
- **Response**: Directs to navigation interface
- **Example**: "Directions available on dashboard."

### Report Issue
- **Command**: "Report issue", "I have a problem"
- **Response**: Confirmation that issue is logged
- **Example**: "Issue logged. Dispatch will contact you."
- **Note**: Creates log entry for human review

### Confirm Action
- **Command**: "Confirm", "Yes", "Okay"
- **Response**: Confirmation acknowledgment
- **Example**: "Action confirmed."

### Cancel
- **Command**: "Cancel", "Stop"
- **Response**: Cancellation confirmation
- **Example**: "Cancelled."

## Integration with Automation Assistant

The Voice UI works with the Automation Assistant system:

```typescript
import { automationAssistantEngine } from '@/lib/automation-assistant';

// Generate suggestions (requires human review)
const result = await automationAssistantEngine.generateSuggestions(
  loads,
  drivers,
  { requireHumanReview: true } // Always true
);

// All suggestions require human dispatcher approval
// System only provides suggestions, never auto-assigns
```

## Safety and Compliance

### Human Oversight
- ✅ All voice-initiated actions require human review
- ✅ Suggestions are presented to dispatchers for approval
- ✅ Manual override always available
- ✅ Human staff maintain final decision authority

### Audit Requirements
- ✅ All voice interactions are logged
- ✅ Logs include command, intent, response, confidence
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
- Configure for hands-free operation (continuous listening)
- Handle noise cancellation for vehicle environments
- Support multiple languages

### Text-to-Speech
- Use cloud TTS services with synthetic voice settings
- Google Cloud TTS: Use "Neural2" voices with synthetic characteristics
- AWS Polly: Use "Neural" voices with system voice settings
- Azure Speech: Use "Neural" voices with synthetic parameters

### Command Recognition
- Pattern-based recognition (no conversational AI)
- Clear command patterns for safety
- Confidence scoring for reliability
- Error handling for unclear commands

## Best Practices

1. **Keep responses short**: Drivers need quick, clear information
2. **Use confirmation**: Critical actions require explicit confirmation
3. **Log everything**: Full audit trail is required
4. **Human review**: Low-confidence commands flagged for review
5. **Clear synthetic voice**: Must be obviously system-generated
6. **Safety first**: Design for hands-free, distracted-free operation

## Limitations

- **Not a replacement**: This is a UI tool, not a person replacement
- **Routine interactions only**: Complex decisions require human staff
- **Requires confirmation**: Critical actions need explicit approval
- **Human oversight**: All suggestions reviewed by human dispatchers
- **Audit required**: All interactions logged for compliance

## Future Enhancements

- Noise cancellation for vehicle environments
- Wake word detection ("Hey system" or similar)
- Multi-language support expansion
- Offline mode for areas with poor connectivity
- Integration with vehicle systems (hands-free buttons)
