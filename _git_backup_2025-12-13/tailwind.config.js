// tailwind.config.js for MoveAround Tesla/SpaceX Brand
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0044ff",
        navy: "#0a1a2f",
        accent: "#00d4b3",
        gold: "#f5d26a",
        white: "#ffffff",
        neon: "#00e9ff",
        glass: "rgba(255,255,255,0.1)",
        alert: "#ff3366",
        success: "#3df28c",
      },
      fontFamily: {
        inter: ["Inter", "Tesla", "Segoe UI", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "1.5rem",
        button: "0.75rem",
        hud: "2.5rem",
      },
      boxShadow: {
        gold: "0 0 16px 2px #f5d26a99",
        blue: "0 0 16px 2px #00e9ff99",
        hologram: "0 0 32px 4px #00e9ff55, 0 0 8px 2px #00d4b355",
      },
      backgroundImage: {
        battery: "linear-gradient(90deg, #00d4b3 0%, #f5d26a 100%)",
        hudArc: "linear-gradient(90deg, #0044ff 0%, #00e9ff 100%)",
        glass: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(10,26,47,0.92) 100%)",
      },
      letterSpacing: {
        wide: ".04em",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
