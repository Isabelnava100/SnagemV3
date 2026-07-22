import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { Kicker, MarketingFooter, MarketingTopBar } from "../../components/redesign/Marketing";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
import useMediaQuery from "../../hooks/useMediaQuery";
import "../../assets/styles/about.css";

// Nine ways to play. Icons reuse the existing SnagIcon set (no new art).
const WHAT_YOU_CAN_DO: Array<{ icon: SnagIconName; title: string; body: string }> = [
  { icon: "book", title: "Write the Story", body: "Collaborative roleplay threads where every post moves the world forward." },
  { icon: "swords", title: "Battle in the Colosseum", body: "Training bouts and hosted battles with type matchups, crits, and weather." },
  { icon: "pokeball", title: "Snag Wild Pokemon", body: "Posts roll encounters by star rarity. Throw a ball or battle it out." },
  { icon: "ghost", title: "Purify the Shadows", body: "Corrupted Shadow Pokemon roam the world. Writing brings them back." },
  { icon: "map", title: "Take on Missions", body: "Guild missions and challenges launch you into new threads with rewards." },
  { icon: "egg", title: "Breed at the Daycare", body: "Pair compatible Pokemon, hatch eggs, and raise the next generation." },
  { icon: "dice", title: "Try Your Luck", body: "The Casino and lotto run on Gengar Tokens. Fortune favors the bold." },
  { icon: "coin", title: "Shop and Trade", body: "Spend Snag Coins at the Snag Mall, or trade Pokemon and items with members." },
  { icon: "users", title: "Join the Community", body: "Two decades of members, hosts, and staff keeping the world alive." },
];

// Bright display title + deeper border, per the hi-fi mockup.
const CURRENCIES: Array<{
  icon: SnagIconName;
  border: string;
  titleColor: string;
  title: string;
  body: string;
}> = [
  {
    icon: "coin",
    border: "#C9940F",
    titleColor: "#FFD074",
    title: "Snag Coins",
    body: "The main currency. Earned by posting, missions, and the weekly Snag List, spent at the Snag Mall.",
  },
  {
    icon: "gengar",
    border: "#7E2C75",
    titleColor: "#c79bd6",
    title: "Gengar Tokens",
    body: "Casino currency. Trade Snag Coins at the Exchange Cage, then win big (or not) at the tables.",
  },
  {
    icon: "medal",
    border: "#1f6f7a",
    titleColor: "#12B7B6",
    title: "Snag Emblems",
    body: "Prestige tokens from tournaments and events. The only thing E.V.O.'s move studio will accept.",
  },
];

// Detail cards: a small red-rule kicker, a display heading, glyph rows with a
// bold lead-in, and a gradient CTA. Gradient rides on a dc-cta class so the
// text color keeps its !important contrast (gold fill = dark text).
const DETAILS: Array<{
  kicker: string;
  heading: string;
  rows: Array<{ icon: SnagIconName; lead: string; body: string }>;
  cta: { to: string; label: string; cls: string; gradient: string };
}> = [
  {
    kicker: "The Weekly Rhythm",
    heading: "EVERY MONDAY, THE GUILD RESETS",
    rows: [
      {
        icon: "target",
        lead: "The Snag List",
        body: ": six weekly tasks: battle, gamble, post, catch, join an activity, spend. Clear all six and pick a Weekly Mystery Box: a random Mall item, a coin stash, or an egg that hatches on the spot.",
      },
      {
        icon: "sparkle",
        lead: "The Berry Farm",
        body: ": plant one bag berry in an open plot and harvest two after seven days.",
      },
      {
        icon: "pin",
        lead: "The Fishing Pond",
        body: ": cast once a week with a Mall rod. Bites run 1★ to 3★ Water-types; battle and catch, or release for a coin.",
      },
    ],
    cta: {
      to: "/Activities",
      label: "See This Week's List",
      cls: "dc-cta-red",
      gradient: "linear-gradient(90deg,#7E2C75,#E54156)",
    },
  },
  {
    kicker: "Items & Gear",
    heading: "EVERYTHING YOU BUY GETS USED",
    rows: [
      {
        icon: "pokeball",
        lead: "Balls, medicine, and berries",
        body: " from the Golden Sarcophagus. Balls decide what you can catch in threads; potions and berries keep your team standing in battle.",
      },
      {
        icon: "flask",
        lead: "Reagents and crafting",
        body: ": rare wares rotate daily; Ambrosia's cauldron brews them into capsules and held items. Failed brews still eat the ingredients.",
      },
      {
        icon: "exchange",
        lead: "Nothing goes to waste",
        body: ": old gear recycles for coins at the Trash Shack, and anything can be traded member-to-member at the Trading Post.",
      },
    ],
    cta: {
      to: "/Shop",
      label: "Browse the Snag Mall",
      cls: "dc-cta-gold",
      gradient: "linear-gradient(90deg,#FFD074,#C9940F)",
    },
  },
];

