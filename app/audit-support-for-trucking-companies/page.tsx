import MarketingShell from "../components/MarketingShell";

export default function AuditSupportPage() {
  return (
    <MarketingShell
      eyebrow="Audit Shield Services"
      title="Got an Audit Notice? Don’t Panic. We’re Your Defense Team."
      subtitle="MoveAround organizes your records, runs pre‑audit scans, and defends your operation with Audit Shield."
      ctaText="Book an Audit Risk Score"
      ctaHref="mailto:sales@movearoundtms.com?subject=Audit%20Risk%20Score%20Request"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Immediate Audit Triage",
            body: "A specialist interprets the notice and creates a Strategic Response Plan within 24 hours.",
          },
          {
            title: "One‑Click Audit Packet",
            body: "DocPulse compiles all tickets, receipts, and logs into an audit‑ready packet.",
          },
          {
            title: "Pre‑Audit Health Scan",
            body: "Automated compliance checks flag risk areas before the auditor sees them.",
          },
          {
            title: "Representation & Coaching",
            body: "Guided representation or role‑play coaching to avoid costly missteps.",
          },
        ].map((item) => (
          <div key={item.title} className="marketing-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </section>

      <section className="marketing-section">
        <div className="marketing-card">
          <h3>Audit Shield Packages</h3>
          <ul className="marketing-list">
            <li>
              <strong>Audit Ready:</strong> $2,495/year ($208/mo) — proactive compliance + Audit Playbook.
            </li>
            <li>
              <strong>Audit Defense:</strong> $8,500–$15,000 per audit — triage, packet prep, representation.
            </li>
            <li>
              <strong>Audit Concierge:</strong> $25,000+/year — dedicated liaison and white‑glove coverage.
            </li>
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
