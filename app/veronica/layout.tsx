import "./styles.css";

export const metadata = {
  title: "ROnyx Manager Dashboard | Move Around TMS",
};

export default function VeronicaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="veronica-dashboard">
      <header className="header">
        <img src="/veronica_logo.png" alt="ROnyx Fleet" className="header-logo" />
        <h1>ROnyx Manager Dashboard</h1>
        <p className="powered">Powered by Move Around TMS™</p>
        <nav className="header-nav">
          <a href="/partners/ronyx" className="nav-link">← ROnyx Portal</a>
          <a href="/veronica" className="nav-link">Owner-Operators</a>
          <a href="/veronica/change-password" className="nav-link">🔐 Change Password</a>
        </nav>
      </header>
      <main className="dashboard-content">{children}</main>
    </div>
  );
}