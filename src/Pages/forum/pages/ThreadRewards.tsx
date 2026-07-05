import {
  Avatar,
  Badge,
  Box,
  Container,
  Divider,
  Flex,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { itemData } from "../../../data/item";
import { getItemImageURL, getPokemonImageURL } from "../../../helpers";
import { hasCapability } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  RewardEntry,
  RewardPokemonXp,
  RewardSession,
  getRewardSession,
  saveRewardSession,
} from "../../../queries/game";
import { callFinalizeRewards, callableMessage } from "../functionsClient";
import { getThread } from "../queries";
import { ConfirmModal, ForumPanel, GameResultText, PanelHint } from "../components/ui";
import { ActivityLog } from "../../../components/admin/ActivityLog";
import "../forum.css";

const CURRENCIES = [
  { value: "pokecoin", label: "Poke Coin" },
  { value: "gengarcoin", label: "Gengar Coin" },
  { value: "snagemblem", label: "Snag Emblems" },
] as const;

const emptyEntry = (): RewardEntry => ({
  items: [],
  currencies: { pokecoin: 0, gengarcoin: 0, snagemblem: 0 },
});

/**
 * Thread-close rewards page (Q1). Shown to reward granters (Admin /
 * GiveItems directors) after archiving a thread: lists every participant,
 * supports bulk awards to all + per-user adjustments, saves progress so the
 * closer can return later, clear-all behind a confirmation, and a finalize
 * step that applies everything server-side. The same flow will later close
 * activities.
 */
