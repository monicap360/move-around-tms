// Voice AI System Types

export interface VoiceConfig {
  userId: string;
  language: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  enableWakeWord?: boolean;
  wakeWord?: string;
}

export interface VoiceMessage {
  userId: string;
  text: string;
  audioData?: ArrayBuffer;
  duration?: number;
  timestamp: Date;
  type: 'command' | 'question' | 'response' | 'notification';
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
  intent?: VoiceIntent;
}

export interface VoiceIntent {
  type: 'assign_load' | 'update_status' | 'report_issue' | 'request_info' | 'navigation' | 'communication';
  confidence: number;
  parameters: Record<string, any>;
  entities?: VoiceEntity[];
}

export interface VoiceEntity {
  type: 'load_id' | 'driver_id' | 'location' | 'status' | 'time' | 'number';
  value: any;
  confidence: number;
}

export interface TextToSpeechOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface SpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}
