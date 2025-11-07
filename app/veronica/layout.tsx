import "./styles.css";

export const metadata = {
  title: "Veronica Butanda Dashboard | Ronynx Fleet",
};

export default function VeronicaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="veronica-dashboard">
      <header className="header">
        <img src="/veronica_logo.png" alt="Ronynx Fleet" className="header-logo" />
        <h1>Veronica Butanda Dashboard</h1>
        <p className="powered">Powered by Move Around TMS™</p>
        <nav className="header-nav">
          <a href="/partners/ronyx" className="nav-link">← RonYX Portal</a>
          <a href="/veronica" className="nav-link active">Owner-Operators</a>
        </nav>
      </header>
      <main className="dashboard-content">{children}</main>
    </div>
  );
}