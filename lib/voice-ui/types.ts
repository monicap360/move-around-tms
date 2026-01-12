// Voice UI System Types
// Hands-free interface for driver safety and accessibility
// This is a SYSTEM INTERFACE, not a person replacement

export interface VoiceUIConfig {
  userId: string;
  language: string;
  syntheticVoice?: string; // Must be clearly synthetic (e.g., 'system-male', 'system-female')
  speed?: number;
  volume?: number;
  enableHandsFree?: boolean;
}

export interface VoiceCommand {
  command: string;
  intent: VoiceIntentType;
  parameters?: Record<string, any>;
  confidence: number;
  timestamp: Date;
  userId: string;
}

// Approved command whitelist (v1)
export type VoiceIntentType =
  | 'check_current_load'
  | 'check_next_load'
  | 'check_status'
  | 'check_issues'
  | 'mark_arriving'
  | 'mark_loaded'
  | 'mark_finished'
  | 'mark_complete'
  | 'submit_ticket'
  | 'upload_ticket'
  | 'ticket_submitted'
  | 'check_compliance'
  | 'check_violations'
  | 'check_flags'
  | 'repeat'
  | 'cancel'
  | 'help'
  | 'unknown'; // Commands outside whitelist

export interface VoiceResponse {
  text: string;
  audioURL?: string;
  type: 'status' | 'confirmation' | 'error' | 'instruction';
  requiresConfirmation?: boolean;
  timestamp: Date;
  safeForDriving?: boolean; // Can be read while vehicle moving
}

export interface VoiceInteractionLog {
  id: string;
  userId: string;
  command: string;
  intent: VoiceIntentType;
  response: string;
  timestamp: Date;
  confidence: number;
  success: boolean;
  requiresHumanReview?: boolean;
  vehicleMoving?: boolean; // If known
}

// Synthetic voice options (clearly system-generated, not human)
export const SYNTHETIC_VOICES = {
  'system-male': {
    name: 'System Male',
    description: 'Synthetic male voice for system announcements',
    provider: 'system',
  },
  'system-female': {
    name: 'System Female',
    description: 'Synthetic female voice for system announcements',
    provider: 'system',
  },
  'system-neutral': {
    name: 'System Neutral',
    description: 'Neutral synthetic voice for system announcements',
    provider: 'system',
  },
} as const;

// Approved command whitelist (commands that drivers can use)
export const APPROVED_VOICE_COMMANDS: Record<VoiceIntentType, string[]> = {
  check_current_load: ['what is my current load', 'current load', 'my load'],
  check_next_load: ['what is my next load', 'next load'],
  check_status: ['what is my status', 'my status', 'status'],
  check_issues: ['any issues with my load', 'issues', 'problems'],
  mark_arriving: ['i am arriving', 'arriving', 'i arrived'],
  mark_loaded: ['i am loaded', 'loaded', 'loading complete'],
  mark_finished: ['i am finished', 'finished'],
  mark_complete: ['mark load complete', 'complete'],
  submit_ticket: ['submit ticket', 'submit a ticket'],
  upload_ticket: ['upload ticket now', 'upload ticket'],
  ticket_submitted: ['ticket submitted'],
  check_compliance: ['am i clear', 'clear status'],
  check_violations: ['any violations', 'violations'],
  check_flags: ['any flags today', 'flags'],
  repeat: ['repeat', 'say again'],
  cancel: ['cancel', 'stop'],
  help: ['help'],
  unknown: [], // Commands not in whitelist
};
