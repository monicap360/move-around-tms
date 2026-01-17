import MarketingShell from "../components/MarketingShell";

export default function ForShippersPage() {
  return (
    <MarketingShell
      eyebrow="For Shippers & Material Producers"
      title="Perfect Visibility Into Your Aggregate Shipments"
      subtitle="Give your customers a real-time portal for loads, digital tickets, and automated reporting."
      ctaText="See the Shipper Portal"
      ctaHref="mailto:sales@movearoundtms.com?subject=Shipper%20Portal%20Demo"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Real-Time Load Visibility",
            body: "Track every truck, load status, and ETA from a single dashboard.",
          },
          {
            title: "Digital Ticket Access",
            body: "Instant access to tickets and delivery proofs reduces admin time and disputes.",
          },
          {
            title: "Automated Reports",
            body: "Daily and weekly shipment summaries keep your team aligned and clients informed.",
          },
          {
            title: "Preferred Carrier Advantage",
            body: "Become the carrier of choice with transparent, reliable updates.",
          },
        ].map((item) => (
          <div key={item.title} className="marketing-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
