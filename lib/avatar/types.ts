// Live Avatar System Types

export interface AvatarConfig {
  userId: string;
  type: 'driver' | 'dispatcher' | 'manager' | 'admin';
  style: '2d_cartoon' | '2d_realistic' | '3d_low_poly' | '3d_realistic';
  gender?: 'male' | 'female' | 'neutral';
  skinTone?: string;
  hairColor?: string;
  clothing?: AvatarClothing;
  accessories?: AvatarAccessory[];
  status?: AvatarStatus;
}

export interface AvatarClothing {
  shirt?: string;
  pants?: string;
  jacket?: string;
  hat?: boolean;
  uniform?: boolean;
}

export interface AvatarAccessory {
  type: 'glasses' | 'watch' | 'badge' | 'headset' | 'hat';
  visible: boolean;
}

export interface AvatarStatus {
  online: boolean;
  activity: 'idle' | 'active' | 'busy' | 'away';
  location?: { latitude: number; longitude: number };
  currentTask?: string;
  mood?: 'happy' | 'neutral' | 'focused' | 'stressed';
  lastSeen?: Date;
}

export interface AvatarAnimation {
  type: 'idle' | 'talking' | 'listening' | 'thinking' | 'gesturing' | 'working';
  duration?: number;
  loop?: boolean;
}

export interface AvatarMessage {
  avatarId: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'voice' | 'command';
  animated?: boolean;
}

export interface VoiceCommand {
  command: string;
  intent: 'assign_load' | 'update_status' | 'request_help' | 'report_issue' | 'check_schedule' | 'navigate';
  parameters?: Record<string, any>;
  confidence: number;
}
