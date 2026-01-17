import MarketingShell from "../components/MarketingShell";

export default function DumpTruckFleetsPage() {
  return (
    <MarketingShell
      eyebrow="Fleet Command Center"
      title="Turn More Trips Into More Profit"
      subtitle="Live dispatch, backhaul matching, and dispute-proof billing for dump truck fleets."
      ctaText="Book a Fleet Demo"
      ctaHref="mailto:sales@movearoundtms.com?subject=Dump%20Truck%20Fleet%20Demo%20Request"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Backhaul Matching",
            body: "Reduce deadhead by filling empty miles with nearby loads automatically.",
          },
          {
            title: "Live Fleet Visibility",
            body: "Track every truck status in real time: loaded, empty, in queue, at site.",
          },
          {
            title: "Dispute-Proof Billing",
            body: "Auto-invoice from tickets and driver logs with verified weights and signatures.",
          },
          {
            title: "Daily Profit Cycle",
            body: "Find & dispatch → haul & track → verify & bill → analyze & grow.",
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
          <h3>Guaranteed Profitability Boost</h3>
          <p>
            We help you cut empty miles by 15% in 90 days or the quarter is free. Designed
            for fleets that need proof before commitment.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
