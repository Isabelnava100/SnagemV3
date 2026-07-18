import {
  Badge,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../../context/AuthContext";
import { SectionLoader } from "../../../../components/navigation/loading";

/**
 * Dev Board: the staff's development inbox and planning space.
 *  - Incoming: suggestions, bug reports and questions members sent through
 *    S.N.A.G. (tickets collection). Staff discard them or promote them into
 *    board tickets.
 *  - Tickets: the working list (open / in progress / done).
 *  - Notes: admin-to-admin planning notes ("what's coming up next") so the
 *    team can collab without leaving the site.
 * Storage: devBoard collection (admin-only by rules).
 */

interface Incoming {
  id: string;
  type: string;
  text: string;
  actorName: string;
  createdAt?: { seconds?: number };
}

interface BoardDoc {
  id: string;
  kind: "ticket" | "note";
  title: string;
  body: string;
  status?: "open" | "in_progress" | "done";
  createdByName?: string;
  source?: { actorName?: string; type?: string };
  updatedAt?: { seconds?: number };
}

const INCOMING_TYPES = ["dev_suggestion", "dev_bug", "member_question"];
const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  dev_suggestion: { label: "Suggestion", color: "cyan" },
  dev_bug: { label: "Bug", color: "pink" },
  member_question: { label: "Question", color: "indigo" },
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};
const STATUS_COLOR: Record<string, string> = {
  open: "gold.1",
  in_progress: "indigo",
  done: "cyan",
};

async function fetchIncoming(): Promise<Incoming[]> {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const { db } = await import("../../../../context/firebase");
  const snap = await getDocs(
    query(collection(db, "tickets"), where("type", "in", INCOMING_TYPES), where("status", "==", "new"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Incoming, "id">) }))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

async function fetchBoard(): Promise<BoardDoc[]> {
  const { collection, getDocs } = await import("firebase/firestore");
  const { db } = await import("../../../../context/firebase");
  const snap = await getDocs(collection(db, "devBoard"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<BoardDoc, "id">) }))
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
}

function dateOf(seconds?: number): string {
  return seconds ? new Date(seconds * 1000).toLocaleDateString() : "";
}

