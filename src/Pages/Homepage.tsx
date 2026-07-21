import { preload } from "react-dom";
import { Link } from "react-router-dom";
import Seo from "../components/common/Seo";
import { Kicker, Marquee, MarketingFooter, MarketingTopBar } from "../components/redesign/Marketing";
import "/src/assets/styles/homepage.css";

// The hero background is the LCP image but lives in CSS, where the browser
// only discovers it after the stylesheet parses. Preload it as soon as the
// homepage chunk executes; never lazy-load it.
preload("/images/hero-bg.webp", { as: "image", fetchPriority: "high" });

// Numbered story modules: each keeps a real link to a live destination.
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
    label: "Read about Snagem",
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
    label: "See anticipated updates",
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
      <MarketingTopBar />

      {/* Hero */}
      <section className="hp-hero">
        <div className="hp-hero-inner">
          <Kicker>Pokemon Roleplay // Est 2004</Kicker>
          <h1 className="hp-h1">
            WRITE.
            <br />
            BATTLE.
            <br />
            SNAG.
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

      <Marquee text="THE SNAGEM GUILD ✦ WRITE THE STORY ✦ PLAY THE GAME ✦ CHARTERED 2004 ✦" />

      {/* Story modules */}
      <div className="hp-body">
        {STORY.map((s) => (
          <section className="hp-story" key={s.num}>
            <div className="dc-section-num">{s.num}</div>
            <h2 className="hp-story-head">{s.head}</h2>
            <p className="hp-story-body">{s.body}</p>
            <Link to={s.to} className="hp-arrow-link">
              {s.label} <span aria-hidden>&rarr;</span>
            </Link>
          </section>
        ))}
      </div>

      {/* Meet the team */}
      <section className="hp-team">
        <div className="hp-team-inner">
          <Kicker>The Roster</Kicker>
          <h2 className="hp-team-title">MEET THE TEAM</h2>
          <p className="hp-lede">
            A lot of us have dedicated years to the story, and we hope you join us along the way.
          </p>
          <img
            className="hp-team-img"
            src="/images/team-group.webp"
            alt="Team Snagem members and their Pokemon"
            width={1113}
            height={1466}
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* Join CTA */}
      <section className="hp-join">
        <Link to="/Register">JOIN THE TEAM &rarr;</Link>
      </section>

      <MarketingFooter />
    </div>
  );
};
