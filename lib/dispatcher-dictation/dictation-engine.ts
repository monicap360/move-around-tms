// Dispatcher Dictation Engine
// Allows dispatchers to dictate messages (speech-to-text)
// Messages are delivered as TEXT or SYSTEM VOICE, NOT live dispatcher voice

import type {
  DictationConfig,
  DictatedMessage,
  MessageDelivery,
  DictationAuditLog,
} from './types';

/**
 * Dispatcher Dictation Engine
 * Converts dispatcher speech to text for messages
 * IMPORTANT: Drivers receive text/system voice, NOT live dispatcher voice
 */
export class DictationEngine {
  private configs: Map<string, DictationConfig> = new Map();
  private messages: Map<string, DictatedMessage> = new Map();
  private deliveries: Map<string, MessageDelivery[]> = new Map();
  private auditLogs: DictationAuditLog[] = [];
  private readonly MAX_AUDIT_HISTORY = 5000;
  private readonly MAX_MESSAGE_LENGTH = 500; // Safety guardrail

  /**
   * Initialize dictation for dispatcher
   */
  initializeDictation(userId: string, config: Partial<DictationConfig>): DictationConfig {
    const fullConfig: DictationConfig = {
      userId,
      language: config.language || 'en-US',
      autoPunctuation: config.autoPunctuation ?? true,
      requireReview: config.requireReview ?? true, // Default: require review
    };
    this.configs.set(userId, fullConfig);
    return fullConfig;
  }

  /**
   * Start dictation session
   */
  startDictation(dispatcherId: string): string {
    const sessionId = this.generateMessageId();
    
    this.logAudit({
      id: this.generateAuditId(),
      timestamp: new Date(),
      dispatcherId,
      action: 'dictation_started',
      messageId: sessionId,
    });

    return sessionId;
  }

  /**
   * Convert speech to text (from audio input)
   * Returns transcribed text with confidence
   */
  async transcribeSpeech(
    audioData: ArrayBuffer | Blob,
    dispatcherId: string,
    sessionId: string,
  ): Promise<DictatedMessage> {
    const audioBlob = audioData instanceof Blob ? audioData : new Blob([audioData]);
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("audio", audioBlob, "dictation.wav");

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/dictation/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Dictation transcribe failed: ${detail}`);
    }

    const result = await response.json();
    const transcribedText = result.transcribedText || "";
    const confidence = result.confidence ?? 0.85;

    const message: DictatedMessage = {
      id: sessionId,
      dispatcherId,
      originalAudio: audioData instanceof Blob ? audioData : undefined,
      transcribedText,
      reviewed: false,
      timestamp: new Date(),
      confidence,
    };

    this.messages.set(sessionId, message);

    this.logAudit({
      id: this.generateAuditId(),
      timestamp: new Date(),
      dispatcherId,
      action: 'dictation_completed',
      messageId: sessionId,
      transcribedText,
      metadata: { confidence },
    });

    return message;
  }

  /**
   * Review and finalize message before sending
   */
  reviewMessage(messageId: string, editedText?: string): DictatedMessage {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Update text if edited
    if (editedText !== undefined) {
      message.transcribedText = editedText;
    }

    // Validate length
    if (message.transcribedText.length > this.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`);
    }

    message.reviewed = true;
    this.messages.set(messageId, message);

    return message;
  }

  /**
   * Send message to driver
   * Message is delivered as TEXT or SYSTEM VOICE, NOT live dispatcher voice
   */
  async sendMessage(
    messageId: string,
    recipientId: string,
    deliveryMethod: 'text' | 'system_voice' | 'both' = 'text',
  ): Promise<MessageDelivery> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Enforce review requirement
    const config = this.configs.get(message.dispatcherId);
    if (config?.requireReview && !message.reviewed) {
      throw new Error('Message must be reviewed before sending');
    }

    // Create delivery record
    const delivery: MessageDelivery = {
      messageId,
      recipientId,
      deliveryMethod,
      deliveredAt: new Date(),
    };

    // Store delivery
    if (!this.deliveries.has(messageId)) {
      this.deliveries.set(messageId, []);
    }
    this.deliveries.get(messageId)!.push(delivery);

    // Log send action
    this.logAudit({
      id: this.generateAuditId(),
      timestamp: new Date(),
      dispatcherId: message.dispatcherId,
      action: 'message_sent',
      messageId,
      recipientId,
      transcribedText: message.transcribedText,
      metadata: { deliveryMethod },
    });

    // In production, this would:
    // 1. Store message in database
    // 2. Send text notification to driver
    // 3. If system_voice: generate synthetic voice audio
    // 4. Deliver via appropriate channel
    // 5. NEVER deliver as live dispatcher voice

    return delivery;
  }

  /**
   * Cancel/delete message before sending
   */
  cancelMessage(messageId: string, dispatcherId: string): void {
    const message = this.messages.get(messageId);
    if (message && message.dispatcherId === dispatcherId) {
      this.messages.delete(messageId);
      
      this.logAudit({
        id: this.generateAuditId(),
        timestamp: new Date(),
        dispatcherId,
        action: 'message_cancelled',
        messageId,
      });
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(dispatcherId?: string, limit = 100): DictationAuditLog[] {
    let logs = [...this.auditLogs];
    
    if (dispatcherId) {
      logs = logs.filter(log => log.dispatcherId === dispatcherId);
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get message delivery status
   */
  getDeliveryStatus(messageId: string): MessageDelivery[] {
    return this.deliveries.get(messageId) || [];
  }

  // Private helper methods

  private logAudit(log: DictationAuditLog): void {
    this.auditLogs.push(log);
    if (this.auditLogs.length > this.MAX_AUDIT_HISTORY) {
      this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_HISTORY);
    }
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const dictationEngine = new DictationEngine();
