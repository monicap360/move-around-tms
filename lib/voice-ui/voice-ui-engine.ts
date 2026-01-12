// Voice UI Engine
// Hands-free system interface for driver safety and accessibility
// This is a SPOKEN UI LAYER, not a person replacement

import type {
  VoiceUIConfig,
  VoiceCommand,
  VoiceResponse,
  VoiceInteractionLog,
  VoiceIntentType,
} from './types';

/**
 * Voice UI Engine
 * Provides hands-free interface for routine system interactions
 * IMPORTANT: This is a system interface, not a human replacement
 */
export class VoiceUIEngine {
  private configs: Map<string, VoiceUIConfig> = new Map();
  private interactionLogs: VoiceInteractionLog[] = [];
  private readonly MAX_LOG_HISTORY = 1000;

  /**
   * Initialize voice UI for user
   */
  initializeVoiceUI(userId: string, config: Partial<VoiceUIConfig>): VoiceUIConfig {
    const fullConfig: VoiceUIConfig = {
      userId,
      language: config.language || 'en-US',
      syntheticVoice: config.syntheticVoice || 'system-neutral',
      speed: config.speed || 1.0,
      volume: config.volume || 1.0,
      enableHandsFree: config.enableHandsFree ?? true,
    };
    this.configs.set(userId, fullConfig);
    return fullConfig;
  }

  /**
   * Process voice command (from speech-to-text)
   * Returns structured command with intent
   */
  async processVoiceCommand(
    text: string,
    userId: string,
  ): Promise<VoiceCommand> {
    const lowerText = text.toLowerCase().trim();
    
    // Extract intent (simple pattern matching - no conversational AI)
    const intent = this.extractIntent(lowerText);
    const parameters = this.extractParameters(lowerText, intent);
    const confidence = this.calculateConfidence(lowerText, intent);

    const command: VoiceCommand = {
      command: text,
      intent,
      parameters,
      confidence,
      timestamp: new Date(),
      userId,
    };

    // Log interaction
    this.logInteraction({
      id: this.generateLogId(),
      userId,
      command: text,
      intent,
      response: '', // Will be set when response is generated
      timestamp: new Date(),
      confidence,
      success: confidence > 0.7,
    });

    return command;
  }

  /**
   * Generate system response (short, non-conversational)
   */
  generateSystemResponse(
    command: VoiceCommand,
    systemData?: any,
  ): VoiceResponse {
    let responseText = '';
    let responseType: VoiceResponse['type'] = 'status';
    let requiresConfirmation = false;

    switch (command.intent) {
      case 'check_status':
        responseText = this.generateStatusResponse(systemData);
        responseType = 'status';
        break;

      case 'check_schedule':
        responseText = this.generateScheduleResponse(systemData);
        responseType = 'status';
        break;

      case 'confirm_action':
        responseText = 'Action confirmed.';
        responseType = 'confirmation';
        break;

      case 'submit_ticket':
        responseText = 'Ticket submission started. Please follow prompts.';
        responseType = 'instruction';
        requiresConfirmation = true;
        break;

      case 'get_directions':
        responseText = 'Directions available on dashboard.';
        responseType = 'instruction';
        break;

      case 'report_issue':
        responseText = 'Issue logged. Dispatch will contact you.';
        responseType = 'confirmation';
        requiresConfirmation = true;
        break;

      case 'cancel':
        responseText = 'Cancelled.';
        responseType = 'confirmation';
        break;

      default:
        responseText = 'Command not recognized. Please try again.';
        responseType = 'error';
    }

    // Update log with response
    const lastLog = this.interactionLogs[this.interactionLogs.length - 1];
    if (lastLog && lastLog.userId === command.userId) {
      lastLog.response = responseText;
      lastLog.success = command.intent !== 'cancel' && command.confidence > 0.7;
    }

    return {
      text: responseText,
      type: responseType,
      requiresConfirmation,
      timestamp: new Date(),
    };
  }

