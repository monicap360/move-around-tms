type Props = {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function CcbShieldLogo({ width, height = 80, className, style }: Props) {
  const id = "ccb";

  return (
    <svg
      viewBox="0 0 200 300"
      width={width ?? "auto"}
      height={height}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CCB — Carrier Clearance Bureau by MoveAround TMS"
    >
      <defs>
        <linearGradient id={`${id}-chrome`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#d6d6d6" />
          <stop offset="40%"  stopColor="#f5f5f5" />
          <stop offset="70%"  stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#8a8a8a" />
        </linearGradient>
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="#1e2e62" />
          <stop offset="100%" stopColor="#0b1430" />
        </linearGradient>
        <linearGradient id={`${id}-ccb`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="50%"  stopColor="#e8eaf0" />
          <stop offset="100%" stopColor="#b0b8cc" />
        </linearGradient>
        <radialGradient id={`${id}-green`} cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="28%"  stopColor="#4ade80" />
          <stop offset="75%"  stopColor="#16a34a" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="0 0 0 0 0.1  0 0 0 0 0.8  0 0 0 0 0.3  0 0 0 1 0"
            result="greenBlur"
          />
          <feMerge>
            <feMergeNode in="greenBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* ── Outer chrome shield ───────────────────────────────────── */}
      <path
        d="M 100,4 L 192,44 L 192,132 Q 192,204 100,228 Q 8,204 8,132 L 8,44 Z"
        fill={`url(#${id}-chrome)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* ── Inner navy shield ─────────────────────────────────────── */}
      <path
        d="M 100,13 L 182,51 L 182,130 Q 182,196 100,218 Q 18,196 18,130 L 18,51 Z"
        fill={`url(#${id}-bg)`}
      />

      {/* ── Road lane lines (top center) ──────────────────────────── */}
      <rect x="98"  y="15" width="4"  height="22" rx="2" fill="#fff" opacity="0.22" />
      <rect x="90"  y="19" width="2.5" height="16" rx="1" fill="#fff" opacity="0.10" />
      <rect x="108" y="19" width="2.5" height="16" rx="1" fill="#fff" opacity="0.10" />

      {/* ── CCB letters ───────────────────────────────────────────── */}
      <text
        x="100" y="114"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Arial Black','Franklin Gothic Heavy','Impact',sans-serif"
        fontWeight="900"
        fontSize="58"
        fill={`url(#${id}-ccb)`}
        letterSpacing="2"
      >
        CCB
      </text>

      {/* ── Traffic light housing ─────────────────────────────────── */}
      <circle cx="100" cy="171" r="17" fill="#111827" stroke="#4b5563" strokeWidth="1.5" />
      <circle cx="100" cy="171" r="12.5" fill={`url(#${id}-green)`} filter={`url(#${id}-glow)`} />

      {/* ── Post ──────────────────────────────────────────────────── */}
      <rect x="97.5" y="188" width="5" height="13" rx="2" fill="#4b5563" />
      <rect x="90" y="199" width="20" height="3" rx="1.5" fill="#374151" />

      {/* ══ Text block below shield ═══════════════════════════════════ */}

      {/* CARRIER */}
      <text
        x="100" y="239"
        textAnchor="middle"
        fontFamily="'Arial Black','Franklin Gothic Heavy','Impact',sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#0b1430"
        letterSpacing="5"
      >
        CARRIER
      </text>

      {/* CLEARANCE */}
      <text
        x="100" y="259"
        textAnchor="middle"
        fontFamily="'Arial Black','Franklin Gothic Heavy','Impact',sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#0b1430"
        letterSpacing="3"
      >
        CLEARANCE
      </text>

      {/* — BUREAU™ — */}
      <line x1="12" y1="270.5" x2="50" y2="270.5" stroke="#0b1430" strokeWidth="1.4" />
      <text
        x="100" y="274"
        textAnchor="middle"
        fontFamily="'Arial Black','Franklin Gothic Heavy','Impact',sans-serif"
        fontWeight="900"
        fontSize="11"
        fill="#0b1430"
        letterSpacing="3.5"
      >
        BUREAU™
      </text>
      <line x1="150" y1="270.5" x2="188" y2="270.5" stroke="#0b1430" strokeWidth="1.4" />

      {/* by MoveAround TMS */}
      <text
        x="100" y="292"
        textAnchor="middle"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontSize="10.5"
        fill="#374151"
      >
        <tspan fontWeight="400">by </tspan>
        <tspan fill="#16a34a" fontWeight="700">MoveAround</tspan>
        <tspan fontWeight="400"> TMS</tspan>
      </text>
    </svg>
  );
}
