// Live Avatar Engine
// Creates and manages live avatars for drivers and staff

import type {
  AvatarConfig,
  AvatarStatus,
  AvatarAnimation,
  AvatarMessage,
} from './types';

/**
 * Avatar Engine
 * Generates and manages live avatars with animations and status
 */
export class AvatarEngine {
  private avatars: Map<string, AvatarConfig> = new Map();

  /**
   * Create or update avatar for user
   */
  createAvatar(config: AvatarConfig): AvatarConfig {
    this.avatars.set(config.userId, config);
    return config;
  }

  /**
   * Get avatar configuration
   */
  getAvatar(userId: string): AvatarConfig | undefined {
    return this.avatars.get(userId);
  }

  /**
   * Update avatar status
   */
  updateAvatarStatus(userId: string, status: Partial<AvatarStatus>): void {
    const avatar = this.avatars.get(userId);
    if (avatar) {
      avatar.status = { ...avatar.status, ...status };
      this.avatars.set(userId, avatar);
    }
  }

  /**
   * Generate avatar URL (for 2D avatars)
   */
  generateAvatarURL(config: AvatarConfig): string {
    // Use a service like DiceBear, UI Avatars, or custom avatar generator
    // For now, return a placeholder URL pattern
    const baseURL = 'https://api.dicebear.com/7.x/avataaars/svg';
    const params = new URLSearchParams({
      seed: config.userId,
      backgroundColor: 'b6e3f4',
      ...(config.gender && { gender: config.gender }),
    });
    return `${baseURL}?${params.toString()}`;
  }

  /**
   * Generate avatar data URI (inline SVG)
   */
  generateAvatarSVG(config: AvatarConfig): string {
    // Generate SVG avatar inline
    // This is a simplified version - in production, use a proper avatar library
    const color = config.gender === 'female' ? '#FFB6C1' : '#87CEEB';
    return `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="${color}"/>
        <circle cx="40" cy="45" r="5" fill="#000"/>
        <circle cx="60" cy="45" r="5" fill="#000"/>
        <path d="M 35 60 Q 50 70 65 60" stroke="#000" stroke-width="2" fill="none"/>
        ${config.status?.activity === 'talking' ? '<animate attributeName="r" values="5;6;5" dur="0.5s" repeatCount="indefinite"/>' : ''}
      </svg>
    `;
  }

  /**
   * Get animation based on activity
   */
  getAnimationForActivity(activity: AvatarStatus['activity']): AvatarAnimation {
    switch (activity) {
      case 'active':
        return { type: 'working', loop: true };
      case 'busy':
        return { type: 'gesturing', loop: false, duration: 2000 };
      case 'idle':
        return { type: 'idle', loop: true };
      default:
        return { type: 'idle', loop: true };
    }
  }

  /**
   * Generate avatar component props for React
   */
  generateAvatarProps(config: AvatarConfig) {
    return {
      src: this.generateAvatarURL(config),
      alt: `Avatar for ${config.userId}`,
      style: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
      },
      className: `avatar avatar-${config.type} avatar-${config.status?.activity || 'idle'}`,
      'data-user-id': config.userId,
      'data-status': config.status?.activity || 'idle',
    };
  }
}

// Export singleton
export const avatarEngine = new AvatarEngine();
