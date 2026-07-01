import Link from "next/link";

const team = [
  {
    initials: "MP",
    name: "Monica Peña",
    title: "Founder & CEO",
    bio: "Monica spent 10 years running aggregate haul operations across South Texas before building MoveAround. She got tired of reconciling pit invoices in Excel at midnight and decided to fix it herself. She leads product vision and customer relationships.",
    color: "#2563eb",
  },
  {
    initials: "RV",
    name: "Rafael Vargas",
    title: "Head of Operations & Onboarding",
    bio: "Rafael managed a 22-truck dump fleet in the Houston area for six years. He designed the onboarding process from the ground up — every step is built around how real dispatchers and drivers actually work, not how software developers think they work.",
    color: "#00b4ff",
  },
  {
    initials: "JL",
    name: "Jessica Liu",
    title: "Lead Engineer",
    bio: "Jessica built the core ticket-to-invoice workflow and the driver mobile app. She holds a CS degree from UT Austin and previously worked on fleet software at a construction logistics startup. She is the reason the app works offline in a gravel pit with no signal.",
    color: "#00ff9d",
  },
];

const values = [
  {
    icon: "🏗️",
    title: "Built for the Job, Not the Demo",
    body: "Every feature was shaped by real operators telling us what breaks at 6 AM on a haul day. If it doesn't survive that test, it doesn't ship.",
  },
  {
    icon: "📋",
    title: "Honest Pricing, No Traps",
    body: "Per truck, per month. No per-load fees, no seat licenses, no surprise overages. You always know what you're paying before the invoice arrives.",
  },
  {
    icon: "🤝",
    title: "We Answer the Phone",
    body: "We are a small team that picks up the phone. If something breaks at 7 AM before a big haul, you reach a person — not a ticket queue.",
  },
  {
    icon: "🔬",
    title: "Proof Over Promises",
    body: "We don't ask you to trust us on ROI. We set up a real pilot, define success metrics with you, and let the data speak. If it doesn't work, you don't pay.",
  },
];

export default function AboutPage() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
      color: "#ffffff",
      minHeight: "100vh",
      fontFamily: "Poppins, sans-serif",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>

        <div style={{ marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Back to home
          </Link>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: "4rem" }}>
          <img src="/movearound_logo.png" alt="MoveAround TMS" style={{ height: 56, width: "auto", display: "block", marginBottom: "1.25rem" }} onError={(e) => { const img = e.currentTarget; if (img.getAttribute("src") === "/movearound_logo.png") { img.setAttribute("src", "/movearound_logo.svg"); return; } img.style.display = "none"; }} />
          <div style={{ display: "inline-block", background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.4)", borderRadius: 20, padding: "0.3rem 1rem", fontSize: "0.8rem", color: "#2563eb", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "1rem" }}>
            ABOUT MOVEAROUND TMS
          </div>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1.25rem" }}>
            We Built This Because <span style={{ color: "#2563eb" }}>We Lived the Problem.</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.75, maxWidth: 700, marginBottom: "1rem" }}>
            MoveAround TMS was started in Houston, Texas by people who spent years running and dispatching dump truck and aggregate haul operations. We watched good operators lose thousands of dollars a week to short loads they couldn't prove, pit invoices that didn't match, and payroll runs that took a full Friday afternoon.
          </p>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.75, maxWidth: 700 }}>
            We looked at every TMS tool on the market and found the same problem: they were all built for general freight brokers, not for the specific chaos of hauling dirt, sand, and gravel. So we built one that was.
          </p>
        </div>

        {/* The story */}
        <div style={{ marginBottom: "4rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 12, padding: "2rem" }}>
            <h2 style={{ color: "#2563eb", fontSize: "1.3rem", marginBottom: "1rem" }}>The Problem We Kept Seeing</h2>
            <ul style={{ paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.8, fontSize: "0.95rem" }}>
              <li style={{ marginBottom: 8 }}>Dispatchers running three spreadsheets simultaneously</li>
              <li style={{ marginBottom: 8 }}>Pit invoices arriving two weeks late with no way to verify tonnage</li>
              <li style={{ marginBottom: 8 }}>Drivers signing paper tickets that got lost in a truck cab</li>
              <li style={{ marginBottom: 8 }}>Payroll manually calculated every Friday from a mix of texts and call logs</li>
              <li style={{ marginBottom: 8 }}>Customers disputing invoices with no ticket evidence to push back</li>
              <li>Scale fraud going undetected for months</li>
            </ul>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 12, padding: "2rem" }}>
            <h2 style={{ color: "#00b4ff", fontSize: "1.3rem", marginBottom: "1rem" }}>What We Set Out to Fix</h2>
            <ul style={{ paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.8, fontSize: "0.95rem" }}>
              <li style={{ marginBottom: 8 }}>Digital tickets captured and signed at the point of delivery</li>
              <li style={{ marginBottom: 8 }}>Pit invoices matched automatically against dispatch records</li>
              <li style={{ marginBottom: 8 }}>Payroll calculated from approved tickets — not phone calls</li>
              <li style={{ marginBottom: 8 }}>Discrepancy alerts before the invoice goes out, not after</li>
              <li style={{ marginBottom: 8 }}>Customer portal so clients can see their own loads in real time</li>
              <li>QuickBooks sync that doesn't require double-entry</li>
            </ul>
          </div>
        </div>

        {/* Values */}
        <div style={{ marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#2563eb", marginBottom: "1.5rem" }}>How We Work</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {values.map((v) => (
              <div key={v.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "1.5rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{v.icon}</div>
                <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem" }}>{v.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", lineHeight: 1.65 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#2563eb", marginBottom: "0.5rem" }}>The Team</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "1.75rem" }}>
            Small on purpose. Every person on this team has spent time inside a fleet operation — not just looking at one from the outside.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {team.map((member) => (
              <div key={member.name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.75rem", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${member.color}, ${member.color}88)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "1rem", color: "#000", flexShrink: 0,
                  }}>
                    {member.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{member.name}</div>
                    <div style={{ color: member.color, fontSize: "0.82rem", fontWeight: 600 }}>{member.title}</div>
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Where we are */}
        <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 12, padding: "2rem", marginBottom: "3rem" }}>
          <h2 style={{ color: "#2563eb", fontSize: "1.3rem", marginBottom: "0.75rem" }}>Based in Houston. Built for the Whole Country.</h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1rem" }}>
            We are headquartered in Houston, TX — the heart of the Gulf Coast aggregate and oilfield hauling market. Our customers operate across Texas, Louisiana, Oklahoma, and into Mexico. If your trucks haul dirt, sand, gravel, or rock, this system was built for you.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem" }}>
              Talk to the Team
            </a>
            <Link href="/faq" className="btn btn-secondary" style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem" }}>
              Read the FAQ
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
