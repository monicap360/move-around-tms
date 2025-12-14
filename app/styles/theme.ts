// MoveAround Galaxy Theme (with customer customization)
// Place in /styles/theme.ts or /lib/theme.ts

export const defaultGalaxyTheme = {
  primary: '#2D2A4A', // Galaxy deep blue
  secondary: '#6C63FF', // MoveAround purple
  accent: '#00FFD0', // Neon accent
  background: '#181828',
  surface: '#23233A',
  text: '#FFFFFF',
  muted: '#A0A0C0',
  success: '#00FFB0',
  warning: '#FFD600',
  error: '#FF4B6E',
  info: '#6C63FF',
  border: '#35355A',
  // Add more tokens as needed
};

// Customer can override any color by providing a partial object
export function getTheme(customerOverrides = {}) {
  return { ...defaultGalaxyTheme, ...customerOverrides };
}

// Usage in components:
// import { getTheme } from '../styles/theme';
// const theme = getTheme(customerThemeOverrides);
// style={{ background: theme.background, color: theme.text }}