export default function ThreadRewards() {
  const { forum: forumParam, id: threadId } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();
  const [clearOpened, clearModal] = useDisclosure(false);
  const [finalizeOpened, finalizeModal] = useDisclosure(false);

  const canGrant =
    hasCapability(user, Capability.GiveItems) || hasCapability(user, Capability.ReviewRewards);

  const { data: thread } = useQuery({
    queryKey: ["forum-thread", forum, threadId],
    queryFn: () => getThread(forum, threadId!),
    enabled: !!threadId && canGrant,
  });
  const { data: savedSession, isPending: sessionPending } = useQuery({
    queryKey: ["reward-session", forum, threadId],
    queryFn: () => getRewardSession(forum, threadId!),
    enabled: !!threadId && canGrant,
  });

  const [session, setSession] = React.useState<RewardSession | null>(null);
  const [message, setMessage] = React.useState("");

  // Load saved progress, or seed a fresh session from the thread participants
  // and the accrued team XP (non-admin threads accumulate XP into pendingXp).
  React.useEffect(() => {
    if (session || sessionPending || !thread) return;
    const seededRewards: Record<string, RewardEntry> = {};
    Object.entries(thread.pendingXp ?? {}).forEach(([participantUid, pokes]) => {
      const pokemonXp: Record<string, RewardPokemonXp> = {};
      Object.entries(pokes).forEach(([pokeId, xp]) => {
        pokemonXp[pokeId] = {
          name: xp.name,
          slug: xp.slug,
          experience: xp.experience ?? 0,
          friendship: xp.friendship ?? 0,
          purification: xp.purification ?? 0,
          shadow: xp.shadow ?? 0,
        };
      });
      if (Object.keys(pokemonXp).length) seededRewards[participantUid] = { ...emptyEntry(), pokemonXp };
    });
    setSession(
      savedSession ?? {
        forum,
        threadId: thread.id,
        threadTitle: thread.title,
        participants: thread.participants ?? {},
        rewards: seededRewards,
      }
    );
  }, [session, sessionPending, savedSession, thread, forum]);

  // Bulk-add controls
  const [bulkKind, setBulkKind] = React.useState<"currency" | "item">("currency");
  const [bulkCurrency, setBulkCurrency] = React.useState<string>("pokecoin");
  const [bulkItem, setBulkItem] = React.useState<string | null>(null);
  const [bulkQty, setBulkQty] = React.useState<number>(1);

  const itemOptions = React.useMemo(
    () => itemData.map((item) => ({ value: item.id, label: item.name })),
    []
  );

  const updateEntry = (uid: string, updater: (entry: RewardEntry) => RewardEntry) => {
    if (!session) return;
    const current = session.rewards[uid] ?? emptyEntry();
    setSession({ ...session, rewards: { ...session.rewards, [uid]: updater(current) } });
  };

  const setPokeXp = (
    uid: string,
    pokeId: string,
    field: "experience" | "friendship" | "purification" | "shadow",
    value: number
  ) => {
    updateEntry(uid, (entry) => {
      const current = entry.pokemonXp?.[pokeId] ?? {
        experience: 0,
        friendship: 0,
        purification: 0,
        shadow: 0,
      };
      return {
        ...entry,
        pokemonXp: { ...(entry.pokemonXp ?? {}), [pokeId]: { ...current, [field]: value } },
      };
    });
  };

  const addItemTo = (uid: string, itemId: string, qty: number) => {
    const info = itemData.find((i) => i.id === itemId);
    if (!info || qty <= 0) return;
    updateEntry(uid, (entry) => {
      const existing = entry.items.find((i) => i.itemId === itemId);
      return {
        ...entry,
        items: existing
          ? entry.items.map((i) => (i.itemId === itemId ? { ...i, qty: i.qty + qty } : i))
          : [
              ...entry.items,
              { itemId, name: info.name, filePath: info.filePath, category: info.category, qty },
            ],
      };
    });
  };

  const applyBulk = () => {
    if (!session) return;
    Object.keys(session.participants).forEach((uid) => {
      if (bulkKind === "currency") {
        updateEntry(uid, (entry) => ({
          ...entry,
          currencies: {
            ...entry.currencies,
            [bulkCurrency]:
              (entry.currencies[bulkCurrency as keyof RewardEntry["currencies"]] ?? 0) + bulkQty,
          },
        }));
      } else if (bulkItem) {
        addItemTo(uid, bulkItem, bulkQty);
      }
    });
    setMessage("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (session) await saveRewardSession(session);
    },
    onSuccess: () => {
      setMessage("Progress saved. You can come back to finish later.");
      queryClient.invalidateQueries({ queryKey: ["reward-session", forum, threadId] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await saveRewardSession(session);
      await callFinalizeRewards(`${forum}__${threadId}`);
    },
    onSuccess: () => {
      finalizeModal.close();
      queryClient.invalidateQueries({ queryKey: ["reward-session", forum, threadId] });
      setSession(session ? { ...session, finalized: true } : session);
      setMessage("Rewards sent to everyone. This thread's close is complete.");
    },
    onError: (err) => {
      finalizeModal.close();
      setMessage(callableMessage(err, "Finalizing failed. Try again."));
    },
  });

  if (!canGrant) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">Only reward granters can open this page.</Text>
      </Container>
    );
  }
  if (!thread || !session) {
    return (
      <Container size="lg" mt={20}>
        <SectionLoader />
      </Container>
    );
  }

  const participantIds = Object.keys(session.participants);
  const finalized = !!session.finalized || !!savedSession?.finalized;

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400}>
        Close &amp; Reward: {session.threadTitle}
      </Title>
      <Text fz={13} c="dimmed" mt={4}>
        Award money and items to everyone who participated. Rewards are optional. You can also
        finalize with none.
      </Text>

      {finalized ? (
        <ForumPanel title="Rewards Sent" mt={16}>
          <Text fz={14} c="green.0">
            This thread&apos;s rewards were already finalized and delivered.
          </Text>
        </ForumPanel>
      ) : (
        <>
          {/* Bulk add */}
          <ForumPanel title="Add to Everyone" mt={16}>
            <PanelHint>
              Example: add 1 Poke Coin to everyone who participated, then fine-tune each person
              below.
            </PanelHint>
            <Group gap={8} wrap="wrap">
              <Select
                data={[
                  { value: "currency", label: "Currency" },
                  { value: "item", label: "Item" },
                ]}
                value={bulkKind}
                onChange={(v) => setBulkKind((v as "currency" | "item") ?? "currency")}
                w={110}
                size="xs"
                styles={{ input: { background: "#2E2D2E" } }}
              />
              {bulkKind === "currency" ? (
                <Select
                  data={CURRENCIES as unknown as { value: string; label: string }[]}
                  value={bulkCurrency}
                  onChange={(v) => setBulkCurrency(v ?? "pokecoin")}
                  w={150}
                  size="xs"
                  styles={{ input: { background: "#2E2D2E" } }}
                />
              ) : (
                <Select
                  placeholder="Search items"
                  searchable
                  limit={20}
                  data={itemOptions}
                  value={bulkItem}
                  onChange={setBulkItem}
                  w={200}
                  size="xs"
                  styles={{ input: { background: "#2E2D2E" } }}
                />
              )}
              <NumberInput
                value={bulkQty}
                onChange={(v) => setBulkQty(Math.max(1, Number(v) || 1))}
                min={1}
                w={80}
                size="xs"
                styles={{ input: { background: "#2E2D2E" } }}
              />
              <GradientButtonSecondary size="xs" radius="xl" onClick={applyBulk}>
                Add to All Participants
              </GradientButtonSecondary>
            </Group>
          </ForumPanel>

          {/* Per-participant rows */}
          <ForumPanel title={`Participants (${participantIds.length})`} mt={16}>
            <Stack gap={12}>
              {participantIds.map((uid) => {
                const participant = session.participants[uid];
                const entry = session.rewards[uid] ?? emptyEntry();
                return (
                  <Box key={uid} p={10} bg="#211f21" style={{ borderRadius: 10 }}>
                    <Flex justify="space-between" align="center" gap={8} wrap="wrap">
                      <Group gap={8}>
                        <Avatar src={participant.avatar || undefined} alt={`${participant.name ?? "User"} avatar`} size={30} radius="xl" />
                        <Text c="white" fz={14} fw={600}>
                          {participant.name}
                        </Text>
                      </Group>
                      <PerUserAdd
                        onAddItem={(itemId, qty) => addItemTo(uid, itemId, qty)}
                        onAddCurrency={(currency, amount) =>
                          updateEntry(uid, (e) => ({
                            ...e,
                            currencies: {
                              ...e.currencies,
                              [currency]:
                                (e.currencies[currency as keyof RewardEntry["currencies"]] ?? 0) +
                                amount,
                            },
                          }))
                        }
                      />
                    </Flex>
                    {/* Current rewards as removable chips */}
                    <Group gap={6} mt={8}>
                      {CURRENCIES.filter((c) => entry.currencies[c.value] > 0).map((c) => (
                        <Badge
                          key={c.value}
                          variant="light"
                          color="cyan.0"
                          rightSection={
                            <span
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                updateEntry(uid, (e) => ({
                                  ...e,
                                  currencies: { ...e.currencies, [c.value]: 0 },
                                }))
                              }
                            >
                              ✕
                            </span>
                          }
                        >
                          +{entry.currencies[c.value]} {c.label}
                        </Badge>
                      ))}
                      {entry.items.map((item) => (
                        <Badge
                          key={item.itemId}
                          variant="light"
                          color="pink.0"
                          leftSection={
                            <Avatar src={getItemImageURL(item.filePath)} alt={`${item.name ?? "Item"} icon`} size={14} />
                          }
                          rightSection={
                            <span
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                updateEntry(uid, (e) => ({
                                  ...e,
                                  items: e.items.filter((i) => i.itemId !== item.itemId),
                                }))
                              }
                            >
                              ✕
                            </span>
                          }
                        >
                          {item.qty}x {item.name}
                        </Badge>
                      ))}
                      {!entry.items.length &&
                        !CURRENCIES.some((c) => entry.currencies[c.value] > 0) && (
                          <Text fz={12} c="dimmed">
                            No rewards yet.
                          </Text>
                        )}
                    </Group>
                    {/* Team XP accrued while posting; editable before it is
                        committed to each pokemon on finalize. */}
                    {entry.pokemonXp && Object.keys(entry.pokemonXp).length > 0 && (
                      <Stack gap={6} mt={10}>
                        <Text fz={11} fw={700} c="white" tt="uppercase">
                          Team XP to assign
                        </Text>
                        {Object.entries(entry.pokemonXp).map(([pokeId, xp]) => (
                          <Box key={pokeId} p={8} bg="#2b2a2b" style={{ borderRadius: 8 }}>
                            <Group gap={8} wrap="nowrap" mb={6}>
                              <Avatar
                                src={xp.slug ? getPokemonImageURL(xp.slug) : undefined}
                                alt={`${xp.name ?? "Pokemon"} sprite`}
                                size={26}
                                radius="xl"
                              />
                              <Text fz={13} c="white" fw={500}>
                                {xp.name ?? pokeId}
                              </Text>
                            </Group>
                            <Group gap={6} wrap="wrap">
                              {(["experience", "friendship", "purification", "shadow"] as const).map(
                                (field) => (
                                  <Stack gap={0} key={field}>
                                    <Text fz={10} c="dimmed" tt="capitalize">
                                      {field}
                                    </Text>
                                    <NumberInput
                                      value={xp[field] ?? 0}
                                      onChange={(v) =>
                                        setPokeXp(uid, pokeId, field, Math.max(0, Number(v) || 0))
                                      }
                                      min={0}
                                      w={78}
                                      size="xs"
                                      styles={{ input: { background: "#2E2D2E" } }}
                                    />
                                  </Stack>
                                )
                              )}
                            </Group>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
              {!participantIds.length && (
                <Text fz={13} c="dimmed">
                  No participants were recorded on this thread.
                </Text>
              )}
            </Stack>
          </ForumPanel>

          <Divider color="#4a464a" my={16} />

          {message && <GameResultText>{message}</GameResultText>}

          <Flex justify="space-between" gap={8} wrap="wrap" mt={8}>
            <Group gap={8}>
              <GradientButtonSecondary
                radius="xl"
                variant="subtle"
                onClick={() => navigate(`/Forum/${forum}/thread/${threadId}`)}
              >
                Back to Thread
              </GradientButtonSecondary>
              <GradientButtonSecondary radius="xl" onClick={clearModal.open}>
                Clear All Rewards
              </GradientButtonSecondary>
            </Group>
            <Group gap={8}>
              <GradientButtonSecondary
                radius="xl"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutateAsync()}
              >
                Save Progress
              </GradientButtonSecondary>
              <GradientButtonPrimary radius="xl" onClick={finalizeModal.open}>
                Finalize &amp; Send Rewards
              </GradientButtonPrimary>
            </Group>
          </Flex>
        </>
      )}

      <Box mt={24}>
        <ActivityLog
          title="Recent reward activity"
          filter={(r) =>
            r.action.startsWith("rewards") ||
            r.action.startsWith("currency") ||
            r.action.startsWith("items") ||
            r.action === "thread.close"
          }
        />
      </Box>

      <ConfirmModal
        opened={clearOpened}
        title="Clear all rewards?"
        message="Every reward you've added on this page will be removed. This does not affect anything already sent."
        confirmLabel="Clear All"
        onConfirm={() => {
          setSession({ ...session, rewards: {} });
          clearModal.close();
        }}
        onClose={clearModal.close}
      />
      <ConfirmModal
        opened={finalizeOpened}
        title="Finalize and send rewards?"
        message="Items and currency will be delivered to every participant listed. This can only be done once per thread."
        confirmLabel="Send Rewards"
        loading={finalizeMutation.isPending}
        onConfirm={() => finalizeMutation.mutateAsync()}
        onClose={finalizeModal.close}
      />
    </Container>
  );
}

function PerUserAdd(props: {
  onAddItem: (itemId: string, qty: number) => void;
  onAddCurrency: (currency: string, amount: number) => void;
}) {
  const [kind, setKind] = React.useState<"currency" | "item">("currency");
  const [currency, setCurrency] = React.useState<string>("pokecoin");
  const [itemId, setItemId] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState<number>(1);
  const itemOptions = React.useMemo(
    () => itemData.map((item) => ({ value: item.id, label: item.name })),
    []
  );

  return (
    <Group gap={6} wrap="wrap">
      <Select
        data={[
          { value: "currency", label: "Currency" },
          { value: "item", label: "Item" },
        ]}
        value={kind}
        onChange={(v) => setKind((v as "currency" | "item") ?? "currency")}
        w={100}
        size="xs"
        styles={{ input: { background: "#2E2D2E" } }}
      />
      {kind === "currency" ? (
        <Select
          data={CURRENCIES as unknown as { value: string; label: string }[]}
          value={currency}
          onChange={(v) => setCurrency(v ?? "pokecoin")}
          w={130}
          size="xs"
          styles={{ input: { background: "#2E2D2E" } }}
        />
      ) : (
        <Select
          placeholder="Search items"
          searchable
          limit={20}
          data={itemOptions}
          value={itemId}
          onChange={setItemId}
          w={170}
          size="xs"
          styles={{ input: { background: "#2E2D2E" } }}
        />
      )}
      <NumberInput
        value={qty}
        onChange={(v) => setQty(Math.max(1, Number(v) || 1))}
        min={1}
        w={70}
        size="xs"
        styles={{ input: { background: "#2E2D2E" } }}
      />
      <GradientButtonSecondary
        size="xs"
        radius="xl"
        onClick={() =>
          kind === "currency" ? props.onAddCurrency(currency, qty) : itemId && props.onAddItem(itemId, qty)
        }
      >
        Add
      </GradientButtonSecondary>
    </Group>
  );
}
