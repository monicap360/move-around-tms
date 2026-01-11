"use client";
import Link from "next/link";

export default function FMCSAClearinghouseTab() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      padding: 0,
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>FMCSA Clearinghouse Registration</h1>
      <div style={{ width: '100%', maxWidth: 800, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 32, marginBottom: 32 }}>
        <ol style={{ fontSize: 18, color: '#334155', marginLeft: 24, marginBottom: 24 }}>
          <li style={{ marginBottom: 12 }}><b>Go to the official website:</b> <Link href="https://clearinghouse.fmcsa.dot.gov" target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>https://clearinghouse.fmcsa.dot.gov</Link></li>
          <li style={{ marginBottom: 12 }}><b>Click “Register”</b> and choose <b>Driver</b> as your user type.</li>
          <li style={{ marginBottom: 12 }}><b>Create or log in to your Login.gov account:</b> Use your existing Login.gov credentials, or create a new account with a valid email, password, and two-step verification.</li>
          <li style={{ marginBottom: 12 }}><b>Return to the Clearinghouse site</b> after Login.gov verification.</li>
          <li style={{ marginBottom: 12 }}><b>Verify your CDL information:</b> Enter your CDL number, state of issuance, and date of birth. <span style={{ color: '#dc2626' }}>Ensure all info matches your license exactly.</span></li>
          <li style={{ marginBottom: 12 }}><b>Accept the Terms and Conditions.</b></li>
          <li style={{ marginBottom: 12 }}><b>Optional: Select a Consortium/TPA</b> if you are an owner-operator. Otherwise, your employer/TPA will handle this step.</li>
          <li style={{ marginBottom: 12 }}><b>Registration complete!</b> You can now log in anytime and approve employer queries or view your record.</li>
        </ol>
        <div style={{ fontSize: 16, color: '#059669', marginBottom: 12 }}>
          <b>Important:</b> Drivers must log in to approve pre-employment or annual queries from employers. Employers cannot hire or retain drivers who do not approve queries.
        </div>
        <div style={{ fontSize: 16, color: '#64748b' }}>
          The Clearinghouse is the official FMCSA system for tracking drug & alcohol violations and queries. Always use the official site and never pay a third party for registration.
        </div>
      </div>
    </div>
  );
}
