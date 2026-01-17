import MarketingShell from "../components/MarketingShell";

export default function TermsPage() {
  return (
    <MarketingShell
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="These terms apply to MoveAroundTMS.com and all sales/marketing materials."
    >
      <section className="marketing-section">
        <div className="marketing-card">
          <h3>1. Agreement</h3>
          <p>
            By using MoveAround TMS, you agree to these Terms. If you do not agree, do not use the service.
          </p>
          <h3>2. Service Access</h3>
          <p>
            Access is provided as a subscription. We may update features, modules, or availability with notice.
          </p>
          <h3>3. Data & Security</h3>
          <p>
            You retain ownership of your data. We implement reasonable security controls to protect it.
          </p>
          <h3>4. Billing</h3>
          <p>
            Fees are billed according to your plan. No long-term contracts unless specified in a signed order form.
          </p>
          <h3>5. Acceptable Use</h3>
          <p>
            You may not misuse the platform, attempt unauthorized access, or interfere with service operations.
          </p>
          <h3>6. Disclaimers</h3>
          <p>
            The platform is provided “as is.” We do not warrant uninterrupted or error-free service.
          </p>
          <h3>7. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, MoveAround is not liable for indirect damages or lost profits.
          </p>
          <h3>8. Changes</h3>
          <p>
            We may update these Terms. Continued use after updates constitutes acceptance.
          </p>
          <p style={{ marginTop: 16, color: "rgba(255,255,255,0.6)" }}>
            Last updated: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
