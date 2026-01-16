"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState("all");
  const [roiInputs, setRoiInputs] = useState({
    loadsPerDay: 45,
    avgValuePerLoad: 420,
    discrepancyPct: 4,
    manualHoursPerDay: 2,
    missedAccessorialPct: 2,
  });

  const hourlyRate = 30;
  const annualRevenue =
    roiInputs.loadsPerDay * roiInputs.avgValuePerLoad * 260;
  const recoveredTonnageRevenue =
    roiInputs.loadsPerDay *
    (roiInputs.discrepancyPct / 100) *
    roiInputs.avgValuePerLoad *
    260;
  const annualLaborSavings =
    roiInputs.manualHoursPerDay * hourlyRate * 260;
  const recoveredAccessorials =
    annualRevenue * (roiInputs.missedAccessorialPct / 100);
  const annualTotalSavings =
    recoveredTonnageRevenue + annualLaborSavings + recoveredAccessorials;

  return (
    <div className="landing-performance">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap");
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");

        :root {
          --bulletproof-black: #080808;
          --carbon-fiber: #121212;
          --titanium-gray: #1e1e1e;
          --hyper-yellow: #ffd700;
          --racing-silver: #c0c0c0;
          --performance-red: #ff2800;
          --speed-white: #ffffff;
          --turbo-blue: #00b4ff;
          --chrome-accent: #e8e8e8;
          --kevlar-gray: #2a2a2a;
          --success-green: #00ff9d;

          --gradient-performance: linear-gradient(
            135deg,
            #ffd700 0%,
            #c0c0c0 50%,
            #00b4ff 100%
          );
          --gradient-bulletproof: linear-gradient(
            135deg,
            rgba(255, 215, 0, 0.15),
            rgba(0, 180, 255, 0.1)
          );
          --gradient-speed: linear-gradient(90deg, #ffd700, #ff2800);
          --gradient-success: linear-gradient(90deg, #00ff9d, #00b4ff);

          --shadow-performance: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          --shadow-bulletproof: 0 0 60px rgba(255, 215, 0, 0.4);
          --shadow-chrome: 0 15px 50px rgba(232, 232, 232, 0.25);
          --shadow-speed: 0 0 40px rgba(255, 40, 0, 0.3);

          --border-performance: 1px solid rgba(255, 215, 0, 0.3);
          --border-bulletproof: 2px solid rgba(0, 180, 255, 0.2);

          --radius-sharp: 4px;
          --radius-performance: 8px;
          --radius-smooth: 16px;
          --radius-pill: 100px;

          --speed-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .landing-performance {
          font-family: "Montserrat", sans-serif;
          background-color: var(--bulletproof-black);
          color: var(--speed-white);
          line-height: 1.7;
          overflow-x: hidden;
          background: linear-gradient(145deg, #080808 0%, #121212 100%),
            radial-gradient(
              circle at 0% 0%,
              rgba(255, 215, 0, 0.05) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(0, 180, 255, 0.05) 0%,
              transparent 50%
            );
          position: relative;
        }

        .landing-performance::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
              45deg,
              transparent 0%,
              rgba(255, 40, 0, 0.02) 100%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(0, 180, 255, 0.03) 0%,
              transparent 70%
            );
          z-index: -1;
          pointer-events: none;
          animation: pulseSpeed 4s ease-in-out infinite alternate;
        }

        @keyframes pulseSpeed {
          0% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.7;
          }
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-family: "Space Grotesk", sans-serif;
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.05;
        }

        h1 {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: -0.04em;
        }

        h2 {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }

        h3 {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }

        .speed-gradient {
          background: var(--gradient-speed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .performance-gradient {
          background: var(--gradient-performance);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        p {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 1.5rem;
          line-height: 1.8;
          font-weight: 400;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }

        section {
          padding: 120px 0;
          position: relative;
          overflow: hidden;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(8, 8, 8, 0.98);
          backdrop-filter: blur(20px);
          z-index: 1000;
          padding: 15px 0;
          border-bottom: var(--border-bulletproof);
          box-shadow: 0 5px 30px rgba(0, 0, 0, 0.8);
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          position: relative;
        }

        .logo-icon {
          width: 52px;
          height: 52px;
          background: var(--gradient-performance);
          border-radius: var(--radius-performance);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: var(--bulletproof-black);
          font-size: 26px;
          font-family: "Space Grotesk", sans-serif;
          position: relative;
          overflow: hidden;
        }

        .logo-icon::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 70%
          );
          animation: shine 3s infinite;
        }

        .logo-text {
          font-size: 2rem;
          font-weight: 900;
          background: var(--gradient-performance);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: "Space Grotesk", sans-serif;
          letter-spacing: -1px;
        }

        .nav-links {
          display: flex;
          gap: 48px;
          align-items: center;
        }

        .nav-link {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: var(--speed-transition);
          position: relative;
          padding: 8px 0;
        }

        .nav-link::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--gradient-speed);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link:hover {
          color: var(--speed-white);
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .nav-cta {
          background: var(--gradient-speed);
          color: var(--speed-white);
          padding: 14px 32px;
          border-radius: var(--radius-pill);
          font-weight: 900;
          font-size: 0.9rem;
          transition: var(--speed-transition);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border: none;
        }

        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-speed);
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          z-index: 1001;
        }

        .hero {
          padding-top: 180px;
          padding-bottom: 150px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
              145deg,
              rgba(8, 8, 8, 0.9),
              rgba(18, 18, 18, 0.95)
            ),
            radial-gradient(
              circle at 20% 30%,
              rgba(255, 215, 0, 0.1) 0%,
              transparent 60%
            );
        }

        .hero::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: radial-gradient(
              circle at 30% 40%,
              rgba(255, 215, 0, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 60%,
              rgba(255, 40, 0, 0.1) 0%,
              transparent 50%
            );
          animation: pulse 8s ease-in-out infinite alternate;
          z-index: -1;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 215, 0, 0.1);
          color: var(--hyper-yellow);
          padding: 14px 28px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 40px;
          border: var(--border-performance);
          backdrop-filter: blur(10px);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .hero-cta {
          display: flex;
          gap: 24px;
          margin-top: 60px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 20px 48px;
          border-radius: var(--radius-performance);
          font-weight: 900;
          font-size: 1rem;
          text-decoration: none;
          transition: var(--speed-transition);
          cursor: pointer;
          border: none;
          gap: 14px;
          position: relative;
          overflow: hidden;
          font-family: "Space Grotesk", sans-serif;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: 0.6s;
        }

        .btn:hover::before {
          left: 100%;
        }

        .btn-primary {
          background: var(--gradient-speed);
          color: var(--speed-white);
          box-shadow: var(--shadow-speed);
        }

        .btn-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(255, 40, 0, 0.4);
        }

        .btn-secondary {
          background: transparent;
          color: var(--speed-white);
          border: 2px solid rgba(255, 215, 0, 0.4);
          backdrop-filter: blur(10px);
        }

        .btn-secondary:hover {
          border-color: var(--hyper-yellow);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(255, 215, 0, 0.3);
        }

        .dashboard-preview {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.9),
            rgba(18, 18, 18, 0.7)
          );
          border-radius: var(--radius-smooth);
          overflow: hidden;
          box-shadow: var(--shadow-performance);
          border: var(--border-performance);
          backdrop-filter: blur(30px);
          transform: perspective(1500px) rotateY(-10deg) rotateX(5deg);
          transition: var(--speed-transition);
          position: relative;
        }

        .dashboard-preview:hover {
          transform: perspective(1500px) rotateY(-5deg) rotateX(3deg);
          box-shadow: var(--shadow-bulletproof);
        }

        .dashboard-header {
          background: rgba(30, 30, 30, 0.95);
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: var(--border-performance);
        }

        .performance-stats {
          padding: 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .stat-widget {
          background: rgba(42, 42, 42, 0.6);
          border-radius: var(--radius-performance);
          padding: 24px;
          border: 1px solid rgba(255, 215, 0, 0.15);
          position: relative;
          overflow: hidden;
          transition: var(--speed-transition);
        }

        .stat-widget:hover {
          border-color: var(--hyper-yellow);
          transform: translateY(-5px);
        }

        .stat-widget::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--gradient-speed);
        }

        .modules-performance {
          background: linear-gradient(
              145deg,
              rgba(18, 18, 18, 0.9),
              rgba(8, 8, 8, 0.95)
            ),
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 215, 0, 0.05) 0%,
              transparent 50%
            );
          border-top: var(--border-performance);
          border-bottom: var(--border-performance);
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 80px;
        }

        .module-card {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.8),
            rgba(42, 42, 42, 0.4)
          );
          border-radius: var(--radius-smooth);
          padding: 48px 36px;
          border: var(--border-performance);
          backdrop-filter: blur(20px);
          transition: var(--speed-transition);
          position: relative;
          overflow: hidden;
        }

        .module-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--gradient-speed);
        }

        .module-card:hover {
          transform: translateY(-15px);
          border-color: var(--hyper-yellow);
          box-shadow: var(--shadow-performance);
        }

        .module-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          position: relative;
        }

        .module-icon i {
          font-size: 36px;
          color: var(--hyper-yellow);
        }

        .module-badge {
          display: inline-block;
          background: rgba(255, 215, 0, 0.15);
          color: var(--hyper-yellow);
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(255, 215, 0, 0.3);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .onboarding-process,
        .reporting-features,
        .switch-benefits,
        .pricing-performance {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.7),
            rgba(8, 8, 8, 0.9)
          );
          border-top: var(--border-performance);
        }

        .onboarding-steps {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 30px;
          margin-top: 60px;
          position: relative;
        }

        .onboarding-steps::before {
          content: "";
          position: absolute;
          top: 40px;
          left: 40px;
          right: 40px;
          height: 2px;
          background: var(--gradient-speed);
          z-index: 1;
        }

        .onboarding-step {
          text-align: center;
          padding: 30px 20px;
          background: rgba(42, 42, 42, 0.4);
          border-radius: var(--radius-smooth);
          border: var(--border-performance);
          position: relative;
          z-index: 2;
          transition: var(--speed-transition);
        }

        .onboarding-step:hover {
          transform: translateY(-10px);
          border-color: var(--hyper-yellow);
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: var(--gradient-speed);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: var(--speed-white);
          margin: 0 auto 20px;
          font-size: 1.5rem;
          font-family: "Space Grotesk", sans-serif;
        }

        .reporting-grid,
        .benefits-grid,
        .pricing-tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-top: 60px;
        }

        .reporting-card,
        .benefit-card,
        .pricing-card {
          padding: 40px;
          background: rgba(42, 42, 42, 0.4);
          border-radius: var(--radius-smooth);
          border: var(--border-performance);
          transition: var(--speed-transition);
        }

        .reporting-card:hover,
        .benefit-card:hover,
        .pricing-card:hover {
          transform: translateY(-10px);
          border-color: var(--hyper-yellow);
        }

        .pricing-header {
          padding: 40px 32px;
          background: rgba(30, 30, 30, 0.9);
          border-bottom: var(--border-performance);
        }

        .deposit-amount {
          background: rgba(255, 215, 0, 0.1);
          padding: 15px;
          border-radius: var(--radius-performance);
          margin-top: 20px;
          text-align: center;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .footer-performance {
          background: linear-gradient(
            145deg,
            rgba(8, 8, 8, 0.98),
            rgba(18, 18, 18, 0.95)
          );
          padding: 100px 0 50px;
          border-top: var(--border-performance);
          position: relative;
        }

        .footer-performance::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--gradient-speed);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 80px;
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes pulse {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }

        @media (max-width: 1400px) {
          h1 {
            font-size: 4rem;
          }
          h2 {
            font-size: 3rem;
          }
          .container {
            max-width: 1200px;
          }
        }

        @media (max-width: 1200px) {
          .hero-container {
            grid-template-columns: 1fr;
            gap: 60px;
          }
          .modules-grid,
          .pricing-tiers,
          .reporting-grid,
          .benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .onboarding-steps {
            grid-template-columns: 1fr;
          }
          .onboarding-steps::before {
            display: none;
          }
        }

        @media (max-width: 992px) {
          .mobile-menu-btn {
            display: block;
          }
          .nav-links {
            position: fixed;
            top: 80px;
            left: 0;
            right: 0;
            background: rgba(8, 8, 8, 0.98);
            flex-direction: column;
            padding: 40px;
            gap: 30px;
            border-bottom: var(--border-performance);
            transform: translateY(-100%);
            opacity: 0;
            transition: var(--speed-transition);
            backdrop-filter: blur(30px);
            z-index: 999;
          }
          .nav-links.active {
            transform: translateY(0);
            opacity: 1;
          }
          .hero {
            padding-top: 140px;
          }
          .hero-cta {
            flex-direction: column;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 3rem;
          }
          h2 {
            font-size: 2.5rem;
          }
          section {
            padding: 80px 0;
          }
          .modules-grid,
          .pricing-tiers,
          .reporting-grid,
          .benefits-grid {
            grid-template-columns: 1fr;
          }
          .performance-stats {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 576px) {
          h1 {
            font-size: 2.5rem;
          }
          h2 {
            font-size: 2rem;
          }
          .container {
            padding: 0 20px;
          }
          .hero-badge,
          .btn {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="container navbar-container">
          <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
            <div className="logo-icon">M</div>
            <div className="logo-text">MoveAround TMS</div>
          </Link>

          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <i className={`fas ${menuOpen ? "fa-times" : "fa-bars"}`}></i>
          </button>

          <div className={`nav-links ${menuOpen ? "active" : ""}`}>
            <a href="#performance" className="nav-link" onClick={() => setMenuOpen(false)}>
              Pit-to-Pay
            </a>
            <a href="#pits" className="nav-link" onClick={() => setMenuOpen(false)}>
              Pits & Quarries
            </a>
            <a href="#dump-truck" className="nav-link" onClick={() => setMenuOpen(false)}>
              Dump Truck Fleets
            </a>
            <a href="#modules" className="nav-link" onClick={() => setMenuOpen(false)}>
              Modules
            </a>
            <a href="#onboarding" className="nav-link" onClick={() => setMenuOpen(false)}>
              Onboarding
            </a>
            <a href="#pricing" className="nav-link" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <a href="#demo" className="nav-link nav-cta" onClick={() => setMenuOpen(false)}>
              Get Demo
            </a>
          </div>
        </div>
      </nav>

      <section style={{ paddingTop: 120, paddingBottom: 40 }}>
        <div className="container">
          <div className="reporting-card" style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 8 }}>Choose Your Path</h3>
            <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.95rem" }}>
              We serve two distinct operations with dedicated workflows.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              <a href="#pits" className="btn btn-primary" style={{ width: "100%" }}>
                I haul Aggregates / Run a Quarry
              </a>
              <a href="#solutions" className="btn btn-secondary" style={{ width: "100%" }}>
                I run General Freight / Trucking
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="hero" id="performance">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fas fa-bolt"></i>
              PIT-TO-PAY INTELLIGENCE PLATFORM
            </div>
            <h1 className="speed-gradient">Stop Losing Money at the Scale House</h1>
            <p>
              <strong>Short loads • scale fraud • ticket matching • production tracking</strong>
            </p>
            <p>
              MoveAround’s <strong className="performance-gradient">VeriFlow Pit‑to‑Pay Suite</strong>{" "}
              automates your haul cycle—from load-out to invoice—to eliminate short loads,
              prevent fraud, and capture every dollar you’ve earned.
            </p>
            <p>
              Powered by <strong>TicketFlash</strong> for ticket capture,{" "}
              <strong>AccuriScale</strong> for scale validation, and{" "}
              <strong>DocPulse</strong> for audit‑ready documentation.
            </p>
            <p>
              <strong>Get a custom ROI analysis</strong> based on your loads, discrepancies,
              and manual reconciliation hours.
            </p>

            <div className="hero-cta">
              <a href="#roi-calculator" className="btn btn-primary">
                <i className="fas fa-chart-line"></i>
                Get ROI Analysis
              </a>
              <a href="#pits" className="btn btn-secondary">
                <i className="fas fa-industry"></i>
                See Pit-to-Pay
              </a>
            </div>
          </div>

          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="dashboard-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--gradient-speed)",
                      borderRadius: "50%",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--hyper-yellow)",
                      fontWeight: 700,
                    }}
                  >
                    MOVEAROUND CONTROL • LIVE
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontWeight: 600,
                  }}
                >
                  Avg. ROI: 214% • Payback: 4.2 months
                </div>
              </div>
              <div className="performance-stats">
                {[
                  {
                    label: "STARTUP DEPOSIT",
                    value: "$999",
                    detail: "Get started • Full implementation",
                    accent: "var(--gradient-speed)",
                  },
                  {
                    label: "TIME TO VALUE",
                    value: "30 Days",
                    detail: "Implementation • Training • Go-live",
                    accent: "var(--gradient-performance)",
                  },
                  {
                    label: "AVG. ROI",
                    value: "214%",
                    detail: "First year return on investment",
                    accent: "var(--gradient-success)",
                  },
                  {
                    label: "PAYBACK PERIOD",
                    value: "4.2 Mos",
                    detail: "Average time to recover investment",
                    accent: "var(--gradient-speed)",
                  },
                ].map((stat) => (
                  <div className="stat-widget" key={stat.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "rgba(255, 255, 255, 0.7)",
                          fontWeight: 600,
                        }}
                      >
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 900,
                          color: "var(--hyper-yellow)",
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      {stat.detail}
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 2,
                        marginTop: 15,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: stat.accent,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="modules-performance">
        <div className="container">
          <div className="section-header">
            <h2>
              Selling Modules: <span className="speed-gradient">Choose What You Need</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Mix and match modules based on your operational requirements
            </p>
          </div>

          <div className="modules-grid">
            {[
              {
                icon: "fa-bolt",
                price: "Sell Separately: $499/month",
                title: "TicketFlash OCR Module",
                desc: "Process paper tickets at 99.97% accuracy with AI-powered optical character recognition.",
                features: [
                  "2-second ticket processing",
                  "Handwriting recognition",
                  "Multi-language support",
                  "Learning AI improves over time",
                ],
                target: "Companies with paper-based processes, manual data entry",
              },
              {
                icon: "fa-weight-hanging",
                price: "Sell Separately: $799/month",
                title: "AccuriScale Module",
                desc: "Real-time scale validation with fraud detection and automated billing verification.",
                features: [
                  "150+ validation rules",
                  "Anomaly detection algorithms",
                  "Cross-reference verification",
                  "Automated dispute evidence",
                ],
                target: "Aggregate haulers, quarries, bulk material transport",
              },
              {
                icon: "fa-tachometer-alt",
                price: "Sell Separately: $1,499/month",
                title: "TMS Operations Platform",
                desc: "Complete fleet management system with dispatch, compliance, and real-time tracking.",
                features: [
                  "Real-time dispatch & tracking",
                  "Automated compliance monitoring",
                  "Integrated billing & payroll",
                  "Advanced reporting suite",
                ],
                target: "All fleet operations needing complete management",
              },
              {
                icon: "fa-route",
                price: "Sell Separately: $299/month",
                title: "Route Optimization",
                desc: "Smart routing suggestions that reduce fuel and improve on-time performance.",
                features: [
                  "Multi-stop optimization",
                  "Fuel-efficient routing",
                  "Load sequencing",
                  "Real-time route adjustments",
                ],
                target: "Dispatch teams optimizing daily routes",
              },
              {
                icon: "fa-file-invoice-dollar",
                price: "Sell Separately: $599/month",
                title: "Revenue Shield",
                desc: "Automated reconciliation and revenue leakage prevention.",
                features: [
                  "Invoice matching",
                  "Exception detection",
                  "Detention claims",
                  "Evidence packet generator",
                ],
                target: "Companies losing revenue to missed accessorials",
              },
              {
                icon: "fa-file-excel",
                price: "Sell Separately: $699/month",
                title: "Excel & Plant Invoice Reconciliation",
                desc: "Upload Excel tickets and auto-reconcile against CSV invoices from material plants.",
                features: [
                  "Excel import with schema detection",
                  "Auto error scanning and variance flags",
                  "CSV invoice matching by load, date, and tonnage",
                  "Exception queue with audit trail",
                ],
                target: "Aggregate and materials haulers reconciling plant invoices",
              },
              {
                icon: "fa-globe",
                price: "Sell Separately: $399/month",
                title: "Cross-Border Mexico",
                desc: "Automated customs documentation and compliance monitoring.",
                features: [
                  "CFDI 4.0 + Carta Porte",
                  "Customs status tracking",
                  "Multi-currency invoicing",
                  "Compliance audit trails",
                ],
                target: "Cross-border carriers and 3PLs",
              },
              {
                icon: "fa-file-lines",
                price: "Sell Separately: $349/month",
                title: "DocPulse Documentation",
                desc: "Centralized document vault with audit trails and dispute-ready evidence packets.",
                features: [
                  "Auto-organized tickets and invoices",
                  "Immutable audit trails",
                  "One-click evidence packets",
                  "Compliance-ready exports",
                ],
                target: "Teams managing high-volume ticket and invoice documentation",
              },
            ].map((module) => (
              <div className="module-card" key={module.title}>
                <div className="module-icon">
                  <i className={`fas ${module.icon}`}></i>
                </div>
                <span className="module-badge">{module.price}</span>
                <h3>{module.title}</h3>
                <p>
                  <strong>{module.desc}</strong>
                </p>

                <div style={{ marginTop: 30 }}>
                  <h4 style={{ color: "var(--hyper-yellow)", marginBottom: 15 }}>
                    Key Selling Features:
                  </h4>
                  <ul
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.95rem",
                      paddingLeft: 20,
                      marginBottom: 25,
                    }}
                  >
                    {module.features.map((feature) => (
                      <li key={feature} style={{ marginBottom: 8 }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "rgba(255, 215, 0, 0.05)",
                    padding: 20,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 215, 0, 0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255, 255, 255, 0.7)",
                      fontWeight: 600,
                    }}
                  >
                    TARGET CUSTOMERS:
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--hyper-yellow)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {module.target}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Choose Your Path: <span className="speed-gradient">Clear Solutions</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Start with the package that matches your operation.
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-industry",
                title: "I run a Quarry or Aggregate Business",
                desc: "Pit‑to‑Pay workflow built for scale houses, short loads, and ticket matching.",
                cta: "Explore Pit‑to‑Pay",
                href: "#pits",
              },
              {
                icon: "fa-globe",
                title: "I am a Cross‑Border Carrier",
                desc: "CFDI 4.0 + Carta Porte automation with customs tracking and multi‑currency billing.",
                cta: "View Cross‑Border",
                href: "#modules",
              },
              {
                icon: "fa-briefcase",
                title: "I need to Automate My Back Office",
                desc: "TicketFlash OCR + Revenue Shield to eliminate manual entry and recover revenue.",
                cta: "Automate the Office",
                href: "#modules",
              },
            ].map((path) => (
              <div className="benefit-card" key={path.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${path.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{path.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {path.desc}
                </p>
                <a href={path.href} className="btn btn-secondary" style={{ marginTop: 20 }}>
                  {path.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reconciliation" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Automated Reconciliation:{" "}
              <span className="speed-gradient">Excel + Plant Invoices</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Upload your Excel tickets, match against CSV invoices, and resolve exceptions fast.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 30 }}>
            {[
              {
                step: "1",
                title: "Upload Excel Tickets",
                desc: "Drag & drop Excel exports. We detect columns, normalize units, and validate totals automatically.",
              },
              {
                step: "2",
                title: "Match CSV Invoices",
                desc: "Plant invoices are matched by load, date, truck, and tonnage. Variances are flagged instantly.",
              },
              {
                step: "3",
                title: "Resolve Exceptions",
                desc: "Exception queue shows discrepancies with evidence and one-click dispute packets.",
              },
            ].map((item) => (
              <div className="reporting-card" key={item.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(0, 180, 255, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 25,
                    border: "2px solid rgba(0, 180, 255, 0.3)",
                    fontWeight: 900,
                    fontSize: "1.25rem",
                    color: "var(--turbo-blue)",
                  }}
                >
                  {item.step}
                </div>
                <h3>{item.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dump-truck" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              For Dump Truck Fleets:{" "}
              <span className="speed-gradient">Turn More Trips Into More Profit</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              A TMS built for the unique chaos of dump trucking—connecting pits, jobsites, and load boards.
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-route",
                title: "Deadhead & Empty Miles",
                desc: "Load‑to‑Dump Sequencing finds backhauls and minimizes empty return trips.",
                solution: "Route Optimization + TMS Platform",
              },
              {
                icon: "fa-list-check",
                title: "Spot Market Loads",
                desc: "Backhaul Board surfaces nearby loads without switching apps.",
                solution: "Backhaul Board + Dispatch (coming soon)",
              },
              {
                icon: "fa-file-invoice-dollar",
                title: "Disputed Invoicing",
                desc: "Auto‑invoicing from scale tickets, signed slips, and driver logs.",
                solution: "Revenue Shield + TicketFlash + DocPulse",
              },
              {
                icon: "fa-location-dot",
                title: "Driver & Asset Downtime",
                desc: "Live Pit‑to‑Dump visibility with statuses: Loaded, Empty, In Queue, At Site.",
                solution: "Live TMS Tracking",
              },
              {
                icon: "fa-screwdriver-wrench",
                title: "Maintenance Surprises",
                desc: "Track cost‑per‑ton and truck health to spot money‑losing assets early.",
                solution: "Operational Efficiency Reporting",
              },
              {
                icon: "fa-chart-line",
                title: "Daily Profit Cycle",
                desc: "Find & Dispatch → Haul & Track → Verify & Bill → Analyze & Grow.",
                solution: "VeriFlow + TicketFlash + AccuriScale",
              },
            ].map((item) => (
              <div className="benefit-card" key={item.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{item.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {item.desc}
                </p>
                <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)" }}>
                  <strong>Solution:</strong> {item.solution}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 50 }}>
            <div
              style={{
                background: "rgba(0, 255, 157, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 36,
                border: "1px solid rgba(0, 255, 157, 0.3)",
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--success-green)", marginBottom: 10 }}>
                90‑Day Profitability Boost
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.95rem" }}>
                We’ll help you reduce empty miles by <strong>15%</strong> or the quarter is free.
              </p>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
                For less than the daily cost of one truck sitting idle, ensure your entire fleet is profitable.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Start Dump Fleet Pilot
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Don’t Watch a Generic Demo.{" "}
              <span className="speed-gradient">Experience Yours.</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Select your biggest profit leak and jump to the exact solution.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { id: "deadhead", label: "Empty Miles / Deadhead", target: "#demo-deadhead" },
              { id: "billing", label: "Invoice Disputes & Late Payments", target: "#demo-billing" },
              { id: "dispatch", label: "Dispatch Chaos & Unknown Status", target: "#demo-dispatch" },
              { id: "all", label: "All of the Above", target: "#demo-cycle" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setSelectedDemo(option.id);
                  const el = document.querySelector(option.target);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  borderColor: selectedDemo === option.id ? "var(--hyper-yellow)" : "rgba(255,215,0,0.3)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 40, display: "grid", gap: 24 }}>
            <div id="demo-deadhead" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module A: Plug the Empty Miles Leak</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  Smart Route & Load Optimization
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: How to Turn Deadhead into Paid Backhauls (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Truck #101 finishes a dump run and returns empty.
                  “This 38‑mile deadhead just cost you $120.”
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> Backhaul Alert surfaces a 22‑ton load 2 miles away.
                </p>
                <p>
                  <strong>Scene 3:</strong> Dispatcher assigns the load. “In 10 seconds, a cost becomes profit.”
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to Calculate Deadhead Savings
              </a>
            </div>

            <div id="demo-billing" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module B: Plug the Billing Leaks</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  TicketFlash + Revenue Shield
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: From Scale Ticket to Paid Invoice, Automatically (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Pile of tickets, disputed invoice.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> TicketFlash digitizes ticket; Revenue Shield flags a 1.5‑ton discrepancy.
                </p>
                <p>
                  <strong>Scene 3:</strong> Clean invoice sent with evidence. “Paid 14 days faster.”
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to Stop Billing Disputes
              </a>
            </div>

            <div id="demo-dispatch" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module C: Eliminate Dispatch Chaos</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  Live Fleet Command
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: Your Entire Fleet on One Screen, in Real‑Time (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Dispatcher buried in check‑calls and spreadsheets.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> Live map shows status: Loaded, Empty, At Site.
                </p>
                <p>
                  <strong>Scene 3:</strong> In‑app messaging replaces chaos with control.
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to See Live Fleet Control
              </a>
            </div>

            <div id="demo-cycle" className="reporting-card">
              <h3>Unified Vision: The Daily Profit Cycle</h3>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                30‑second overview: dispatch → backhaul → ticket scan → invoice → profit dashboard.
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  “It’s the brain our operation was missing. We’re billing more, arguing less, and our
                  trucks are never empty.”
                </p>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  — Dump Truck Fleet Owner
                </p>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="mailto:sales@movearoundtms.com" className="btn btn-primary">
                  Book My Personalized Profit Demo
                </a>
                <a href="mailto:sales@movearoundtms.com" className="btn btn-secondary">
                  Download Profit Leak Calculator
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pits" className="switch-benefits">
        <div className="container">
          <div className="section-header">
            <h2>
              For Aggregate & Bulk Material Haulers:{" "}
              <span className="speed-gradient">AccuriScale Intelligence</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Ticket matching, short loads, scale fraud, and production tracking—handled end‑to‑end.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 }}>
            <div className="benefit-card">
              <h3 style={{ marginBottom: 12 }}>AccuriScale Is Mission‑Critical</h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>Stop Revenue Leakage:</strong> Automatically flag load weight discrepancies
                before they become billing disputes.
              </p>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>End Manual Ticket Matching:</strong> Sync scale house data with dispatch tickets
                in real-time, eliminating clerical hours.
              </p>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>Prevent Fraud & Collusion:</strong> AI alerts for suspicious patterns
                between drivers, loaders, and scale operators.
              </p>
            </div>
            <div className="benefit-card" style={{ textAlign: "left" }}>
              <h3 style={{ marginBottom: 12 }}>Pit‑to‑Pay Workflow</h3>
              <ol style={{ paddingLeft: 18, color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem" }}>
                <li style={{ marginBottom: 10 }}>
                  <strong>Scale Integration:</strong> Weight captured automatically at the pit.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Ticket Creation:</strong> TicketFlash OCR generates a digital ticket instantly.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Dispatch & Tracking:</strong> Load assigned and tracked live.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Delivery Verification:</strong> Destination weight verified; mismatches flagged.
                </li>
                <li>
                  <strong>Automated Billing:</strong> Clean, dispute‑free invoice generated instantly.
                </li>
              </ol>
            </div>
            <div className="benefit-card">
              <h3 style={{ marginBottom: 12 }}>Industry Proof</h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                “We recovered <strong>$87,000</strong> in disputed loads and saved 240 admin hours
                in the first quarter.”
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)" }}>
                — Aggregate Hauler, Texas Gulf Region
              </p>
            </div>
          </div>

          <div style={{ marginTop: 60 }} className="reporting-card">
            <h3 style={{ marginBottom: 16 }}>The 5 Costly Problems We Solve for Pits</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                {
                  problem: "Short Loads & Weight Disputes",
                  pain: "Unbillable tons, customer arguments, manual ticket matching.",
                  solution:
                    "AccuriScale validates pit scale vs destination weight in real time.",
                },
                {
                  problem: "Revenue Leakage & Manual Errors",
                  pain: "Lost tickets, miskeyed weights, missed accessorial charges.",
                  solution:
                    "Revenue Shield + TicketFlash OCR auto-match loads to invoices and flag misses.",
                },
                {
                  problem: "Scale House Fraud & Collusion",
                  pain: "Suspicious overrides, no audit trail, unverified edits.",
                  solution:
                    "150+ validation rules with anomaly detection and immutable audit logs.",
                },
                {
                  problem: "Inefficient Haul Cycles",
                  pain: "Idle trucks, poor sequencing, dispatch in the dark.",
                  solution:
                    "Route Optimization + Live TMS visibility across pit, queue, and en route.",
                },
                {
                  problem: "Cross‑Border Complexity",
                  pain: "Manual customs docs, currency issues, compliance risks.",
                  solution:
                    "Cross‑Border Mexico module auto‑generates CFDI 4.0 + Carta Porte.",
                },
              ].map((item) => (
                <div
                  key={item.problem}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 1.2fr 1.5fr",
                    gap: 16,
                    background: "rgba(30,30,30,0.6)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,215,0,0.2)",
                    padding: 16,
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--hyper-yellow)" }}>{item.problem}</strong>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem" }}>
                    {item.pain}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem" }}>
                    {item.solution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="roi-calculator" style={{ marginTop: 60 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Aggregate Hauler ROI Calculator</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              Estimate your annual recovery from short loads, manual reconciliation, and missed accessorials.
              <span style={{ color: "var(--hyper-yellow)" }}> Assumes $30/hr admin cost.</span>
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              <label>
                Loads per day
                <input
                  type="number"
                  value={roiInputs.loadsPerDay}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      loadsPerDay: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                Average value per load ($)
                <input
                  type="number"
                  value={roiInputs.avgValuePerLoad}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      avgValuePerLoad: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                % loads with weight discrepancies
                <input
                  type="number"
                  value={roiInputs.discrepancyPct}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      discrepancyPct: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                Manual reconciliation hours/day
                <input
                  type="number"
                  value={roiInputs.manualHoursPerDay}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      manualHoursPerDay: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                % revenue lost to missed accessorials
                <input
                  type="number"
                  value={roiInputs.missedAccessorialPct}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      missedAccessorialPct: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginTop: 24,
              }}
            >
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Recovered tonnage revenue
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                  ${recoveredTonnageRevenue.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Annual labor savings
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--success-green)" }}>
                  ${annualLaborSavings.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Recovered accessorials
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                  ${recoveredAccessorials.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Total annual impact
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--turbo-blue)" }}>
                  ${annualTotalSavings.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ padding: "16px 28px" }}>
                Schedule ROI Walkthrough
              </a>
            </div>
          </div>

          <div style={{ marginTop: 50 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Scale System Compatibility</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              Works with leading scale house software and hardware. We can integrate with
              common CSV exports and API feeds.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {["ScaleSoft Pro", "WeighMaster", "QuarryTrack", "TicketPro", "Custom CSV Exports", "API Feeds"].map(
                (item) => (
                  <div key={item} className="stat-widget" style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>{item}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div style={{ marginTop: 50 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Pit Operator’s Guide to Digital Transformation</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              A practical guide built for quarries and bulk material haulers.
            </p>
            <ul style={{ paddingLeft: 20, color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
              <li style={{ marginBottom: 8 }}>The true cost of paper tickets</li>
              <li style={{ marginBottom: 8 }}>Scale house tech & integration checklist</li>
              <li style={{ marginBottom: 8 }}>Building a dispute‑proof audit trail</li>
              <li style={{ marginBottom: 8 }}>ROI framework for short loads & accessorials</li>
              <li>What to expect in a 30‑day implementation</li>
            </ul>
            <div style={{ marginTop: 20 }}>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-secondary" style={{ padding: "14px 26px" }}>
                Request the Guide
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="onboarding" className="onboarding-process">
        <div className="container">
          <div className="section-header">
            <h2>
              Quick Onboarding: <span className="speed-gradient">Live in 30 Days</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              From $999 deposit to full implementation in 30 days flat
            </p>
          </div>

          <div className="onboarding-steps">
            {[
              "Deposit & Discovery",
              "Module Configuration",
              "Data Migration",
              "Team Training",
              "Go Live & Support",
            ].map((step, idx) => (
              <div className="onboarding-step" key={step}>
                <div className="step-number">{idx + 1}</div>
                <h3>{step}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  Streamlined onboarding with white-glove support for every team.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reporting" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Advanced Reporting:{" "}
              <span className="speed-gradient">Actionable Intelligence</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Reporting that turns operational data into executive decisions
            </p>
          </div>

          <div className="reporting-grid">
            {[
              {
                icon: "fa-chart-line",
                title: "Financial Performance",
                items: [
                  "Revenue per truck analysis",
                  "Cost per mile tracking",
                  "Profitability by lane",
                  "ROI calculation reports",
                ],
              },
              {
                icon: "fa-truck",
                title: "Operational Efficiency",
                items: [
                  "Truck utilization rates",
                  "Driver performance metrics",
                  "Fuel efficiency tracking",
                  "Maintenance cost analysis",
                ],
              },
              {
                icon: "fa-shield-alt",
                title: "Compliance & Safety",
                items: [
                  "HOS compliance tracking",
                  "Safety violation reports",
                  "Cross-border compliance",
                  "Audit trail documentation",
                ],
              },
            ].map((card) => (
              <div className="reporting-card" key={card.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 25,
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${card.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{card.title}</h3>
                <ul
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "0.95rem",
                    paddingLeft: 20,
                    marginTop: 15,
                  }}
                >
                  {card.items.map((item) => (
                    <li key={item} style={{ marginBottom: 8 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="switch" className="switch-benefits">
        <div className="container">
          <div className="section-header">
            <h2>
              Why Switch Now: <span className="speed-gradient">Immediate Benefits</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              What you gain immediately when switching from other systems
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-dollar-sign",
                title: "Immediate Cost Savings",
                desc: "Average 35% reduction in operational costs within the first 90 days.",
              },
              {
                icon: "fa-bolt",
                title: "85% Faster Processing",
                desc: "Ticket processing time reduced from hours to seconds.",
              },
              {
                icon: "fa-chart-bar",
                title: "Revenue Recovery",
                desc: "Find 5-8% of lost revenue from missed billable loads.",
              },
            ].map((benefit) => (
              <div className="benefit-card" key={benefit.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${benefit.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{benefit.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <a href="#demo" className="btn btn-primary" style={{ padding: "25px 60px", fontSize: "1.25rem" }}>
              <i className="fas fa-exchange-alt"></i>
              Switch Now for $999 Deposit
            </a>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", marginTop: 20, fontSize: "0.95rem" }}>
              30-day money-back guarantee • Average ROI: 214% • Payback: 4.2 months
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-performance">
        <div className="container">
          <div className="section-header">
            <h2>
              Pricing: <span className="speed-gradient">Get Started for $999</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Choose your modules, pay only for what you need
            </p>
          </div>

          <div className="pricing-tiers">
            {[
              {
                badge: "FASTSCAN OCR ONLY",
                price: "$499",
                desc: "For companies needing only OCR capabilities",
                deposit: "$499",
                features: [
                  "5,000 tickets/month processing",
                  "99.97% accuracy guarantee",
                  "Multi-language support",
                  "Basic reporting",
                ],
                cta: "Start with TicketFlash",
                ctaClass: "btn btn-secondary",
              },
              {
                badge: "PROFESSIONAL BUNDLE",
                price: "$2,499",
                desc: "Complete solution for serious operations",
                deposit: "$999",
                features: [
                  "TicketFlash OCR (Unlimited)",
                  "AccuriScale",
                  "TMS Platform",
                  "Cross-Border Mexico",
                  "Advanced Reporting Suite",
                ],
                cta: "Start Professional for $999",
                ctaClass: "btn btn-primary",
                highlight: true,
              },
              {
                badge: "ENTERPRISE CUSTOM",
                price: "Custom",
                desc: "Tailored solutions for large operations",
                deposit: "$2,499",
                features: [
                  "All Professional Bundle features",
                  "Custom module development",
                  "Dedicated account manager",
                  "On-premise deployment",
                  "Predictive Analytics Module",
                ],
                cta: "Contact Enterprise Sales",
                ctaClass: "btn btn-secondary",
              },
            ].map((tier) => (
              <div
                className="pricing-card"
                key={tier.badge}
                style={tier.highlight ? { borderColor: "var(--hyper-yellow)", transform: "scale(1.05)" } : undefined}
              >
                {tier.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--gradient-speed)",
                      color: "var(--speed-white)",
                      padding: "8px 24px",
                      borderRadius: "0 0 8px 8px",
                      fontWeight: 900,
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="pricing-header">
                  <div className="module-badge" style={tier.highlight ? { background: "rgba(255, 215, 0, 0.2)" } : undefined}>
                    {tier.badge}
                  </div>
                  <h3 style={{ fontSize: "2.5rem", marginBottom: 10 }}>
                    {tier.price}
                    <span style={{ fontSize: "1rem", color: "rgba(255, 255, 255, 0.7)" }}>/month</span>
                  </h3>
                  <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                    {tier.desc}
                  </p>
                  <div className="deposit-amount">
                    <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)" }}>
                      STARTUP DEPOSIT
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                      {tier.deposit}
                    </div>
                  </div>
                </div>
                <div style={{ padding: 32 }}>
                  <h4 style={{ color: "var(--hyper-yellow)", marginBottom: 20 }}>Includes:</h4>
                  <ul
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.95rem",
                      paddingLeft: 20,
                      marginBottom: 30,
                    }}
                  >
                    {tier.features.map((feature) => (
                      <li key={feature} style={{ marginBottom: 10 }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="#demo" className={tier.ctaClass} style={{ width: "100%" }}>
                    <i className="fas fa-rocket"></i>
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div
              style={{
                background: "rgba(0, 180, 255, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 40,
                border: "1px solid rgba(0, 180, 255, 0.3)",
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--turbo-blue)", marginBottom: 12 }}>
                Starter Pilot (Risk‑Free)
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem" }}>
                Try <strong>AccuriScale</strong> for 90 days with a $0 deposit. Only pay the
                $799/month fee if you recover more than <strong>$5,000</strong> in disputed loads.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 18 }}>
                Start Pilot
              </a>
              <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", marginTop: 12 }}>
                Value‑first guarantee designed for 1–2 truck operators and new pits.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div
              style={{
                background: "rgba(255, 40, 0, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 40,
                border: "1px solid rgba(255, 40, 0, 0.3)",
                maxWidth: 980,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--performance-red)", marginBottom: 12 }}>
                The 90‑Day Pit Profit Guarantee
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.95rem" }}>
                We implement the <strong>VeriFlow Pit‑to‑Pay Suite</strong> in your operation.
                You pay <strong>$0 for 90 days</strong>. If AccuriScale doesn’t identify at least
                <strong> 5x its monthly cost</strong> in discrepancies and savings, you owe nothing.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 18 }}>
                Start the 90‑Day Guarantee
              </a>
              <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", marginTop: 12 }}>
                Built for pits, quarries, and bulk material haulers who need proof before commitment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="switch-benefits">
        <div className="container" style={{ textAlign: "center" }}>
          <h2>
            Get Your Custom Demo: <span className="speed-gradient">Move Fast</span>
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>
            Tell us your fleet size and modules. We’ll build your ROI plan within 24 hours.
          </p>
          <div style={{ marginTop: 30 }}>
            <a
              href="mailto:sales@movearoundtms.com"
              className="btn btn-primary"
              style={{ padding: "22px 60px" }}
            >
              <i className="fas fa-envelope"></i>
              Request Demo
            </a>
          </div>
        </div>
      </section>

      <footer className="footer-performance">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ marginBottom: 30 }}>
                <div className="logo-icon">M</div>
                <div className="logo-text">MoveAround TMS</div>
              </div>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: 30, maxWidth: 400 }}>
                Bulletproof fleet intelligence. 99.99% uptime. 30-day implementation. 214% average ROI.
              </p>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Modules
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">TicketFlash OCR</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">AccuriScale</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">TMS Platform</a>
                </li>
                <li>
                  <a href="#modules" className="nav-link">Cross-Border</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Company
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15 }}>
                  <a href="#onboarding" className="nav-link">Onboarding</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#reporting" className="nav-link">Reporting</a>
                </li>
                <li>
                  <a href="#pricing" className="nav-link">Pricing</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Get Started
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15, color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-envelope" style={{ color: "var(--hyper-yellow)", marginRight: 10 }}></i>
                  sales@movearoundtms.com
                </li>
                <li style={{ marginBottom: 15, color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-map-marker-alt" style={{ color: "var(--turbo-blue)", marginRight: 10 }}></i>
                  Houston, TX
                </li>
                <li style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-dollar-sign" style={{ color: "var(--success-green)", marginRight: 10 }}></i>
                  Startup Deposit: $999
                </li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: "center", paddingTop: 50, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.875rem" }}>
              © {new Date().getFullYear()} MoveAround TMS. From Street Smart to Fleet Smart.
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.75rem", marginTop: 10 }}>
              99.99% Uptime Guarantee • 30-Day Implementation • 214% Average ROI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
