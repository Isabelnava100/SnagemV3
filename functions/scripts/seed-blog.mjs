// Seeds the first (placeholder) blog post into blogPosts/. Idempotent: the
// doc id is the slug, so re-running updates it in place.
//
// Auth (run from the functions/ dir):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/seed-blog.mjs
import admin from "firebase-admin";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const SLUG = "welcome-to-the-guild-blog";

const content = `
<h2>A new home for guild stories</h2>
<p>Welcome to the Guild Blog! This is where the Snagem Guild shares what is happening across our Pokemon roleplay community: development updates, event recaps, guides for new trainers, and the occasional deep dive into the guild's Shadow Pokemon lore.</p>
<h2>What to expect here</h2>
<ul>
<li><strong>Dev updates</strong>: new features landing on the forums, dashboard and activities.</li>
<li><strong>Guides</strong>: how to start roleplaying, build a team, and survive your first mission.</li>
<li><strong>Community spotlights</strong>: standout threads, events and members.</li>
</ul>
<p>New here? Start with the <a href="/About">About page</a> to learn what the guild is, browse the <a href="/Library">Great Snagem Library</a> for guides, or jump straight into the public <a href="/Forum/Main-Forum">Main Adventures board</a> to read live roleplay.</p>
<p>This first post is a placeholder while the staff team warms up their quills. Real stories are on the way!</p>
`.trim();

await db.doc(`blogPosts/${SLUG}`).set(
  {
    title: "Welcome to the Snagem Guild Blog",
    description:
      "The Snagem Guild's new blog: dev updates, Pokemon roleplay guides and community stories from our long-running play-by-post guild. Here's what to expect.",
    content,
    coverImageUrl: "",
    author: "The Snagem Guild",
    published: true,
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(`Seeded blogPosts/${SLUG} (published). It appears at /Blog/${SLUG}.`);
process.exit(0);
