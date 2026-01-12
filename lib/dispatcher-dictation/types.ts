// Dispatcher Dictation System Types
// Speech-to-Text for dispatchers (NOT live voice to drivers)

export interface DictationConfig {
  userId: string;
  language: string;
  autoPunctuation?: boolean;
  requireReview?: boolean; // Recommended: review before sending
}

export interface DictatedMessage {
  id: string;
  dispatcherId: string;
  originalAudio?: ArrayBuffer | Blob;
  transcribedText: string;
  reviewed: boolean; // Has dispatcher reviewed before sending
  timestamp: Date;
  confidence?: number;
}

export interface MessageDelivery {
  messageId: string;
  recipientId: string;
  deliveryMethod: 'text' | 'system_voice' | 'both';
  deliveredAt?: Date;
  readAt?: Date;
  acknowledged?: boolean;
}

export interface DictationAuditLog {
  id: string;
  timestamp: Date;
  dispatcherId: string;
  action: 'dictation_started' | 'dictation_completed' | 'message_sent' | 'message_cancelled';
  messageId?: string;
  recipientId?: string;
  transcribedText?: string;
  metadata?: Record<string, any>;
}
