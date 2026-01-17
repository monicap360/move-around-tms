import MarketingShell from "../components/MarketingShell";

export default function PrivacyPage() {
  return (
    <MarketingShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="This policy applies to MoveAroundTMS.com and related sales/marketing properties."
    >
      <section className="marketing-section">
        <div className="marketing-card">
          <h3>1. Information We Collect</h3>
          <p>
            We collect contact details, usage data, and operational data you submit through the platform.
          </p>
          <h3>2. How We Use Data</h3>
          <p>
            Data is used to provide services, improve features, provide support, and ensure security.
          </p>
          <h3>3. Data Sharing</h3>
          <p>
            We do not sell your data. We may share data with service providers who help operate the platform.
          </p>
          <h3>4. Data Security</h3>
          <p>
            We use reasonable administrative, technical, and physical safeguards to protect your data.
          </p>
          <h3>5. Your Choices</h3>
          <p>
            You may request access, correction, or deletion of your data by contacting support.
          </p>
          <h3>6. Updates</h3>
          <p>
            We may update this policy. Continued use after updates constitutes acceptance.
          </p>
          <p style={{ marginTop: 16, color: "rgba(255,255,255,0.6)" }}>
            Last updated: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
