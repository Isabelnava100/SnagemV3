import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getDb } from "../context/firebase";
import { currentWeekId, getSnagList, SNAG_TASKS } from "../queries/activities";
import { getDaycare, getBattleConfig, DEFAULT_BATTLE_MECHANICS } from "../queries/game";
import { getItems } from "../queries/dashboard";

/**
 * One "needs your attention" item: shown on the dashboard panel and counted
 * for the nav badge dot. Everything here reads data the member already owns;
 * no new server writes or rules are involved.
 */
export interface AttentionItem {
  key: string;
  text: string;
  link: string;
}

const ROD_KEYS = new Set(["old-rod", "good-rod", "super-rod", "fishing-rod"]);

/**
 * True on the day before the weekly reset (Monday 00:00 UTC), i.e. Sunday UTC.
 * Used to hold back the unfinished-Snag-List nudge until it is actually urgent,
 * matching the Sunday `weeklyDeadlineReminder` cloud function.
 */
function isNearWeeklyReset(): boolean {
  return new Date().getUTCDay() === 0;
}

/**
 * Collects everything waiting on the member: hatchable egg, unused weekly
 * cast, unfinished Snag List / unclaimed box, open offers on their trade
 * listings, and their own open threads. Data is cached per react-query
 * defaults, so the dashboard panel and the nav dot share one set of reads.
 */
export function useAttention(): { items: AttentionItem[]; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid;

  const snagList = useQuery({
    queryKey: ["snag-list", uid],
    queryFn: () => getSnagList(uid!),
    enabled: !!uid,
  });
  const daycare = useQuery({
    queryKey: ["daycare", uid],
    queryFn: () => getDaycare(uid!),
    enabled: !!uid,
  });
  const battleCfg = useQuery({
    queryKey: ["battle-config"],
    queryFn: getBattleConfig,
    enabled: !!uid && !!daycare.data?.active,
  });
  const bagItems = useQuery({
    queryKey: ["get-items", uid],
    queryFn: () => getItems(uid!),
    enabled: !!uid,
  });
  // The egg's post clock compares against the user doc's postCount.
  const postCount = useQuery({
    queryKey: ["user-post-count", uid],
    queryFn: async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const db = await getDb();
      return Number((await getDoc(doc(db, "users", uid!))).data()?.postCount) || 0;
    },
    enabled: !!uid && !!daycare.data?.active,
  });

  // The Fishing Pond thread id lives in admin/fishing; the weekly cast claim
  // sits on the thread doc itself.
  const fishing = useQuery({
    queryKey: ["fishing-pond-claim", uid],
    queryFn: async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const db = await getDb();
      const cfg = (await getDoc(doc(db, "admin", "fishing"))).data();
      const pondThreadId = typeof cfg?.pondThreadId === "string" ? cfg.pondThreadId : "";
      if (!pondThreadId) return { hasPond: false, castUsed: false };
      const thread = (await getDoc(doc(db, "forum", "Events", "threads", pondThreadId))).data();
      const claims = (thread?.fishingClaims ?? {}) as Record<string, string>;
      return { hasPond: true, castUsed: claims[uid!] === currentWeekId() };
    },
    enabled: !!uid,
  });

  // Open offers on the member's own listings.
  const myListings = useQuery({
    queryKey: ["my-trade-listings", uid],
    queryFn: async () => {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const db = await getDb();
      const snap = await getDocs(
        query(
          collection(db, "tradeListings"),
          where("ownerUid", "==", uid),
          where("status", "==", "open")
        )
      );
      let openOffers = 0;
      snap.docs.forEach((d) => {
        const offers = (d.data().offers ?? {}) as Record<string, { status?: string }>;
        openOffers += Object.values(offers).filter((o) => o?.status === "open").length;
      });
      return openOffers;
    },
    enabled: !!uid,
  });

  // The member's own open threads (rules allow reading exactly these).
  const myOpenThreads = useQuery({
    queryKey: ["my-open-threads", uid],
    queryFn: async () => {
      const { collectionGroup, getDocs, query, where } = await import("firebase/firestore");
      const db = await getDb();
      const snap = await getDocs(
        query(collectionGroup(db, "threads"), where("hostUid", "==", uid))
      );
      return snap.docs.filter((d) => !d.data().closed && !!d.data().missionId).length;
    },
    enabled: !!uid,
  });

  const items: AttentionItem[] = [];
  if (uid) {
    // Daycare egg ready (same hatch math the server enforces).
    const d = daycare.data;
    if (d?.active) {
      const mech = battleCfg.data?.mechanics ?? DEFAULT_BATTLE_MECHANICS;
      const started = (d.startedAt?.seconds ?? 0) * 1000;
      const days = started ? (Date.now() - started) / 86_400_000 : 0;
      const posts = Math.max(0, (postCount.data ?? 0) - (d.startPostCount ?? 0));
      if (days >= (mech.hatchDays ?? 15) || posts >= (mech.hatchPosts ?? 30)) {
        items.push({ key: "egg", text: "Your Daycare egg is ready to hatch!", link: "/Daycare" });
      }
    }

    // Weekly cast: only nag members who own a rod.
    const ownsRod = (bagItems.data ?? []).some(
      (i) =>
        Number(i.quantity) > 0 && ROD_KEYS.has(String(i.name).toLowerCase().replace(/\s+/g, "-"))
    );
    if (ownsRod && fishing.data?.hasPond && !fishing.data.castUsed) {
      items.push({
        key: "cast",
        text: "You have not cast your line this week.",
        link: "/Activities",
      });
    }

    // Snag List progress and the box.
    const list = snagList.data;
    const sameWeek = list?.weekId === currentWeekId();
    const tasks = sameWeek ? (list?.tasks ?? {}) : {};
    const done = SNAG_TASKS.filter((t) => tasks[t]).length;
    if (done === SNAG_TASKS.length && sameWeek && !list?.boxClaimed) {
      items.push({
        key: "box",
        text: "Your Weekly Mystery Box is ready to open!",
        link: "/Activities",
      });
    } else if (done > 0 && done < SNAG_TASKS.length && isNearWeeklyReset()) {
      // Only nag about unfinished Snag List tasks right before the Monday 00:00
      // UTC reset (Sunday UTC), so it does not sit on the dashboard all week.
      items.push({
        key: "snaglist",
        text: `Snag List: ${done}/${SNAG_TASKS.length} done this week, resets soon.`,
        link: "/Activities",
      });
    }

    if ((myListings.data ?? 0) > 0) {
      items.push({
        key: "offers",
        text: `${myListings.data} open offer${myListings.data === 1 ? "" : "s"} on your trade listings.`,
        link: "/Trading",
      });
    }

    if ((myOpenThreads.data ?? 0) > 0) {
      items.push({
        key: "missions",
        text: `${myOpenThreads.data} open mission thread${myOpenThreads.data === 1 ? "" : "s"} waiting on you.`,
        link: "/Missions",
      });
    }
  }

  const loading =
    !!uid && (snagList.isPending || daycare.isPending || fishing.isPending || myListings.isPending);
  return { items, loading };
}
