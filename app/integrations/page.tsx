import MarketingShell from "../components/MarketingShell";

export default function IntegrationsPage() {
  return (
    <MarketingShell
      eyebrow="Integration Hub"
      title="We Connect to Your Existing Tools"
      subtitle="MoveAround plugs into your accounting, telematics, scale house, and load board stack."
      ctaText="Request an Integration Review"
      ctaHref="mailto:sales@movearoundtms.com?subject=Integration%20Review"
    >
      <section className="marketing-grid">
        {[
          {
            title: "Accounting",
            body: "QuickBooks, Xero, Sage",
            flow: "Load Data → MoveAround → Invoice Sync",
          },
          {
            title: "Telematics",
            body: "Samsara, Geotab, Motive",
            flow: "GPS + ELD → MoveAround → Live Status",
          },
          {
            title: "Scale House",
            body: "Command Alkon, TicketSys, Custom",
            flow: "Scale Ticket → MoveAround → AccuriScale",
          },
          {
            title: "Load Boards",
            body: "DAT, Truckstop, Private Boards",
            flow: "Available Loads → MoveAround → Dispatch",
          },
          {
            title: "ELD Providers",
            body: "Omnitracs, KeepTruckin",
            flow: "Hours of Service → MoveAround → Scheduling",
          },
        ].map((item) => (
          <div key={item.title} className="marketing-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <p>
              <strong>Data flow:</strong> {item.flow}
            </p>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
