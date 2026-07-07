import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconTrash } from "@tabler/icons-react";
import React from "react";
import { ActivityLog } from "../../../../components/admin/ActivityLog";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { xpForLevel } from "../../../../lib/leveling";
import { hasCapability, isAdmin } from "../../../../lib/permissions";
import { getUsers } from "../../../../queries/admin";
import {
  ImportEntries,
  ImportRequest,
  approveImport,
  getPendingImports,
  rejectImport,
} from "../../../../queries/imports";

const CURRENCY: { key: keyof ImportEntries["currency"]; label: string }[] = [
  { key: "pokecoin", label: "Poke Coins" },
  { key: "gengarcoin", label: "Gengar Coins" },
  { key: "snagemblem", label: "Snag Emblems" },
];

export default function Imports() {
  const { user } = useAuth();
  const canReview = isAdmin(user) || hasCapability(user, Capability.ApproveImports);

  const { data: pending, isPending } = useQuery({
    queryKey: ["pending-imports"],
    queryFn: getPendingImports,
    enabled: canReview,
  });
  const { data: users } = useQuery({ queryKey: ["get-all-users"], queryFn: getUsers });

  if (!canReview) return <Text c="white">You don&apos;t have permission to review imports.</Text>;
  if (isPending || !pending) return <SectionLoader />;

  const nameFor = (uid: string) => users?.find((u) => u.id === uid)?.username ?? uid;

  return (
    <Stack gap={16} maw={720}>
      <Title order={2} c="white" size={24} fw={400}>
        Import approvals
      </Title>
      <Text fz={13} c="dimmed">
        Returning members submit currency, items, and Pokemon to restore. Review each one, trim
        anything that looks off, then approve to add it to their account, or send it back with a
        note.
      </Text>
      {!pending.length && <EmptyMessage title="No imports are waiting for review." />}
      {pending.map((req) => (
        <ReviewCard key={req.uid} req={req} username={nameFor(req.uid)} />
      ))}
      <ActivityLog
        title="Recent import activity"
        filter={(r) => r.action.startsWith("import")}
      />
    </Stack>
  );
}

export function ReviewCard(props: { req: ImportRequest & { uid: string }; username: string }) {
  const { req, username } = props;
  const queryClient = useQueryClient();
  const [currency, setCurrency] = React.useState(req.currency);
  const [items, setItems] = React.useState(req.items ?? []);
  const [pokemon, setPokemon] = React.useState(req.pokemon ?? []);
  const [note, setNote] = React.useState("");
  const [message, setMessage] = React.useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pending-imports"] });

  const approve = useMutation({
    mutationFn: () =>
      approveImport(req.uid, {
        currency,
        items,
        pokemon: pokemon.map((p) => ({ ...p, experience: xpForLevel(p.level) })),
      }),
    onSuccess: () => {
      setMessage("Approved and added to the member's account.");
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "Could not approve."),
  });

  const reject = useMutation({
    mutationFn: () => rejectImport(req.uid, note),
    onSuccess: refresh,
    onError: (e) => setMessage((e as Error).message || "Could not send it back."),
  });

  return (
    <Paper p={16} radius={12} style={{ background: "#1E1D2080" }}>
      <Stack gap={12}>
        <Group justify="space-between">
          <Text c="white" fw={600}>
            {username}
          </Text>
          <Badge variant="light" color="yellow">
            Pending
          </Badge>
        </Group>

        {req.note && (
          <Text fz={13} c="dimmed">
            Member note: {req.note}
          </Text>
        )}

        <Group gap={10} wrap="wrap">
          {CURRENCY.map((c) => (
            <NumberInput
              key={c.key}
              label={c.label}
              min={0}
              value={currency[c.key]}
              onChange={(v) => setCurrency({ ...currency, [c.key]: Math.max(0, Number(v) || 0) })}
              w={130}
              size="xs"
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
          ))}
        </Group>

        {!!items.length && (
          <Stack gap={4}>
            <Text fz={12} c="dimmed" tt="uppercase" fw={700}>
              Items
            </Text>
            {items.map((it, i) => (
              <Group key={i} gap={8} wrap="nowrap">
                <Text fz={13} c="white">
                  {it.qty}x {it.name}
                </Text>
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}

        {!!pokemon.length && (
          <Stack gap={4}>
            <Text fz={12} c="dimmed" tt="uppercase" fw={700}>
              Pokemon
            </Text>
            {pokemon.map((p, i) => (
              <Group key={i} gap={8} wrap="nowrap">
                <Text fz={13} c="white">
                  {p.species} · Lv {p.level} · {p.gender}
                  {p.shiny ? " · Shiny" : ""} · Friend {p.friendship}
                  {p.shadow ? ` · Shadow ${p.shadow}` : ""}
                  {p.purification ? ` · Purified ${p.purification}` : ""}
                </Text>
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  onClick={() => setPokemon(pokemon.filter((_, j) => j !== i))}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}

        {message && (
          <Text
            fz={13}
            role="status"
            aria-live="polite"
            c={message.startsWith("Could not") ? "#E35C65" : "green.0"}
          >
            {message}
          </Text>
        )}

        <Group gap={10} align="flex-end" wrap="wrap">
          <GradientButtonPrimary
            radius="xl"
            loading={approve.isPending}
            onClick={() => approve.mutateAsync()}
          >
            Approve &amp; add
          </GradientButtonPrimary>
          <Textarea
            aria-label="Reason for sending the import back"
            placeholder="Reason (sent to the member if you send it back)"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            autosize
            minRows={1}
            style={{ flex: 1, minWidth: 220 }}
            styles={{ input: { background: "#2E2D2E" } }}
          />
          <Button
            variant="light"
            color="red"
            loading={reject.isPending}
            disabled={!note.trim()}
            onClick={() => reject.mutateAsync()}
          >
            Send back
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
