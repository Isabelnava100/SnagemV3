import {
  Anchor,
  Avatar,
  Box,
  Button,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import { useAuth } from "../../context/AuthContext";
import { SnagIcon } from "../../icons/SnagIcon";
import { isAdmin } from "../../lib/permissions";
import {
  SNAG_TASKS,
  SnagTask,
  currentWeekId,
  getSnagList,
  resetCountdown,
} from "../../queries/activities";
import { getChallengeProgress, getGymRegions } from "../../queries/challenges";

/**
 * S.N.A.G. — the guild's help device. A self-contained FAQ/SOP chat: it
 * answers "where do I find X / how does Y work" from a built-in knowledge
 * base, checks the member's own progress for personal questions (weekly Snag
 * List, badge runs), and takes suggestions / bug reports / open questions as
 * tickets for the staff Dev Board. It is intentionally NOT connected to any
 * external AI: what it cannot answer it offers to send to the staff.
 */

type Msg = { from: "user" | "snag"; node: React.ReactNode };
type Intake = "suggestion" | "bug" | "question" | null;

const TASK_LABEL: Record<SnagTask, string> = {
  battle: "win a Colosseum battle",
  casino: "play a Casino game",
  post: "publish a forum post",
  catch: "catch a pokemon",
  activity: "join a mission or event",
  mall: "buy or recycle at the Mall",
};

function L(props: { to: string; children: React.ReactNode }) {
  return (
    <Anchor component={Link} to={props.to} c="blue.3" fz="inherit">
      {props.children}
    </Anchor>
  );
}

/** One knowledge entry: patterns + an answer builder (may fetch data). */
interface KbEntry {
  match: RegExp;
  answer: (ctx: {
    uid: string | null;
    admin: boolean;
    text: string;
  }) => Promise<React.ReactNode> | React.ReactNode;
}

const KB: KbEntry[] = [
  {
    // Admin SOP: where tools live. Checked before generic "where is" rules.
    match: /safari\s*contest|launch.*safari|safari.*launch/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Safari Contests are configured and launched from{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Game Content &gt; Safari Contest</L>: set the
          star pools and rates, then Save &amp; Launch to open the thread composer in
          Safari mode.
        </>
      ) : (
        <>
          Safari Contests are staff-launched events. When one is live you will find its
          thread in the <L to="/Forum/Events">Events forum</L>: roll an encounter there,
          then fight, feed, or throw a ball each post.
        </>
      ),
  },
  {
    match: /master\s*mission|hybrid|channeler|clearance/i,
    answer: () => (
      <>
        Master Missions are the Hybrid and Channeler progression missions. Request
        clearance from the <L to="/Research">Research page</L>; once you are Master tier
        the <L to="/Forum/Master-Mission">Master Missions forum</L> appears in your forum
        tabs. Background reading:{" "}
        <L to="/Library?tab=forums">Library &gt; The Charter</L>.
      </>
    ),
  },
  {
    match: /weekly|snag\s*list|snag\s*box|missing.*reward|reward.*missing/i,
    answer: async ({ uid }) => {
      if (!uid) {
        return (
          <>
            Sign in and I can check your week. The weekly Snag List lives on the{" "}
            <L to="/Activities">Activities page</L>: six tasks, reset every Monday.
          </>
        );
      }
      const list = await getSnagList(uid);
      const fresh = list.weekId === currentWeekId() ? list : {};
      const missing = SNAG_TASKS.filter((t) => !fresh.tasks?.[t]);
      if (!missing.length) {
        return (
          <>
            Your Snag List is complete this week{fresh.boxClaimed ? " and the box is claimed" : ""}!{" "}
            {fresh.boxClaimed ? (
              "New tasks arrive Monday."
            ) : (
              <>
                Claim your weekly box on the <L to="/Activities">Activities page</L>.
              </>
            )}
          </>
        );
      }
      return (
        <>
          You still need to: {missing.map((t) => TASK_LABEL[t]).join(", ")}. The week
          resets in {resetCountdown()}. Track it on the{" "}
          <L to="/Activities">Activities page</L>.
        </>
      );
    },
  },
  {
    match: /next\s*badge|badge.*(kanto|johto|hoenn|sinnoh|unova|kalos|galar|paldea|alola)|(kanto|johto|hoenn|sinnoh|unova|kalos|galar|paldea|alola).*badge/i,
    answer: async ({ uid, text }) => {
      if (!uid) {
        return (
          <>
            Sign in and I can check your badge case. Badge runs live on the{" "}
            <L to="/Challenges">Challenges page</L>.
          </>
        );
      }
      const [regions, progress] = await Promise.all([
        getGymRegions(),
        getChallengeProgress(uid),
      ]);
      const wanted = regions.find((r) =>
        text.toLowerCase().includes(String(r.name ?? r.id).toLowerCase())
      );
      const region = wanted ?? regions[0];
      if (!region) {
        return (
          <>
            No gym regions are configured yet; check the{" "}
            <L to="/Challenges">Challenges page</L>.
          </>
        );
      }
      const earned = new Set(progress.badges?.[region.id] ?? []);
      const next = [...(region.gyms ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .find((g) => !earned.has(g.leaderName));
      return next ? (
        <>
          In {region.name}: you hold {earned.size}/{(region.gyms ?? []).length} badges. Your
          next battle is {next.leaderName}
          {next.type ? ` (${next.type} gym)` : ""}. Request it from the{" "}
          <L to="/Challenges">Challenges page</L>.
        </>
      ) : (
        <>
          You have every {region.name} badge ({earned.size}/{(region.gyms ?? []).length}).
          Pick another region on the <L to="/Challenges">Challenges page</L>.
        </>
      );
    },
  },
  {
    match: /requirement|what.*missing|close.*thread|mission target|finish.*mission/i,
    answer: () => (
      <>
        Every mission thread pins a Mission Targets checklist at the top showing which
        set foes are beaten and which remain; the thread cannot close for grading until
        all are down. Open your thread and check the banner, or see{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L> for how beating foes
        works.
      </>
    ),
  },
  {
    match: /battle|damage|effectiv|type chart|health|hp|faint|star|flee|run away|potion|revive/i,
    answer: () => (
      <>
        The whole battle system (stars, posts to beat, damage, HP, healing items,
        run-away odds, and the type chart) is written up in{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L>. Quick version: your
        pokemon strikes first, enemies deal flat star-based damage to your chosen
        fighter, and type matchups scale both directions between x0.5 and x2.
      </>
    ),
  },
  {
    match: /activit.*(next|coming|launch)|next.*(event|activit)|coming up|upcoming/i,
    answer: () => (
      <>
        Upcoming activities are announced on the{" "}
        <L to="/Announcements">Announcements page</L> and on your{" "}
        <L to="/Dashboard">dashboard banner</L>. Live events appear in the{" "}
        <L to="/Forum/Events">Events forum</L>. If it is not announced yet, the staff
        have not scheduled it; want me to pass a question to them?
      </>
    ),
  },
  {
    match: /permission|who can (create|post)|why can.?t i (create|post|make)/i,
    answer: () => (
      <>
        Each forum has its own creation rules; for example, mission threads are never
        created directly, you pick one up from the <L to="/Missions">Mission hub</L>.
        The full matrix is in <L to="/Library?tab=forums">Library &gt; The Charter</L>.
      </>
    ),
  },
  {
    match: /where.*(shop|mall|buy)|shop.*where/i,
    answer: () => (
      <>
        The <L to="/Shop">Snag Mall</L>: storefronts for items, recycling, tours and evo
        services. Coins come from missions, events and the reward reviews.
      </>
    ),
  },
  {
    match: /where.*(team|pokemon|character|profile|dashboard)|my (team|pokemon|character)/i,
    answer: () => (
      <>
        Your <L to="/Dashboard">Console dashboard</L> holds your characters, teams,
        pokemon boxes, items, drafts and settings. Teams are managed under Pokemon,
        characters under Characters.
      </>
    ),
  },
  {
    match: /library|pokedex|item catalog|lore|archive/i,
    answer: () => (
      <>
        The <L to="/Library">Library</L> is the public reference: Pokedex (with star
        ratings), item catalog, battle guide, forum guide, shadow guide, encounter
        lists, lore archives, and the help desk FAQ.
      </>
    ),
  },
  {
    match: /rule|conduct|policy|privacy|terms/i,
    answer: () => (
      <>
        House rules live under <L to="/Policies">Policies</L>: community rules, privacy,
        cookies, and terms.
      </>
    ),
  },
];

const GREETING: React.ReactNode = (
  <>
    S.N.A.G. online. Ask me where anything lives or how it works: battles, missions,
    badges, your weekly Snag List. I can also take a suggestion, a bug report, or pass a
    question to the staff.
  </>
);

export default function SnagAgent() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [messages, setMessages] = React.useState<Msg[]>([{ from: "snag", node: GREETING }]);
  const [input, setInput] = React.useState("");
  const [intake, setIntake] = React.useState<Intake>(null);
  const [busy, setBusy] = React.useState(false);
  const viewport = React.useRef<HTMLDivElement>(null);

  const push = (msg: Msg) => setMessages((m) => [...m, msg]);
  React.useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submitTicket = async (kind: Exclude<Intake, null>, text: string) => {
    const { addDoc, collection } = await import("firebase/firestore");
    const { db } = await import("../../context/firebase");
    await addDoc(collection(db, "tickets"), {
      type: kind === "suggestion" ? "dev_suggestion" : kind === "bug" ? "dev_bug" : "member_question",
      text: text.slice(0, 4000),
      actorUid: user?.uid ?? "",
      actorName: user?.displayName ?? user?.username ?? "Unknown",
      status: "new",
      createdAt: new Date(),
    });
  };

  const startIntake = (kind: Exclude<Intake, null>) => {
    if (!user) {
      push({ from: "snag", node: "You need to be signed in so the staff know who sent it." });
      return;
    }
    setIntake(kind);
    push({
      from: "snag",
      node:
        kind === "suggestion"
          ? "Great, I'm listening. Type your suggestion and I'll file it for the staff."
          : kind === "bug"
          ? "Sorry about that! Describe what went wrong (what you did, what you expected) and I'll report it."
          : "Type the question and I'll pass it to the staff; they'll get back to you.",
    });
  };

  const respond = async (text: string) => {
    const lower = text.toLowerCase();
    // Intake intents first (explicit words beat the knowledge base).
    if (/suggest/i.test(lower) && !intake) return startIntake("suggestion");
    if (/(found|report|there.?s).*(error|bug|broken)|bug|error/i.test(lower) && !intake) {
      return startIntake("bug");
    }
    for (const entry of KB) {
      if (entry.match.test(text)) {
        setBusy(true);
        try {
          const node = await entry.answer({ uid: user?.uid ?? null, admin, text });
          push({ from: "snag", node });
        } catch {
          push({
            from: "snag",
            node: "I hit static trying to look that up. Try again in a moment.",
          });
        } finally {
          setBusy(false);
        }
        return;
      }
    }
    // No match: offer to send it to the staff (no external AI on this device).
    push({
      from: "snag",
      node: (
        <>
          That one is outside my manual. I can send it to the staff as a question — use
          the &quot;Ask the staff&quot; button below, or browse the{" "}
          <L to="/Library">Library</L> and <L to="/Library?tab=faq">Help Desk</L>.
        </>
      ),
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push({ from: "user", node: text });
    if (intake) {
      const kind = intake;
      setIntake(null);
      setBusy(true);
      try {
        await submitTicket(kind, text);
        push({
          from: "snag",
          node:
            kind === "suggestion"
              ? "Filed! Your suggestion is in the staff inbox. Thank you."
              : kind === "bug"
              ? "Reported! The staff will look into it. Thanks for flagging it."
              : "Sent! The staff will pick it up from their inbox.",
        });
      } catch {
        push({ from: "snag", node: "The transmission failed; try sending that again." });
      } finally {
        setBusy(false);
      }
      return;
    }
    await respond(text);
  };

  const chips: Array<{ label: string; text?: string; action?: () => void }> = [
    { label: "My weekly Snag List", text: "What am I missing for my weekly reward?" },
    { label: "Next badge", text: "What's the next badge I can battle for in Kanto?" },
    { label: "How do battles work?", text: "How do battles and damage work?" },
    { label: "Make a suggestion", action: () => startIntake("suggestion") },
    { label: "Report a bug", action: () => startIntake("bug") },
    { label: "Ask the staff", action: () => startIntake("question") },
  ];

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <PageHero
        eyebrow="Support Network Assistance Gadget"
        title="S.N.A.G."
        subtitle="The guild's help device. Ask where things are, how systems work, or send the staff a suggestion, bug report, or question."
        mb={20}
      />

      <Box
        style={{
          borderRadius: 16,
          border: "1px solid #232028",
          background: "#141318",
          overflow: "hidden",
        }}
      >
        <ScrollArea h={420} viewportRef={viewport} p="md">
          <Stack gap={10} p={4}>
            {messages.map((m, i) => (
              <Group
                key={i}
                align="flex-start"
                gap={8}
                wrap="nowrap"
                justify={m.from === "user" ? "flex-end" : "flex-start"}
              >
                {m.from === "snag" && (
                  <Avatar radius="xl" size={30} bg="#241f2e">
                    <SnagIcon name="walkie" size={18} cut="#241f2e" title="S.N.A.G." />
                  </Avatar>
                )}
                <Box
                  px={12}
                  py={8}
                  maw="80%"
                  style={{
                    borderRadius: 12,
                    background: m.from === "user" ? "#772976" : "#211f26",
                    border: m.from === "user" ? "none" : "1px solid #2a2637",
                  }}
                >
                  <Text fz={16} c="white" style={{ lineHeight: 1.55, wordBreak: "break-word" }}>
                    {m.node}
                  </Text>
                </Box>
              </Group>
            ))}
            {busy && (
              <Text fz={14} c="dimmed" role="status" aria-live="polite">
                S.N.A.G. is checking...
              </Text>
            )}
          </Stack>
        </ScrollArea>

        <Box p="sm" style={{ borderTop: "1px solid #232028" }}>
          <Group gap={6} mb={8} wrap="wrap">
            {chips.map((c) => (
              <Button
                key={c.label}
                size="compact-xs"
                radius="xl"
                variant="light"
                color="grape"
                onClick={() => {
                  if (c.action) c.action();
                  else if (c.text) {
                    push({ from: "user", node: c.text });
                    respond(c.text);
                  }
                }}
              >
                {c.label}
              </Button>
            ))}
          </Group>
          <Group gap={8} wrap="nowrap">
            <TextInput
              placeholder={
                intake
                  ? intake === "suggestion"
                    ? "Type your suggestion..."
                    : intake === "bug"
                    ? "Describe the bug..."
                    : "Type your question for the staff..."
                  : "Ask S.N.A.G. anything about the guild..."
              }
              aria-label="Message S.N.A.G."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              radius="xl"
              style={{ flex: 1 }}
              styles={{ input: { background: "#2E2D2E" } }}
            />
            <Button
              radius="xl"
              color="grape"
              onClick={handleSend}
              disabled={!input.trim() || busy}
              aria-label="Send message"
              leftSection={<IconSend size={16} />}
            >
              Send
            </Button>
          </Group>
          {intake && (
            <Text fz={14} c="gold.1" mt={6} role="status" aria-live="polite">
              {intake === "suggestion"
                ? "Recording a suggestion. Your next message goes to the staff."
                : intake === "bug"
                ? "Recording a bug report. Your next message goes to the staff."
                : "Recording a question. Your next message goes to the staff."}{" "}
              <Anchor
                component="button"
                type="button"
                fz={14}
                c="blue.3"
                onClick={() => {
                  setIntake(null);
                  push({ from: "snag", node: "Cancelled. What else can I help with?" });
                }}
              >
                Cancel
              </Anchor>
            </Text>
          )}
        </Box>
      </Box>

      <Text fz={14} c="dimmed" mt={10} ta="right">
        S.N.A.G. answers from the guild&apos;s own manuals and your progress; it is not
        connected to an external AI. Anything it cannot answer can be sent to the staff.
      </Text>
    </Container>
  );
}
