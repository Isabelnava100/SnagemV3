import { Link } from "react-router-dom";
import snagemLogo from "../../assets/images/team-snagem-logo.png";

/**
 * Shared building blocks for the redesigned marketing pages (Homepage, About).
 * Styling lives in src/assets/styles/redesign.css (the .dc-* classes). These
 * keep the sticky top bar, footer, kicker eyebrow, and gold marquee consistent
 * across every marketing surface. Uses the existing site logo (no new brand art).
 */

/**
 * Sticky, blurred marketing top bar: logo (home / back-to-site) + About +
 * Login. On the auth screens (context="auth") the redundant Login pill is
 * dropped; the logo remains the way back to the site.
 */
export function MarketingTopBar(props: { active?: "about"; context?: "auth" }) {
  return (
    <header className="dc-topbar">
      <Link to="/" className="dc-topbar-brand" aria-label="Snagem Guild home">
        <img src={snagemLogo} alt="" width={30} height={30} />
        <span>SNAGEM</span>
      </Link>
      <nav className="dc-topbar-links">
        <Link to="/About" style={props.active === "about" ? { color: "#fff" } : undefined}>
          About
        </Link>
        {props.context === "auth" ? (
          <Link to="/">Back to site</Link>
        ) : (
          <Link to="/Login" className="dc-cta dc-cta-red" style={{ padding: "8px 18px", fontSize: 12 }}>
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}

/** A short red rule + gold uppercase eyebrow. */
export function Kicker(props: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`dc-kicker${props.center ? " dc-kicker-center" : ""}`}>{props.children}</div>
  );
}

/** Scrolling gold marquee band (duplicated content for a seamless loop). */
export function Marquee(props: { text: string }) {
  const line = `${props.text} `;
  return (
    <div className="dc-marquee" aria-hidden>
      <div className="dc-marquee-track">
        <span>{line.repeat(2)}</span>
        <span>{line.repeat(2)}</span>
      </div>
    </div>
  );
}

/** Shared marketing footer: logo, copyright, secondary links. */
export function MarketingFooter() {
  return (
    <footer className="dc-footer">
      <img
        src={snagemLogo}
        alt="Snagem Guild"
        width={34}
        height={34}
        style={{ marginBottom: 10 }}
      />
      <div style={{ fontSize: 13 }}>&copy; 2026 The Snagem Guild</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
        <Link to="/Policies">Policies</Link>
        <Link to="/Library">Library</Link>
        <Link to="/About">About</Link>
      </div>
    </footer>
  );
}
