import MarketingShell from "../components/MarketingShell";

export default function ComparePage() {
  return (
    <MarketingShell
      eyebrow="Why MoveAround"
      title="Compare Your TMS Options"
      subtitle="Depth without overkill, fast implementation, and niche expertise for pits, dump fleets, and cross-border ops."
      ctaText="Talk to a Specialist"
      ctaHref="mailto:sales@movearoundtms.com?subject=MoveAround%20Comparison%20Call"
    >
      <style jsx>{`
        .compare-table {
          width: 100%;
          border-collapse: collapse;
          background: #1c1c1c;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        .compare-table th,
        .compare-table td {
          padding: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
        }
        .compare-table th {
          color: #ffd700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }
      `}</style>

      <section className="marketing-section">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Criteria</th>
              <th>MoveAround</th>
              <th>Low-Cost Challengers</th>
              <th>Enterprise Giants</th>
              <th>Spreadsheets</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Implementation Speed",
                move: "30 days with onboarding team",
                low: "Self-serve, limited support",
                enterprise: "3-9 months",
                sheets: "Immediate but manual",
              },
              {
                label: "Niche Expertise",
                move: "Built for pits, dump fleets, cross-border",
                low: "Generic features",
                enterprise: "Too broad, not specialized",
                sheets: "None",
              },
              {
                label: "Compliance & Audit",
                move: "Audit Shield + DocPulse",
                low: "Basic exports",
                enterprise: "Complex and expensive",
                sheets: "High risk",
              },
              {
                label: "Pricing Transparency",
                move: "Clear bundles, no long-term contracts",
                low: "Cheap, but add-ons stack",
                enterprise: "Opaque enterprise quotes",
                sheets: "Hidden labor cost",
              },
            ].map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.move}</td>
                <td>{row.low}</td>
                <td>{row.enterprise}</td>
                <td>{row.sheets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </MarketingShell>
  );
}
