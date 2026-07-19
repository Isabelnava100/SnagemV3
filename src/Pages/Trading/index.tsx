import {
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { PageHero } from "../../components/common/PageHero";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { getOwnedPokemons } from "../../queries/dashboard";
import { callProposeTrade, callRespondTrade, getMyTrades } from "../../queries/game";
import { getUsers } from "../../queries/admin";

/**
 * Poke Swap (trading station): pokemon-for-pokemon only, per the guild rules
 * (no gifting or selling). Propose to a member; they accept with the pokemon
 * they trade back, decline, or you cancel. The swap is server-side.
 */
export default function Trading() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = React.useState<string | null>(null);
  const [offerId, setOfferId] = React.useState<string | null>(null);
  const [counterFor, setCounterFor] = React.useState<Record<string, string | null>>({});
  const [message, setMessage] = React.useState("");

  const { data: owned } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: members } = useQuery({ queryKey: ["forum-all-users"], queryFn: getUsers, enabled: !!user });
  const { data: trades } = useQuery({
    queryKey: ["my-trades", user?.uid],
    queryFn: () => getMyTrades(user!.uid),
    enabled: !!user,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-trades", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
  };
  const act = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: () => {
      setMessage("Done!");
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "That did not go through."),
  });

  if (!user) return null;
  const box = owned?.sortedData ?? [];
  const myOptions = box.map((p) => ({ value: p.id, label: `${p.name || p.species}` }));

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <PageHero
        eyebrow="Poke Swap"
        title="Trading Station"
        subtitle="Trade a Pokemon for a Pokemon. Never given, never sold: the official swap is the only way a Pokemon changes trainers."
        mb={24}
      />
      {message && (
        <Text fz={14} c="gold.1" mb={12} role="status" aria-live="polite">
          {message}
        </Text>
      )}

      <Card withBorder radius={16} p="md" mb={20} style={{ background: "#141318" }}>
        <Text fw={700} c="white" mb={8}>
          Propose a trade
        </Text>
        <Group gap={10} wrap="wrap" align="flex-end">
          <Select
            label="To member"
            placeholder="Pick a member"
            searchable
            data={(members ?? [])
              .map((m) => m.username)
              .filter((n) => n && n !== (user.displayName ?? user.username))}
            value={target}
            onChange={setTarget}
            w={220}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <Select
            label="Your offer"
            placeholder="Pick your pokemon"
            searchable
            data={myOptions}
            value={offerId}
            onChange={setOfferId}
            w={220}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <Button
            radius="xl"
            color="grape"
            disabled={!target || !offerId}
            loading={act.isPending}
            onClick={() => act.mutate(() => callProposeTrade(target!, offerId!))}
          >
            Send Offer
          </Button>
        </Group>
      </Card>

      <Stack gap={12}>
        <Text fw={700} c="white">
          Your trades
        </Text>
        {!(trades ?? []).length && (
          <Text fz={14} c="dimmed">
            No trades yet. Send an offer above.
          </Text>
        )}
        {(trades ?? []).map((t) => {
          const incoming = t.toUid === user.uid && t.status === "pending";
          return (
            <Card key={t.id} withBorder radius={12} p="md" style={{ background: "#141318" }}>
              <Group gap={10} wrap="wrap" align="center">
                {t.offerSlug && <Avatar src={getPokemonImageURL(t.offerSlug)} size={40} radius="xl" />}
                <Text fz={15} c="rgba(255,255,255,0.85)" style={{ flex: 1, minWidth: 200 }}>
                  {t.fromName} offers {t.offerName} to {t.toName}
                  {t.counterName ? ` for ${t.counterName}` : ""}
                </Text>
                <Badge
                  variant="light"
                  color={t.status === "pending" ? "gold.1" : t.status === "accepted" ? "cyan" : "gray"}
                >
                  {t.status}
                </Badge>
                {incoming && (
                  <Group gap={8}>
                    <Select
                      placeholder="Trade back..."
                      searchable
                      data={myOptions}
                      value={counterFor[t.id] ?? null}
                      onChange={(v) => setCounterFor((m) => ({ ...m, [t.id]: v }))}
                      w={190}
                      size="xs"
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                    <Button
                      size="compact-sm"
                      radius="xl"
                      color="grape"
                      disabled={!counterFor[t.id]}
                      onClick={() =>
                        act.mutate(() => callRespondTrade(t.id, "accept", counterFor[t.id]!))
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="compact-sm"
                      radius="xl"
                      variant="subtle"
                      color="pink"
                      onClick={() => act.mutate(() => callRespondTrade(t.id, "decline"))}
                    >
                      Decline
                    </Button>
                  </Group>
                )}
                {t.fromUid === user.uid && t.status === "pending" && (
                  <Button
                    size="compact-sm"
                    radius="xl"
                    variant="subtle"
                    color="gray"
                    onClick={() => act.mutate(() => callRespondTrade(t.id, "cancel"))}
                  >
                    Cancel
                  </Button>
                )}
              </Group>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}
