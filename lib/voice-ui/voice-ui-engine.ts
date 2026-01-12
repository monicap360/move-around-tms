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
import { APPROVED_VOICE_COMMANDS } from './types';

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
   * ONLY accepts commands from approved whitelist
   */
  async processVoiceCommand(
    text: string,
    userId: string,
  ): Promise<VoiceCommand> {
    const lowerText = text.toLowerCase().trim();
    
    // Extract intent (ONLY from approved whitelist)
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
      success: intent !== 'unknown' && confidence > 0.7,
    });

    return command;
  }

  /**
   * Generate system response (short, factual, neutral)
   * Responses are designed to be safe for driving
   */
  generateSystemResponse(
    command: VoiceCommand,
    systemData?: any,
    vehicleMoving?: boolean,
  ): VoiceResponse {
    let responseText = '';
    let responseType: VoiceResponse['type'] = 'status';
    let requiresConfirmation = false;
    let safeForDriving = true;

    // Reject commands not in whitelist
    if (command.intent === 'unknown') {
      return {
        text: "I can't complete that request. Please check the app when safe.",
        type: 'error',
        timestamp: new Date(),
        safeForDriving: true,
      };
    }

    // Limit response length if vehicle is moving
    const maxResponseLength = vehicleMoving ? 50 : 200;

    switch (command.intent) {
      case 'check_current_load':
        responseText = this.generateLoadResponse(systemData?.currentLoad, maxResponseLength);
        responseType = 'status';
        break;

      case 'check_next_load':
        responseText = this.generateLoadResponse(systemData?.nextLoad, maxResponseLength, 'next');
        responseType = 'status';
        break;

      case 'check_status':
        responseText = this.generateStatusResponse(systemData, maxResponseLength);
        responseType = 'status';
        break;

      case 'check_issues':
        responseText = this.generateIssuesResponse(systemData?.issues, maxResponseLength);
        responseType = 'status';
        break;

      case 'mark_arriving':
      case 'mark_loaded':
      case 'mark_finished':
      case 'mark_complete':
        responseText = 'Action confirmed.';
        responseType = 'confirmation';
        requiresConfirmation = true;
        break;

      case 'submit_ticket':
      case 'upload_ticket':
        responseText = 'Ticket submission started. Please follow prompts.';
        responseType = 'instruction';
        requiresConfirmation = true;
        safeForDriving = false; // Requires interaction
        break;

      case 'ticket_submitted':
        responseText = 'Ticket submitted.';
        responseType = 'confirmation';
        break;

      case 'check_compliance':
      case 'check_violations':
      case 'check_flags':
        responseText = this.generateComplianceResponse(systemData?.compliance, maxResponseLength);
        responseType = 'status';
        break;

      case 'repeat':
        // Return last response if available
        const lastLog = this.interactionLogs
          .filter(log => log.userId === command.userId)
          .slice(-1)[0];
        responseText = lastLog?.response || 'No previous message.';
        responseType = 'status';
        break;

      case 'cancel':
        responseText = 'Cancelled.';
        responseType = 'confirmation';
        break;

      case 'help':
        responseText = 'Available commands: status, current load, next load, submit ticket, mark complete.';
        responseType = 'instruction';
        safeForDriving = false; // Too long for driving
        break;

      default:
        responseText = "I can't complete that request. Please check the app when safe.";
        responseType = 'error';
    }

    // Truncate if too long (safety guardrail)
    if (responseText.length > maxResponseLength) {
      responseText = responseText.substring(0, maxResponseLength - 3) + '...';
    }

    // Update log with response
    const lastLog = this.interactionLogs[this.interactionLogs.length - 1];
    if (lastLog && lastLog.userId === command.userId) {
      lastLog.response = responseText;
      lastLog.success = command.intent !== 'unknown' && command.confidence > 0.7;
      lastLog.vehicleMoving = vehicleMoving;
    }

    return {
      text: responseText,
      type: responseType,
      requiresConfirmation,
      timestamp: new Date(),
      safeForDriving,
    };
  }

  /**
   * Generate TTS audio URL using synthetic voice
   * IMPORTANT: Must use clearly synthetic voice, not human-like
   */
  getSyntheticVoiceURL(text: string, voiceConfig: VoiceUIConfig): string {
    const params = new URLSearchParams({
      text: encodeURIComponent(text),
      voice: voiceConfig.syntheticVoice || 'system-neutral',
      speed: String(voiceConfig.speed || 1.0),
      volume: String(voiceConfig.volume || 1.0),
      pitch: 'medium',
      rate: 'normal',
      quality: 'synthetic', // Explicitly synthetic
    });

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
    // Match against approved whitelist only
    for (const [intent, patterns] of Object.entries(APPROVED_VOICE_COMMANDS)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return intent as VoiceIntentType;
        }
      }
    }
    
    // Command not in whitelist
    return 'unknown';
  }

  private extractParameters(text: string, intent: VoiceIntentType): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract load ID if mentioned
    const loadMatch = text.match(/\bload\s*([A-Z0-9-]+)/i);
    if (loadMatch) params.loadId = loadMatch[1];

    return params;
  }

  private calculateConfidence(text: string, intent: VoiceIntentType): number {
    if (intent === 'unknown') return 0;
    
    const patterns = APPROVED_VOICE_COMMANDS[intent] || [];
    const matches = patterns.filter(pattern => text.includes(pattern)).length;
    
    return Math.min(0.95, 0.7 + (matches * 0.1)); // 0.7-0.95 range
  }

  private generateLoadResponse(load: any, maxLength: number, type: 'current' | 'next' = 'current'): string {
    if (!load) {
      return type === 'next' ? 'No next load scheduled.' : 'No current load assigned.';
    }
    
    const loadNum = load.id || load.loadNumber || 'unknown';
    const dest = load.destination || load.delivery?.address || 'TBD';
    const status = load.status || 'assigned';
    
    return `${type === 'next' ? 'Next' : 'Current'} load ${loadNum}. Destination: ${dest}. Status: ${status}.`;
  }

  private generateStatusResponse(data: any, maxLength: number): string {
    if (!data) return 'Status unavailable.';
    
    const status = data.status || 'unknown';
    const nextAction = data.nextAction || '';
    
    return nextAction 
      ? `Status: ${status}. ${nextAction}.`
      : `Status: ${status}.`;
  }

  private generateIssuesResponse(issues: any, maxLength: number): string {
    if (!issues || issues.length === 0) {
      return 'No issues with current load.';
    }
    
    return `Issues detected: ${issues.length}. Check app when safe.`;
  }

  private generateComplianceResponse(compliance: any, maxLength: number): string {
    if (!compliance) return 'Compliance status unavailable.';
    
    const isClear = compliance.isClear || compliance.clear || false;
    const violations = compliance.violations || 0;
    const flags = compliance.flags || 0;
    
    if (isClear && violations === 0 && flags === 0) {
      return 'Status: Clear.';
    }
    
    if (violations > 0 || flags > 0) {
      return `Violations: ${violations}. Flags: ${flags}. Check app when safe.`;
    }
    
    return 'Compliance status: Review required.';
  }

  private logInteraction(log: VoiceInteractionLog): void {
    this.interactionLogs.push(log);
    
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
