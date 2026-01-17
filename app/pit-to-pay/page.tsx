import MarketingShell from "../components/MarketingShell";

export default function PitToPayPage() {
  return (
    <MarketingShell
      eyebrow="VeriFlow Pit-to-Pay Suite"
      title="Stop Losing Money at the Scale House"
      subtitle="Automate the haul cycle from load-out to invoice with TicketFlash, AccuriScale, and DocPulse."
      ctaText="Book a Pit-to-Pay Demo"
      ctaHref="mailto:sales@movearoundtms.com?subject=Pit-to-Pay%20Demo%20Request"
    >
      <section className="marketing-grid">
        {[
          {
            title: "AccuriScale Validation",
            body: "Catch short loads and discrepancies instantly by validating origin vs destination weights.",
          },
          {
            title: "TicketFlash OCR",
            body: "Digitize every scale ticket automatically and match to the correct load and customer.",
          },
          {
            title: "DocPulse Audit Packets",
            body: "Generate audit-ready documentation in one click to prevent disputes and delays.",
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
          <h3>Pit-to-Pay Workflow</h3>
          <ol className="marketing-list">
            <li>Scale integration captures weight automatically.</li>
            <li>TicketFlash creates the digital ticket instantly.</li>
            <li>Dispatch + tracking monitors the haul in real time.</li>
            <li>Delivery verification flags mismatches before billing.</li>
            <li>Invoices auto-generate with proof attached.</li>
          </ol>
        </div>
      </section>
    </MarketingShell>
  );
}