  /**
   * Generate TTS audio URL using synthetic voice
   * IMPORTANT: Must use clearly synthetic voice, not human-like
   */
  getSyntheticVoiceURL(text: string, voiceConfig: VoiceUIConfig): string {
    // Use Web Speech API or cloud TTS with synthetic voice settings
    // Key: Voice must be clearly synthetic/system-generated
    
    const params = new URLSearchParams({
      text: encodeURIComponent(text),
      voice: voiceConfig.syntheticVoice || 'system-neutral',
      speed: String(voiceConfig.speed || 1.0),
      volume: String(voiceConfig.volume || 1.0),
      // Force synthetic voice characteristics
      pitch: 'medium',
      rate: 'normal',
      quality: 'synthetic', // Explicitly synthetic
    });

    // API endpoint for synthetic TTS
    return `/api/voice/synthetic-tts?${params.toString()}`;
  }

  /**
   * Get interaction logs for audit
   */
  getInteractionLogs(userId?: string, limit = 100): VoiceInteractionLog[] {
    let logs = [...this.interactionLogs];
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private extractIntent(text: string): VoiceIntentType {
    // Simple pattern matching - no AI/ML, just clear command patterns
    
    if (text.match(/\b(status|what.*status|current.*status)\b/)) {
      return 'check_status';
    }
    if (text.match(/\b(schedule|next.*load|upcoming)\b/)) {
      return 'check_schedule';
    }
    if (text.match(/\b(confirm|yes|okay|approved)\b/)) {
      return 'confirm_action';
    }
    if (text.match(/\b(ticket|submit.*ticket|enter.*ticket)\b/)) {
      return 'submit_ticket';
    }
    if (text.match(/\b(directions|route|navigate|how.*get)\b/)) {
      return 'get_directions';
    }
    if (text.match(/\b(problem|issue|help|report)\b/)) {
      return 'report_issue';
    }
    if (text.match(/\b(cancel|stop|abort)\b/)) {
      return 'cancel';
    }

    return 'check_status'; // Default fallback
  }

  private extractParameters(text: string, intent: VoiceIntentType): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract load ID if mentioned
    const loadMatch = text.match(/\bload\s*([A-Z0-9-]+)/i);
    if (loadMatch) params.loadId = loadMatch[1];

    // Extract ticket number if mentioned
    const ticketMatch = text.match(/\bticket\s*([A-Z0-9-]+)/i);
    if (ticketMatch) params.ticketNumber = ticketMatch[1];

    return params;
  }

  private calculateConfidence(text: string, intent: VoiceIntentType): number {
    // Simple confidence based on pattern match strength
    // No ML/AI - just pattern recognition
    
    const intentPatterns: Record<VoiceIntentType, RegExp[]> = {
      check_status: [/\bstatus\b/i, /\bcurrent\b/i],
      check_schedule: [/\bschedule\b/i, /\bnext\b/i, /\bupcoming\b/i],
      confirm_action: [/\bconfirm\b/i, /\byes\b/i, /\bokay\b/i],
      submit_ticket: [/\bticket\b/i, /\bsubmit\b/i],
      get_directions: [/\bdirections\b/i, /\broute\b/i, /\bnavigate\b/i],
      report_issue: [/\bproblem\b/i, /\bissue\b/i, /\breport\b/i],
      cancel: [/\bcancel\b/i, /\bstop\b/i],
    };

    const patterns = intentPatterns[intent] || [];
    const matches = patterns.filter(pattern => pattern.test(text)).length;
    
    return Math.min(0.95, 0.6 + (matches * 0.15)); // 0.6-0.95 range
  }

  private generateStatusResponse(data?: any): string {
    if (!data) return 'Status check unavailable.';
    
    // Short, factual response
    return `Current status: ${data.status || 'unknown'}.`;
  }

  private generateScheduleResponse(data?: any): string {
    if (!data || !data.nextLoad) {
      return 'No upcoming loads scheduled.';
    }
    
    return `Next load: ${data.nextLoad.id}. Pickup: ${data.nextLoad.pickup || 'TBD'}.`;
  }

  private logInteraction(log: VoiceInteractionLog): void {
    this.interactionLogs.push(log);
    
    // Maintain log history limit
    if (this.interactionLogs.length > this.MAX_LOG_HISTORY) {
      this.interactionLogs = this.interactionLogs.slice(-this.MAX_LOG_HISTORY);
    }
  }

  private generateLogId(): string {
    return `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const voiceUIEngine = new VoiceUIEngine();
