import { getDb } from "../context/firebase";

/**
 * Public marketing blog. Posts live in blogPosts/{slug} (the doc id IS the
 * URL slug). Published posts are world-readable per Firestore rules and are
 * the only forum-independent indexable content on the site; drafts are
 * admin-only. All writes are admin-only. Post URLs land in their own child
 * sitemap (public/sitemap-blog.xml, built by scripts/gen-sitemap.mjs from
 * the Firestore REST API on every deploy).
 */
export interface BlogPost {
  /** Doc id and URL slug, e.g. "welcome-to-the-guild". */
  id: string;
  /** Post title; also the meta title (keep within 60 characters). */
  title: string;
  /** Meta description and card blurb, 50 to 160 characters. */
  description: string;
  /** Tiptap HTML. Sanitize with DOMPurify before rendering. */
  content: string;
  /** Optional cover image URL (WebP preferred, 1200x630 doubles as OG image). */
  coverImageUrl?: string;
  /** Display name shown as the author. */
  author: string;
  published: boolean;
  publishedAt?: { seconds: number };
  updatedAt?: { seconds: number };
  createdAt?: { seconds: number };
}

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Published posts, newest first (composite index: published + publishedAt). */
export const getPublishedPosts = async (): Promise<BlogPost[]> => {
  const { collection, getDocs, orderBy, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(
      collection(db, "blogPosts"),
      where("published", "==", true),
      orderBy("publishedAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
};

/** Every post including drafts; admin-only per rules. */
export const getAllPosts = async (): Promise<BlogPost[]> => {
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(query(collection(db, "blogPosts"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
};

export const getPost = async (slug: string): Promise<BlogPost | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "blogPosts", slug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BlogPost;
};

export const saveBlogPost = async (
  slug: string,
  data: Omit<BlogPost, "id" | "publishedAt" | "updatedAt" | "createdAt">,
  isNew: boolean,
): Promise<void> => {
  const { doc, getDoc, serverTimestamp, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  const ref = doc(db, "blogPosts", slug);
  const existing = isNew ? null : (await getDoc(ref)).data();
  // publishedAt is stamped the first time the post goes live and then kept
  // stable so later edits do not reshuffle the blog order.
  const publishedAt =
    existing?.publishedAt ?? (data.published ? serverTimestamp() : null);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt ?? serverTimestamp(),
      publishedAt,
    },
    { merge: true },
  );
};

export const deleteBlogPost = async (slug: string): Promise<void> => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  const db = await getDb();
  await deleteDoc(doc(db, "blogPosts", slug));
};

export const formatPostDate = (ts?: { seconds: number }): string =>
  ts?.seconds
    ? new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

/** ISO date for schema.org, e.g. 2026-07-19. */
export const isoPostDate = (ts?: { seconds: number }): string | undefined =>
  ts?.seconds ? new Date(ts.seconds * 1000).toISOString() : undefined;