const STEPS = [
  { n: "1", title: "Apply to Join", body: "Write a short roleplay application, or claim your old Gaia account." },
  { n: "2", title: "Build Your Trainer", body: "Create a character, claim a starter, and put together your first team." },
  { n: "3", title: "Start Posting", body: "Open a thread and write. The game takes it from there." },
];

const SECTION_NUM: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(42px, 9vw, 64px)",
  lineHeight: 1,
  color: "#fff",
};
const SEC_HEAD: React.CSSProperties = { fontSize: "clamp(28px, 5vw, 44px)" };

export default function About() {
  const { isOverSm } = useMediaQuery();

  return (
    <div className="ab">
      <Seo page="/About" pageType="AboutPage" />
      <MarketingTopBar active="about" />

      {/* Hero: dark base with a right diagonal magenta/red panel */}
      <section
        className="ab-hero"
        style={{
          background: "#0e0d11",
          padding: isOverSm ? "90px 20px 84px" : undefined,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: isOverSm ? "46%" : "100%",
            background: isOverSm
              ? "linear-gradient(200deg,rgba(145,38,145,.30),rgba(229,65,86,.12))"
              : "linear-gradient(200deg,rgba(145,38,145,.26),rgba(229,65,86,.10))",
            clipPath: isOverSm ? "polygon(22% 0,100% 0,100% 100%,0 100%)" : undefined,
            pointerEvents: "none",
          }}
        />
        <div className="ab-hero-inner">
          <Kicker>The Guild // Who We Are</Kicker>
          <h1 className="ab-h1" style={{ fontSize: "clamp(44px, 11vw, 96px)" }}>
            ABOUT THE
            <br />
            SNAGEM GUILD
          </h1>
          <p
            className="ab-lede"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: isOverSm ? 20 : 16, maxWidth: 560 }}
          >
            A free, fan-made Pokemon roleplay community. We write collaborative stories on custom
            forums, and the writing itself plays the game.
          </p>
          <div className="ab-cta-row">
            <Link to="/Register" className="dc-cta dc-cta-red">
              Start Roleplaying
            </Link>
            <a href="#what-you-can-do" className="dc-cta dc-cta-outline">
              What Else
            </a>
          </div>
        </div>
      </section>

      {/* 01 Who we are: copy + framed group art */}
      <div className="ab-wrap">
        <section className="ab-section">
          <div
            style={{
              display: "flex",
              flexDirection: isOverSm ? "row" : "column",
              gap: isOverSm ? 56 : 14,
              alignItems: isOverSm ? "center" : "stretch",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...SECTION_NUM, marginBottom: 14 }}>01</div>
              <h2 className="ab-sec-head" style={SEC_HEAD}>
                WHO <span style={{ color: "var(--dc-gold)" }}>WE ARE</span>
              </h2>
              <p className="ab-p">
                The guild started on Gaia Online in 2004 and grew into its own world: a living region
                of Shadow Pokemon, guild missions, and member-run story arcs.
              </p>
              <p className="ab-p">
                Members write story posts together. Each post rolls encounters, resolves battles, and
                grows your team. Hosts close the thread and hand out the rewards.
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--dc-cyan)",
                  border: "1.5px solid var(--dc-cyan)",
                  padding: "10px 20px",
                  marginTop: 6,
                  clipPath: "polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",
                }}
              >
                The World
              </span>
            </div>
            <div
              style={{
                flex: isOverSm ? "none" : undefined,
                width: isOverSm ? 460 : "100%",
                height: isOverSm ? 380 : 220,
                marginTop: isOverSm ? 0 : 6,
                border: "1px solid var(--dc-border-alt)",
                background: "var(--dc-card)",
                overflow: "hidden",
                clipPath:
                  "polygon(24px 0,100% 0,100% calc(100% - 24px),calc(100% - 24px) 100%,0 100%,0 24px)",
              }}
            >
              <img
                src="/images/team-group.webp"
                alt="Team Snagem members and their Pokemon, guild group art"
                width={1113}
                height={1466}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* 02 What you can do: full-width tinted band */}
      <div
        id="what-you-can-do"
        style={{
          background: "var(--dc-panel)",
          borderTop: "1px solid var(--dc-border)",
          borderBottom: "1px solid var(--dc-border)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(48px, 7vw, 90px) 20px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: isOverSm ? "row" : "column",
              alignItems: isOverSm ? "flex-end" : "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div>
              <div style={{ ...SECTION_NUM, marginBottom: 12 }}>02</div>
              <h2 className="ab-sec-head" style={{ ...SEC_HEAD, margin: 0 }}>
                WHAT YOU CAN <span style={{ color: "var(--dc-red)" }}>DO HERE</span>
              </h2>
            </div>
            <p className="ab-sec-sub" style={{ maxWidth: 380, margin: 0 }}>
              Nine ways to play, all feeding the same story.
            </p>
          </div>
          <div className="ab-grid">
            {WHAT_YOU_CAN_DO.map((c) => (
              <div className="ab-card" key={c.title}>
                <SnagIcon name={c.icon} size={30} color="#FFD074" />
                <div className="ab-card-title">{c.title}</div>
                <div className="ab-card-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 03 Earn your keep */}
      <div className="ab-wrap">
        <section className="ab-section">
          <div style={{ ...SECTION_NUM, marginBottom: 14 }}>03</div>
          <h2 className="ab-sec-head" style={SEC_HEAD}>
            EARN <span style={{ color: "var(--dc-gold)" }}>YOUR KEEP</span>
          </h2>
          <p className="ab-sec-sub">
            Three currencies, one weekly rhythm, and a mall full of ways to spend it all.
          </p>

          <div className="ab-cur">
            {CURRENCIES.map((c) => (
              <div className="ab-cur-card" key={c.title} style={{ borderColor: c.border }}>
                <SnagIcon name={c.icon} size={32} color={c.titleColor} />
                <div className="ab-cur-title" style={{ color: c.titleColor }}>
                  {c.title}
                </div>
                <div className="ab-cur-body">{c.body}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            {DETAILS.map((d) => (
              <div
                key={d.kicker}
                style={{
                  background: "var(--dc-card)",
                  border: "1px solid var(--dc-border-alt)",
                  padding: "26px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  clipPath:
                    "polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 28, height: 3, background: "var(--dc-red)" }} />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: "var(--dc-gold)",
                    }}
                  >
                    {d.kicker}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(20px, 2.4vw, 24px)",
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "0.02em",
                  }}
                >
                  {d.heading}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {d.rows.map((r) => (
                    <div key={r.lead} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <SnagIcon name={r.icon} size={22} color="#FFD074" style={{ marginTop: 2 }} />
                      <p style={{ fontSize: 14, color: "var(--dc-dim)", lineHeight: 1.55, margin: 0 }}>
                        <span style={{ color: "#fff", fontWeight: 700 }}>{r.lead}</span>
                        {r.body}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  to={d.cta.to}
                  className={`dc-cta ${d.cta.cls}`}
                  style={{
                    alignSelf: "flex-start",
                    background: d.cta.gradient,
                    fontSize: 13,
                    letterSpacing: "0.12em",
                    padding: "13px 26px",
                    marginTop: 2,
                  }}
                >
                  {d.cta.label}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* How to get in: tinted band with a diagonal gradient wedge */}
      <div
        style={{
          position: "relative",
          background: "var(--dc-panel)",
          borderTop: "1px solid var(--dc-border)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: isOverSm ? "44%" : "100%",
            background: "linear-gradient(160deg,rgba(145,38,145,.30),rgba(20,224,222,.10))",
            clipPath: isOverSm ? "polygon(0 0,100% 0,78% 100%,0 100%)" : undefined,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1100,
            margin: "0 auto",
            padding: "clamp(48px, 7vw, 90px) 20px",
          }}
        >
          <h2 className="ab-sec-head" style={{ ...SEC_HEAD, marginBottom: 28 }}>
            HOW TO <span style={{ color: "var(--dc-cyan)" }}>GET IN</span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  background: "rgba(14,13,17,0.75)",
                  border: "1px solid var(--dc-border-alt)",
                  padding: "24px 22px",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 40,
                    lineHeight: 1,
                    color: "#fff",
                    marginBottom: 10,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "0.03em",
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 14, color: "var(--dc-dim)", lineHeight: 1.55 }}>{s.body}</div>
              </div>
            ))}
          </div>
          <Link to="/Register" className="dc-cta dc-cta-red">
            Join the Guild
          </Link>
        </div>
      </div>

      <div className="ab-closing" style={{ color: "var(--dc-dim)", letterSpacing: "0.16em" }}>
        LET&apos;S MAKE GREAT STORIES <span style={{ color: "var(--dc-gold)" }}>TOGETHER</span>
      </div>
      <MarketingFooter />
    </div>
  );
}
