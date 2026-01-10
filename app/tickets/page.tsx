export default function TicketsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      padding: 0,
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Tickets</h1>
      <p style={{ fontSize: 20, color: '#475569', marginBottom: 32 }}>
        Welcome to the Tickets page. Implement your ticket logic here.
      </p>
      <div style={{
        background: '#e0e7ef',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(30,41,59,0.08)',
        padding: 32,
        minWidth: 320,
        minHeight: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color: '#2563eb',
        fontWeight: 500,
      }}>
        Ticket management coming soon...
      </div>
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  );
}
