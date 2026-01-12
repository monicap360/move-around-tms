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

export type VoiceIntentType =
  | 'check_status'
  | 'check_schedule'
  | 'confirm_action'
  | 'submit_ticket'
  | 'get_directions'
  | 'report_issue'
  | 'cancel';

export interface VoiceResponse {
  text: string;
  audioURL?: string;
  type: 'status' | 'confirmation' | 'error' | 'instruction';
  requiresConfirmation?: boolean;
  timestamp: Date;
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
