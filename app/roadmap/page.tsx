import MarketingShell from "../components/MarketingShell";

export default function RoadmapPage() {
  return (
    <MarketingShell
      eyebrow="Product Roadmap"
      title="Always Shipping, Always Improving"
      subtitle="A transparent view of what we are building based on customer feedback."
      ctaText="Share a Feature Request"
      ctaHref="mailto:sales@movearoundtms.com?subject=Feature%20Request"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Now",
            body: "TicketFlash, AccuriScale, DocPulse, Cross-Border Command Center, Audit Shield.",
          },
          {
            title: "Next",
            body: "Automated report generator, self-serve evidence packets, advanced alerts.",
          },
          {
            title: "Later",
            body: "Multi-tenant analytics, workflow automation, deeper integrations.",
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
