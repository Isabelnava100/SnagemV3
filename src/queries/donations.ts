import { getDb } from "../context/firebase";

/**
 * Donation settings for the Library's Support the Guild wing (admin/donations).
 *
 * World-readable per Firestore rules: the wing is a public page, so a logged
 * out visitor has to be able to read the goal and the running total. Only
 * admins write it. No secrets belong here: the PayPal values are the same
 * public button ids and links PayPal puts in a checkout URL.
 *
 * The raised total is typed in by an admin for now. A server-side sync against
 * the PayPal transactions API is in docs/BACKLOG.md.
 */
export interface DonationConfig {
  /** Master switch: off hides the wing's donate controls, keeping the costs page. */
  enabled: boolean;
  /** Hosted button id from the PayPal Donate button generator (embedded button). */
  paypalHostedButtonId: string;
  /** Plain donate link (PayPal.me or a hosted donate URL). Opens in a new tab. */
  paypalDonateUrl: string;
  /** Subscribe link for the recurring plan. Opens in a new tab. */
  paypalSubscribeUrl: string;
  /** Minimum monthly pledge, in whole currency units. */
  minMonthly: number;
  /** The three milestones on the progress bar, smallest first. */
  goalEssentials: number;
  goalGrowth: number;
  goalStretch: number;
  /** Raised so far this year, typed in by an admin. */
  raised: number;
  /** When the raised figure was last touched, as a plain date string. */
  raisedUpdated: string;
  /** The year the totals cover, shown next to the bar. */
  year: string;
}

export const DEFAULT_DONATION_CONFIG: DonationConfig = {
  enabled: true,
  paypalHostedButtonId: "",
  paypalDonateUrl: "",
  paypalSubscribeUrl: "",
  minMonthly: 5,
  goalEssentials: 400,
  goalGrowth: 1000,
  goalStretch: 1500,
  raised: 0,
  raisedUpdated: "",
  year: "",
};

export const getDonationConfig = async (): Promise<DonationConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "admin", "donations"))).data() ?? {};
  const num = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    enabled: data.enabled !== false,
    paypalHostedButtonId: String(data.paypalHostedButtonId ?? ""),
    paypalDonateUrl: String(data.paypalDonateUrl ?? ""),
    paypalSubscribeUrl: String(data.paypalSubscribeUrl ?? ""),
    minMonthly: num(data.minMonthly, DEFAULT_DONATION_CONFIG.minMonthly),
    goalEssentials: num(data.goalEssentials, DEFAULT_DONATION_CONFIG.goalEssentials),
    goalGrowth: num(data.goalGrowth, DEFAULT_DONATION_CONFIG.goalGrowth),
    goalStretch: num(data.goalStretch, DEFAULT_DONATION_CONFIG.goalStretch),
    raised: num(data.raised, 0),
    raisedUpdated: String(data.raisedUpdated ?? ""),
    year: String(data.year ?? ""),
  };
};

export const saveDonationConfig = async (config: DonationConfig): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  await setDoc(doc(db, "admin", "donations"), config, { merge: true });
};

/**
 * The running-cost lines the wing shows. Kept in code (not Firestore) so the
 * page always explains where the money goes even before an admin configures
 * anything. Amounts are yearly, in USD.
 */
export interface CostLine {
  label: string;
  detail: string;
  yearly: number;
  /** Covered by donated time rather than money. */
  donated?: boolean;
}

export const COST_LINES: CostLine[] = [
  {
    label: "Domain",
    detail: "snagemguild.com, renewed every year.",
    yearly: 20,
  },
  {
    label: "Hosting and database",
    detail:
      "Firebase (accounts, posts, images, the game callables) plus the static site host. Billed on usage, so it grows with the guild.",
    yearly: 120,
  },
  {
    label: "AI subscription",
    detail: "The coding assistant used to build and maintain the site, at about $20 a month.",
    yearly: 240,
  },
  {
    label: "Emoji commissions",
    detail: "Around $20 each from real artists, aiming for one or two a month.",
    yearly: 360,
  },
  {
    label: "Icon and art commissions",
    detail: "About $15 each, roughly five a year to keep the site looking sharp.",
    yearly: 75,
  },
  {
    label: "Buffer",
    detail: "Price rises, a busy month of usage, and PayPal's cut of each donation.",
    yearly: 85,
  },
  {
    label: "Developer time",
    detail:
      "Design, code, moderation tools and upkeep. Donated, not billed: no part of your donation pays a salary.",
    yearly: 0,
    donated: true,
  },
];

export const COST_TOTAL = COST_LINES.reduce((sum, line) => sum + line.yearly, 0);
