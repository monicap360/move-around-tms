import type { ReactNode } from "react";

type MarketingShellProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  ctaText?: string;
  ctaHref?: string;
  children: ReactNode;
};

export default function MarketingShell({
  title,
  subtitle,
  eyebrow,
  ctaText,
  ctaHref,
  children,
}: MarketingShellProps) {
  return (
    <div className="marketing-shell">
      <style jsx global>{`
        :root {
          --marketing-black: #080808;
          --marketing-dark: #151515;
          --marketing-card: #1c1c1c;
          --marketing-border: rgba(255, 215, 0, 0.25);
          --marketing-accent: #ffd700;
          --marketing-blue: #00b4ff;
        }
        .marketing-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(0, 180, 255, 0.08), transparent 55%), var(--marketing-black);
          color: #ffffff;
          padding: 80px 0 120px;
        }
        .marketing-container {
          width: min(1100px, 92%);
          margin: 0 auto;
        }
        .marketing-hero {
          text-align: center;
          margin-bottom: 48px;
        }
        .marketing-eyebrow {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--marketing-border);
          color: var(--marketing-accent);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .marketing-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          margin-bottom: 12px;
        }
        .marketing-subtitle {
          color: rgba(255, 255, 255, 0.75);
          font-size: 1.05rem;
        }
        .marketing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .marketing-card {
          background: var(--marketing-card);
          border: 1px solid var(--marketing-border);
          border-radius: 12px;
          padding: 20px;
        }
        .marketing-card h3 {
          margin: 0 0 10px;
        }
        .marketing-card p {
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.75);
        }
        .marketing-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 22px;
          border-radius: 999px;
          background: linear-gradient(120deg, #ffb300, #ffd700);
          color: #111111;
          text-decoration: none;
          font-weight: 700;
        }
        .marketing-section {
          margin-top: 40px;
        }
        .marketing-list {
          padding-left: 18px;
          color: rgba(255, 255, 255, 0.78);
        }
      `}</style>

      <div className="marketing-container">
        <div className="marketing-hero">
          {eyebrow && <div className="marketing-eyebrow">{eyebrow}</div>}
          <h1 className="marketing-title">{title}</h1>
          <p className="marketing-subtitle">{subtitle}</p>
          {ctaText && ctaHref && (
            <a className="marketing-cta" href={ctaHref}>
              {ctaText}
            </a>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
