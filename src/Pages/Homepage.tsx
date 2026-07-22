import { preload } from "react-dom";
import { Link } from "react-router-dom";
import snagLogo from "../assets/images/snag-hand-logo.png";
import Seo from "../components/common/Seo";
import { MarketingTopBar } from "../components/redesign/Marketing";
import "/src/assets/styles/homepage.css";

// The hero background is the LCP image. Preload it as soon as the homepage
// chunk executes; never lazy-load it.
preload("/images/hero-bg.webp", { as: "image", fetchPriority: "high" });

const MARQUEE = "THE SNAGEM GUILD ✦ WRITE THE STORY ✦ PLAY THE GAME ✦ CHARTERED 2004 ✦ ";

// Numbered story modules; each keeps a real link to a live destination.
const STORY = [
  {
    num: "01",
    head: (
      <>
        A NEW WAY OF <span style={{ color: "#FFD074" }}>STORYTELLING</span>
      </>
    ),
    body: "Collaborative story posts are the engine. Writing is how you level up, evolve your Pokemon, and win battles.",
    to: "/About",
    label: "Read About Snagem",
  },
  {
    num: "02",
    head: (
      <>
        FORUMS BUILT <span style={{ color: "#E54156" }}>FOR ROLEPLAY</span>
      </>
    ),
    body: "A custom platform that adjusts to our needs, with battle threads, host tools, dice rolls, and rewards built in.",
    to: "/Announcements",
    label: "See Anticipated Updates",
  },
  {
    num: "03",
    head: (
      <>
        THE GAME <span style={{ color: "#12B7B6" }}>NEVER STOPS</span>
      </>
    ),
    body: "Missions, the Colosseum, the Casino, breeding, trading, and a living world of Shadow Pokemon to purify.",
    to: "/Library",
    label: "Explore the Library",
  },
];

export const HomePage = () => {
  return (
    <div className="hp">
      <Seo page="/" />
      <MarketingTopBar active="home" />

      {/* Hero: diagonal art panel on the right, text on the dark left */}
      <section className="hp-hero">
        <div className="hp-hero-art" aria-hidden />
        <div className="hp-hero-overlay" aria-hidden />
        <div className="hp-hero-inner">
          <div className="dc-kicker">Pokemon Roleplay // Est 2004</div>
          <h1 className="hp-h1">
            <span>WRITE.</span>
            <span>BATTLE.</span>
            <span>SNAG.</span>
          </h1>
          <p className="hp-lede">
            Every post you write is a move in the game. Roll encounters and snag wild Pokemon
            while you roleplay.
          </p>
          <div className="hp-hero-cta">
            <Link to="/About" className="dc-cta dc-cta-red">
              Discover What We Do
            </Link>
            <Link to="/Forum/Main-Forum" className="dc-cta dc-cta-outline">
              Go to the Forums
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="hp-marquee" aria-hidden>
        <div className="hp-marquee-track">
          <span>{MARQUEE.repeat(4)}</span>
          <span>{MARQUEE.repeat(4)}</span>
        </div>
      </div>

      {/* Story modules: number | content | right arrow link */}
      <div className="hp-story-wrap">
        {STORY.map((s) => (
          <section className="hp-story" key={s.num}>
            <span className="hp-story-num">{s.num}</span>
            <div className="hp-story-content">
              <h2 className="hp-story-head">{s.head}</h2>
              <p className="hp-story-body">{s.body}</p>
            </div>
            <Link to={s.to} className="hp-arrow-link">
              {s.label} <span aria-hidden style={{ fontSize: 20 }}>&rarr;</span>
            </Link>
          </section>
        ))}
      </div>

      {/* Meet the team: text left, art right, diagonal purple split */}
      <section className="hp-team">
        <div className="hp-team-split" aria-hidden />
        <div className="hp-team-inner">
          <div className="hp-team-text">
            <div className="dc-kicker">The Roster</div>
            <h2 className="hp-team-title">MEET THE TEAM</h2>
            <p className="hp-team-body">
              A lot of us have dedicated years to the story, and we hope you join us along the way.
            </p>
          </div>
          <img
            className="hp-team-img"
            src="/images/team-group.webp"
            alt="Team Snagem members and their Pokemon"
            width={1040}
            height={1370}
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* Join CTA */}
      <Link to="/Register" className="hp-join">
        <span>JOIN THE TEAM &rarr;</span>
      </Link>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-footer-left">
          <img src={snagLogo} alt="Snagem Guild" width={26} height={26} />
          <span>&copy; 2026 The Snagem Guild</span>
        </div>
        <nav className="hp-footer-links">
          <Link to="/Policies">Policies</Link>
          <Link to="/Library">Library</Link>
          <Link to="/About">About</Link>
        </nav>
      </footer>
    </div>
  );
};
