import { Avatar, Badge, Button, Group, NumberInput, Stack, Table, Text } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../context/AuthContext";
import { getPokemonImageURL } from "../../../helpers";
import { hasCapability, isAdmin } from "../../../lib/permissions";
import { Capability } from "../../../components/types/typesUsed";
import { queryClient } from "../../../lib/react-query";
import { callFinalizeSafariContest, callJudgeSafariContest, callableMessage } from "../functionsClient";
import { ForumPanel, GameResultText, PanelHint } from "./ui";
import { ForumThread, SafariResult } from "../types";

/**
 * Host-facing Safari Contest judging: rolls quality x rarity for each
 * participant's kept catch, shows the ranked table with editable Snag Coin
 * prizes (admin has final say), and pays them out. Mounted in the Host Menu.
 */
export default function SafariJudgePanel(props: {
  forum: string;
  threadId: string;
  thread: ForumThread;
}) {
  const { forum, threadId, thread } = props;
  const { user } = useAuth();
  const safari = thread.safariContest;
  const [rows, setRows] = React.useState<SafariResult[]>(safari?.results ?? []);
  const [message, setMessage] = React.useState("");
  const finalized = !!safari?.finalized;
  const canAward = isAdmin(user) || hasCapability(user, Capability.GiveItems);

  const judgeMutation = useMutation({
    mutationFn: () => callJudgeSafariContest(forum, threadId),
    onSuccess: (res) => {
      setRows((res.results as SafariResult[]) ?? []);
      setMessage("Judged. Adjust the Snag Coins if you like, then award.");
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });
    },
    onError: (err) => setMessage(callableMessage(err, "Could not judge the contest.")),
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      callFinalizeSafariContest({
        forum,
        threadId,
        results: rows.map((r) => ({ uid: r.uid, coins: r.coins })),
      }),
    onSuccess: (res) => {
      setMessage(`Prizes awarded to ${res.paid} ${res.paid === 1 ? "player" : "players"}.`);
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });
    },
    onError: (err) => setMessage(callableMessage(err, "Could not award prizes.")),
  });

  if (!safari) return null;
  const catchCount = Object.values(safari.catches ?? {}).reduce((n, list) => n + (list?.length ?? 0), 0);

  return (
    <ForumPanel title="Safari Contest: Judge & Award">
      <Stack gap={10}>
        <PanelHint>
          {catchCount} {catchCount === 1 ? "catch" : "catches"} logged so far. Judging rolls a
          quality of 1 to 5 for each player&apos;s kept (most recent) catch and scores it by star x
          quality. You have the final say on the coins before awarding.
        </PanelHint>

        <Group gap={10}>
          <Button
            size="xs"
            radius="xl"
            color="grape"
            loading={judgeMutation.isPending}
            disabled={finalized || catchCount === 0}
            onClick={() => {
              setMessage("");
              judgeMutation.mutateAsync().catch(() => undefined);
            }}
          >
            {rows.length ? "Re-judge" : "Judge Contest"}
          </Button>
          {finalized && <Badge color="green">Prizes awarded</Badge>}
        </Group>

        {rows.length > 0 && (
          <Table.ScrollContainer minWidth={420}>
            <Table verticalSpacing="xs" horizontalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Kept catch</Table.Th>
                  <Table.Th>Star</Table.Th>
                  <Table.Th>Quality</Table.Th>
                  <Table.Th>Score</Table.Th>
                  <Table.Th>Coins</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r, i) => (
                  <Table.Tr key={r.uid}>
                    <Table.Td>
                      <Text c="white" fw={700}>
                        {i + 1}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="white">{r.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Avatar size="sm" src={getPokemonImageURL(r.slug)} alt={r.pokemonName} />
                        <Text c="white" fz={13}>
                          {r.pokemonName}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text c="yellow.4">{"★".repeat(r.star)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed">{r.quality}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="white" fw={700}>
                        {r.score}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={r.coins}
                        onChange={(v) =>
                          setRows((prev) =>
                            prev.map((row) =>
                              row.uid === r.uid ? { ...row, coins: Math.max(0, Number(v) || 0) } : row
                            )
                          )
                        }
                        min={0}
                        w={80}
                        size="xs"
                        disabled={finalized}
                        styles={{ input: { background: "#2E2D2E" } }}
                        aria-label={`Snag Coins for ${r.name}`}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {message && <GameResultText>{message}</GameResultText>}

        {rows.length > 0 && canAward && !finalized && (
          <Group justify="flex-end">
            <Button
              size="xs"
              radius="xl"
              color="green"
              loading={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutateAsync().catch(() => undefined)}
            >
              Award Prizes
            </Button>
          </Group>
        )}
        {rows.length > 0 && !canAward && (
          <Text fz={12} c="dimmed">
            An admin or a director with Give Items awards the prizes.
          </Text>
        )}
      </Stack>
    </ForumPanel>
  );
}
