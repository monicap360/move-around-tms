// MoveAround Tesla/SpaceX Brand Theme Tokens
export const moveAroundTheme = {
  colors: {
    primary: "#0044ff", // MoveAround Blue
    navy: "#0a1a2f", // MoveAround Navy
    accent: "#00d4b3", // Teal/Green
    gold: "#f5d26a", // Texas Star Gold
    white: "#ffffff",
    neonBlue: "#00e9ff", // Neon Cyber Blue
    glassGray: "rgba(255,255,255,0.1)",
    alertRed: "#ff3366",
    successGreen: "#3df28c",
    // Gradients
    battery: "linear-gradient(90deg, #00d4b3 0%, #f5d26a 100%)",
    hudArc: "linear-gradient(90deg, #0044ff 0%, #00e9ff 100%)",
    glass:
      "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(10,26,47,0.92) 100%)",
  },
  typography: {
    fontFamily: "'Inter', 'Tesla', 'Segoe UI', Arial, sans-serif",
    fontWeightBold: 700,
    fontWeightNormal: 400,
    fontSizeBase: "16px",
    fontSizeLarge: "2rem",
    fontSizeSmall: "0.875rem",
    letterSpacingWide: "0.04em",
  },
  effects: {
    glowGold: "0 0 16px 2px #f5d26a99",
    glowBlue: "0 0 16px 2px #00e9ff99",
    glassPanel:
      "backdrop-filter: blur(16px); background: rgba(255,255,255,0.08); border: 1.5px solid #00e9ff22; box-shadow: 0 4px 32px #0044ff22;",
    hologram: "0 0 32px 4px #00e9ff55, 0 0 8px 2px #00d4b355",
  },
  borderRadius: {
    card: "1.5rem",
    button: "0.75rem",
    hud: "2.5rem",
  },
};