export default function DevBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [error, setError] = React.useState("");

  const incoming = useQuery({ queryKey: ["dev-incoming"], queryFn: fetchIncoming });
  const board = useQuery({ queryKey: ["dev-board"], queryFn: fetchBoard });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dev-incoming"] });
    queryClient.invalidateQueries({ queryKey: ["dev-board"] });
  };

  const act = useMutation({
    mutationFn: async (job: () => Promise<void>) => job(),
    onSuccess: refresh,
    onError: (e) => setError((e as Error).message || "That did not save. Try again."),
  });

  const resolveIncoming = (item: Incoming, promote: boolean) =>
    act.mutate(async () => {
      const { addDoc, collection, doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      if (promote) {
        await addDoc(collection(db, "devBoard"), {
          kind: "ticket",
          title: item.text.slice(0, 80),
          body: item.text,
          status: "open",
          createdByName: user?.displayName ?? user?.username ?? "",
          source: { actorName: item.actorName ?? "", type: item.type },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await updateDoc(doc(db, "tickets", item.id), {
        status: promote ? "accepted" : "discarded",
      });
    });

  const setStatus = (id: string, status: string) =>
    act.mutate(async () => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await updateDoc(doc(db, "devBoard", id), { status, updatedAt: new Date() });
    });

  const removeDoc = (id: string) =>
    act.mutate(async () => {
      const { deleteDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await deleteDoc(doc(db, "devBoard", id));
    });

  const addNote = () =>
    act.mutate(async () => {
      if (!noteTitle.trim()) throw new Error("Give the note a title.");
      const { addDoc, collection } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await addDoc(collection(db, "devBoard"), {
        kind: "note",
        title: noteTitle.trim().slice(0, 120),
        body: noteBody.trim().slice(0, 4000),
        createdByName: user?.displayName ?? user?.username ?? "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setNoteTitle("");
      setNoteBody("");
    });

  if (incoming.isPending || board.isPending) return <SectionLoader />;

  const tickets = (board.data ?? []).filter((d) => d.kind === "ticket");
  const notes = (board.data ?? []).filter((d) => d.kind === "note");

  const card = (children: React.ReactNode, key: string) => (
    <Box key={key} p={12} style={{ borderRadius: 10, background: "#141318", border: "1px solid #232028" }}>
      {children}
    </Box>
  );

  return (
    <Stack gap={20}>
      {error && (
        <Text fz={14} c="red.4" role="status" aria-live="polite">
          {error}
        </Text>
      )}

      <Stack gap={8}>
        <Title order={3} c="white" size={22} fw={600}>
          Incoming from S.N.A.G. ({(incoming.data ?? []).length})
        </Title>
        <Text fz={14} c="dimmed">
          Suggestions, bug reports and questions members sent through the help device.
          Promote the keepers into board tickets; discard the rest.
        </Text>
        {(incoming.data ?? []).length === 0 && (
          <Text fz={14} c="dimmed">
            Nothing waiting. All clear.
          </Text>
        )}
        {(incoming.data ?? []).map((item) =>
          card(
            <Stack gap={6}>
              <Group gap={8} wrap="wrap">
                <Badge
                  color={TYPE_BADGE[item.type]?.color ?? "gray"}
                  variant="light"
                  radius="sm"
                >
                  {TYPE_BADGE[item.type]?.label ?? item.type}
                </Badge>
                <Text fz={14} c="dimmed">
                  {item.actorName || "Unknown"} · {dateOf(item.createdAt?.seconds)}
                </Text>
              </Group>
              <Text fz={16} c="rgba(255,255,255,0.85)">
                {item.text}
              </Text>
              <Group gap={8}>
                <Button
                  size="compact-xs"
                  radius="xl"
                  color="grape"
                  onClick={() => resolveIncoming(item, true)}
                  loading={act.isPending}
                >
                  Make a Ticket
                </Button>
                <Button
                  size="compact-xs"
                  radius="xl"
                  variant="subtle"
                  color="gray"
                  onClick={() => resolveIncoming(item, false)}
                  loading={act.isPending}
                >
                  Discard
                </Button>
              </Group>
            </Stack>,
            item.id
          )
        )}
      </Stack>

      <Stack gap={8}>
        <Title order={3} c="white" size={22} fw={600}>
          Tickets ({tickets.length})
        </Title>
        {tickets.length === 0 && (
          <Text fz={14} c="dimmed">
            No open development tickets.
          </Text>
        )}
        {tickets.map((t) =>
          card(
            <Stack gap={6}>
              <Group gap={8} justify="space-between" wrap="wrap">
                <Group gap={8} wrap="wrap">
                  <Badge color={STATUS_COLOR[t.status ?? "open"]} variant="light" radius="sm">
                    {STATUS_LABEL[t.status ?? "open"]}
                  </Badge>
                  {t.source?.type && (
                    <Badge color={TYPE_BADGE[t.source.type]?.color ?? "gray"} variant="outline" radius="sm">
                      from {t.source.actorName || "a member"}
                    </Badge>
                  )}
                </Group>
                <Group gap={6}>
                  <Select
                    size="xs"
                    w={140}
                    value={t.status ?? "open"}
                    onChange={(v) => v && setStatus(t.id, v)}
                    data={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                    aria-label="Ticket status"
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                  <Button
                    size="compact-xs"
                    radius="xl"
                    variant="subtle"
                    color="pink"
                    onClick={() => removeDoc(t.id)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
              <Text fz={16} fw={600} c="white">
                {t.title}
              </Text>
              {t.body && t.body !== t.title && (
                <Text fz={14} c="rgba(255,255,255,0.75)">
                  {t.body}
                </Text>
              )}
            </Stack>,
            t.id
          )
        )}
      </Stack>

      <Stack gap={8}>
        <Title order={3} c="white" size={22} fw={600}>
          Admin Notes ({notes.length})
        </Title>
        <Text fz={14} c="dimmed">
          Planning notes for the team: what is coming up, what you plan to do next.
          Visible to admins only.
        </Text>
        {card(
          <Stack gap={8}>
            <TextInput
              label="Note title"
              placeholder="e.g. August event plan"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.currentTarget.value)}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            <Textarea
              label="Note"
              placeholder="What's coming up, decisions, links..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.currentTarget.value)}
              autosize
              minRows={2}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            <Button w="fit-content" size="xs" radius="xl" color="grape" onClick={addNote} loading={act.isPending}>
              Add Note
            </Button>
          </Stack>,
          "new-note"
        )}
        {notes.map((n) =>
          card(
            <Stack gap={4}>
              <Group justify="space-between" wrap="wrap">
                <Text fz={16} fw={600} c="white">
                  {n.title}
                </Text>
                <Group gap={8}>
                  <Text fz={14} c="dimmed">
                    {n.createdByName} · {dateOf(n.updatedAt?.seconds)}
                  </Text>
                  <Button
                    size="compact-xs"
                    radius="xl"
                    variant="subtle"
                    color="pink"
                    onClick={() => removeDoc(n.id)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
              <Text fz={14} c="rgba(255,255,255,0.75)" style={{ whiteSpace: "pre-wrap" }}>
                {n.body}
              </Text>
            </Stack>,
            n.id
          )
        )}
      </Stack>
    </Stack>
  );
}
