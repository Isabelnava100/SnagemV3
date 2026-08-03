import { getDb } from "../context/firebase";

/**
 * A member's forum activity, used by the dashboard History tab (the signed-in
 * member's own) and by the public profile's Recent Activity panel (any
 * member's). Both reads are collection-group queries filtered by uid. Forum
 * threads/posts are readable by any signed-in member via the /forum rules, so
 * passing another member's uid is allowed for them; only non-forum
 * posts/threads subcollections would fall back to the author-only wildcard
 * rules (none exist today).
 */

export interface MyThreadItem {
  id: string;
  /** Forum link segment (parent of the threads subcollection). */
  forum: string;
  title: string;
  closed: boolean;
  replyCount?: number;
  createdAt?: { seconds: number };
  missionId?: string;
  trainingLog?: boolean;
}

/** How many started threads the activity feeds surface. */
export const MY_THREADS_LIMIT = 25;

const toThreadItem = (d: {
  id: string;
  ref: { parent: { parent: { id: string } | null } };
  data: () => Record<string, any>;
}): MyThreadItem => {
  const data = d.data();
  return {
    id: d.id,
    forum: d.ref.parent.parent?.id ?? "Main-Forum",
    title: String(data.title ?? "Untitled thread"),
    closed: !!data.closed,
    replyCount: data.replyCount,
    createdAt: data.createdAt,
    missionId: data.missionId,
    trainingLog: data.trainingLog,
  };
};

/**
 * Every thread the member started (hostUid), newest first.
 *
 * Prefers the server-side ordered + limited read (needs the threads
 * hostUid + createdAt composite index). If that index is not deployed yet the
 * query throws failed-precondition, so we fall back to the unordered
 * collection-group read and sort/slice on the client. Safe to ship before or
 * after `firebase deploy --only firestore:indexes`; it self-upgrades once the
 * index is live.
 */
export const getMyThreads = async (uid: string): Promise<MyThreadItem[]> => {
  const { collectionGroup, getDocs, limit, orderBy, query, where } = await import(
    "firebase/firestore"
  );
  const db = await getDb();
  try {
    const snap = await getDocs(
      query(
        collectionGroup(db, "threads"),
        where("hostUid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(MY_THREADS_LIMIT)
      )
    );
    return snap.docs.map(toThreadItem);
  } catch (err) {
    // Missing composite index (failed-precondition) or any transient issue:
    // fall back to the original fetch-all + client sort so the feed still works.
    const snap = await getDocs(
      query(collectionGroup(db, "threads"), where("hostUid", "==", uid))
    );
    return snap.docs
      .map(toThreadItem)
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      .slice(0, MY_THREADS_LIMIT);
  }
};

export interface MyPostItem {
  id: string;
  forum: string;
  threadId: string;
  threadTitle: string;
  /** Plain-text preview of the post body. */
  snippet: string;
  timePosted?: { seconds: number };
}

export const MY_POSTS_LIMIT = 25;

/**
 * The member's latest posts across every forum (collection-group on posts,
 * ownerUid + timePosted composite index). Thread titles come from one extra
 * read per unique thread.
 */
export const getMyPosts = async (uid: string): Promise<MyPostItem[]> => {
  const { collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, where } = await import(
    "firebase/firestore"
  );
  const db = await getDb();
  const snap = await getDocs(
    query(
      collectionGroup(db, "posts"),
      where("ownerUid", "==", uid),
      orderBy("timePosted", "desc"),
      limit(MY_POSTS_LIMIT)
    )
  );

  const rows = snap.docs.map((d) => {
    const threadRef = d.ref.parent.parent!; // forum/{forum}/threads/{threadId}
    const data = d.data() as { text?: string; timePosted?: { seconds: number } };
    const snippet = String(data.text ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
    return {
      id: d.id,
      forum: threadRef.parent.parent?.id ?? "Main-Forum",
      threadId: threadRef.id,
      threadPath: threadRef.path,
      snippet,
      timePosted: data.timePosted,
    };
  });

  const uniquePaths = [...new Set(rows.map((r) => r.threadPath))];
  const titles = new Map<string, string>();
  await Promise.all(
    uniquePaths.map(async (path) => {
      const threadSnap = await getDoc(doc(db, path));
      titles.set(path, String(threadSnap.data()?.title ?? "Untitled thread"));
    })
  );

  return rows.map(({ threadPath, ...row }) => ({
    ...row,
    threadTitle: titles.get(threadPath) ?? "Untitled thread",
  }));
};
