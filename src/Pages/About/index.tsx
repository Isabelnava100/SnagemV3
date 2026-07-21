import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { Kicker, MarketingFooter, MarketingTopBar } from "../../components/redesign/Marketing";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
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

const CURRENCIES: Array<{ icon: SnagIconName; color: string; title: string; body: string }> = [
  {
    icon: "coin",
    color: "#C9940F",
    title: "Snag Coins",
    body: "The main currency. Earned by posting, missions, and the weekly Snag List, spent at the Snag Mall.",
  },
  {
    icon: "gengar",
    color: "#7E2C75",
    title: "Gengar Tokens",
    body: "Casino currency. Trade Snag Coins at the Exchange Cage, then win big (or not) at the tables.",
  },
  {
    icon: "medal",
    color: "#1f6f7a",
    title: "Snag Emblems",
    body: "Prestige tokens from tournaments and events. The only thing E.V.O.'s move studio will accept.",
  },
];

const STEPS = [
  { n: "1", title: "Apply to Join", body: "Write a short roleplay application, or claim your old Gaia account." },
  { n: "2", title: "Build Your Trainer", body: "Create a character, claim a starter, and put together your first team." },
  { n: "3", title: "Start Posting", body: "Open a thread and write. The game takes it from there." },
];

export default function About() {
  return (
    <div className="ab">
      <Seo page="/About" pageType="AboutPage" />
      <MarketingTopBar active="about" />

      {/* Hero */}
      <section className="ab-hero">
        <div className="ab-hero-inner">
          <Kicker>The Guild // Who We Are</Kicker>
          <h1 className="ab-h1">
            ABOUT THE
            <br />
            SNAGEM GUILD
          </h1>
          <p className="ab-lede">
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

      <div className="ab-wrap">
        {/* 01 Who we are */}
        <section className="ab-section">
          <div className="dc-section-num">01</div>
          <h2 className="ab-sec-head">WHO WE ARE</h2>
          <p className="ab-p">
            The guild started on Gaia Online in 2004 and grew into its own world: a living region of
            Shadow Pokemon, guild missions, and member-run story arcs.
          </p>
          <p className="ab-p">
            Members write story posts together. Each post rolls encounters, resolves battles, and
            grows your team. Hosts close the thread and hand out the rewards.
          </p>
          <Kicker>The World</Kicker>
          <img
            className="ab-worldimg"
            src="/images/team-group.webp"
            alt="Team Snagem members and their Pokemon, guild group art"
            width={1113}
            height={1466}
            loading="lazy"
            decoding="async"
          />
        </section>

        {/* 02 What you can do */}
        <section className="ab-section" id="what-you-can-do">
          <div className="dc-section-num">02</div>
          <h2 className="ab-sec-head">WHAT YOU CAN DO HERE</h2>
          <p className="ab-sec-sub">Nine ways to play, all feeding the same story.</p>
          <div className="ab-grid">
            {WHAT_YOU_CAN_DO.map((c) => (
              <div className="ab-card" key={c.title}>
                <SnagIcon name={c.icon} size={28} color="#FFD074" />
                <div className="ab-card-title">{c.title}</div>
                <div className="ab-card-body">{c.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 Earn your keep */}
        <section className="ab-section">
          <div className="dc-section-num">03</div>
          <h2 className="ab-sec-head">EARN YOUR KEEP</h2>
          <p className="ab-sec-sub">
            Three currencies, one weekly rhythm, and a mall full of ways to spend it all.
          </p>
          <div className="ab-cur">
            {CURRENCIES.map((c) => (
              <div className="ab-cur-card" key={c.title} style={{ borderColor: c.color }}>
                <SnagIcon name={c.icon} size={26} color={c.color} />
                <div className="ab-cur-title" style={{ color: c.color }}>
                  {c.title}
                </div>
                <div className="ab-cur-body">{c.body}</div>
              </div>
            ))}
          </div>

          <div className="ab-detail">
            <div className="ab-detail-title">THE WEEKLY RHYTHM</div>
            <div className="ab-detail-row">
              The Snag List: six weekly tasks (battle, gamble, post, catch, join an activity, spend).
              Clear all six and pick a Weekly Mystery Box: a random Mall item, a coin stash, or an egg
              that hatches on the spot.
            </div>
            <div className="ab-detail-row">
              The Berry Farm: plant one bag berry in an open plot and harvest two after seven days.
            </div>
            <div className="ab-detail-row">
              The Fishing Pond: cast once a week with a Mall rod. Bites run 1★ to 3★ Water-types;
              battle and catch, or release for a coin.
            </div>
            <Link to="/Activities" className="dc-cta dc-cta-gold" style={{ marginTop: 14 }}>
              See This Week&apos;s List
            </Link>
          </div>

          <div className="ab-detail">
            <div className="ab-detail-title">ITEMS &amp; GEAR</div>
            <div className="ab-detail-row">
              Balls, medicine, and berries from the Golden Sarcophagus. Balls decide what you can
              catch in threads; potions and berries keep your team standing in battle.
            </div>
            <div className="ab-detail-row">
              Reagents and crafting: rare wares rotate daily; Ambrosia&apos;s cauldron brews them into
              capsules and held items. Failed brews still eat the ingredients.
            </div>
            <div className="ab-detail-row">
              Nothing goes to waste: old gear recycles for coins at the Trash Shack, and anything can
              be traded member-to-member at the Trading Post.
            </div>
            <Link to="/Shop" className="dc-cta dc-cta-red" style={{ marginTop: 14 }}>
              Browse the Snag Mall
            </Link>
          </div>
        </section>

        {/* How to get in */}
        <section className="ab-section">
          <div className="dc-section-num" style={{ fontSize: 0 }} aria-hidden />
          <h2 className="ab-sec-head">HOW TO GET IN</h2>
          <div className="ab-steps">
            {STEPS.map((s) => (
              <div className="ab-step" key={s.n}>
                <div className="ab-step-num">{s.n}</div>
                <div>
                  <div className="ab-step-title">{s.title}</div>
                  <div className="ab-step-body">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/Register"
            className="dc-cta dc-cta-red"
            style={{ marginTop: 18, width: "100%" }}
          >
            Join the Guild
          </Link>
        </section>
      </div>

      <div className="ab-closing">LET&apos;S MAKE GREAT STORIES TOGETHER</div>
      <MarketingFooter />
    </div>
  );
}
