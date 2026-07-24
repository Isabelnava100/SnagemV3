import { Link } from "react-router-dom";

// Served from public/images so the static boot shell in index.html and this
// component render the exact same file (no duplicate hashed download).
const snagemLogo = "/images/snag-hand-logo.png";

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
export function MarketingTopBar(props: { active?: "home" | "about"; context?: "auth" }) {
  const activeStyle = { color: "#fff", borderBottom: "2px solid #E54156", paddingBottom: 2 };
  return (
    <header className="dc-topbar">
      <Link to="/" className="dc-topbar-brand" aria-label="Snagem Guild home">
        <img src={snagemLogo} alt="" height={38} />
        <span>SNAGEM</span>
      </Link>
      <nav className="dc-topbar-links">
        {props.context !== "auth" && (
          <Link to="/" style={props.active === "home" ? activeStyle : undefined}>
            Home
          </Link>
        )}
        <Link to="/About" style={props.active === "about" ? activeStyle : undefined}>
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
      <img src={snagemLogo} alt="Snagem Guild" height={34} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13 }}>&copy; 2026 The Snagem Guild</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
        <Link to="/Policies">Policies</Link>
        <Link to="/Library">Library</Link>
        <Link to="/About">About</Link>
      </div>
    </footer>
  );
}
