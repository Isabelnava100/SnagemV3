import {
  ActionIcon,
  Autocomplete,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconTrash, IconTrophy } from "@tabler/icons-react";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../lib/auditLog";
import { toastError, toastSuccess } from "../../lib/toast";
import {
  BracketMatch,
  BracketRound,
  saveTournamentBracket,
  Tournament,
  TournamentSignup,
} from "../../queries/colosseum";

const WELL_BG = "#1b1a1e";
const WELL_BORDER = "#3a3550";
const CHIP_CLIP = "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)";

/**
 * Strip empty slots and undefined fields so the bracket is safe to write:
 * Firestore rejects undefined values. Existing scores pass through untouched.
 */
function cleanBracket(rounds: BracketRound[]): BracketRound[] {
  return rounds.map((r, i) => ({
    name: r.name.trim() || `Round ${i + 1}`,
    matches: r.matches.map((m) => {
      const clean: BracketMatch = {};
      const a = m.a?.trim();
      const b = m.b?.trim();
      if (a) clean.a = a;
      if (b) clean.b = b;
      if (typeof m.scoreA === "number") clean.scoreA = m.scoreA;
      if (typeof m.scoreB === "number") clean.scoreB = m.scoreB;
      if (m.winner === "a" || m.winner === "b") clean.winner = m.winner;
      return clean;
    }),
  }));
}

/** One editable match: two entrant slots and a winner pick. */
function MatchEditor({
  roundName,
  index,
  match,
  entrants,
  onChange,
  onRemove,
}: {
  roundName: string;
  index: number;
  match: BracketMatch;
  entrants: string[];
  onChange: (patch: Partial<BracketMatch>) => void;
  onRemove: () => void;
}) {
  const label = `${roundName || "Round"} match ${index + 1}`;
  return (
    <Box p={12} style={{ background: WELL_BG, border: `1px solid ${WELL_BORDER}` }}>
      <Stack gap={10}>
        <Group justify="space-between" wrap="nowrap" align="center">
          <Text fz={13} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.12em" }}>
            Match {index + 1}
          </Text>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
        <Autocomplete
          aria-label={`${label} entrant 1`}
          placeholder="Entrant 1 (blank = TBD)"
          data={entrants}
          value={match.a ?? ""}
          onChange={(a) => onChange({ a })}
          styles={{ input: { background: "#141318", borderColor: WELL_BORDER } }}
        />
        <Autocomplete
          aria-label={`${label} entrant 2`}
          placeholder="Entrant 2 (blank = TBD)"
          data={entrants}
          value={match.b ?? ""}
          onChange={(b) => onChange({ b })}
          styles={{ input: { background: "#141318", borderColor: WELL_BORDER } }}
        />
        <SegmentedControl
          aria-label={`Winner of ${label}`}
          fullWidth
          size="xs"
          value={match.winner ?? ""}
          onChange={(v) => onChange({ winner: v === "a" || v === "b" ? v : undefined })}
          data={[
            { value: "", label: "Undecided" },
            { value: "a", label: match.a?.trim() || "Entrant 1" },
            { value: "b", label: match.b?.trim() || "Entrant 2" },
          ]}
        />
      </Stack>
    </Box>
  );
}

/**
 * Admin-only bracket editor for a tournament. Opens from the "Edit bracket"
 * button on the featured tournament card; edits a local draft of rounds and
 * matches, then saves the whole bracket array to tournaments/{id} and logs an
 * audit entry. Entrant fields accept free text and suggest signed-up members.
 */
export default function BracketEditor({
  t,
  signups,
}: {
  t: Tournament;
  signups: TournamentSignup[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const fullScreen = useMediaQuery("(max-width: 48em)");
  const [rounds, setRounds] = React.useState<BracketRound[]>([]);

  // Signed-up member names feed the entrant suggestions (free text still works).
  const entrants = React.useMemo(
    () => [...new Set(signups.map((s) => s.username?.trim() || s.id).filter(Boolean))].sort(),
    [signups]
  );

  const startEditing = () => {
    setRounds(
      (t.bracket ?? []).map((r) => ({
        name: r.name,
        matches: r.matches.map((m) => ({ ...m })),
      }))
    );
    open();
  };

  const updateRound = (ri: number, patch: Partial<BracketRound>) =>
    setRounds((rs) => rs.map((r, i) => (i === ri ? { ...r, ...patch } : r)));
  const updateMatch = (ri: number, mi: number, patch: Partial<BracketMatch>) =>
    setRounds((rs) =>
      rs.map((r, i) =>
        i === ri
          ? { ...r, matches: r.matches.map((m, j) => (j === mi ? { ...m, ...patch } : m)) }
          : r
      )
    );
  const addRound = () =>
    setRounds((rs) => [...rs, { name: `Round ${rs.length + 1}`, matches: [{}] }]);
  const removeRound = (ri: number) => setRounds((rs) => rs.filter((_, i) => i !== ri));
  const addMatch = (ri: number) =>
    setRounds((rs) =>
      rs.map((r, i) => (i === ri ? { ...r, matches: [...r.matches, {}] } : r))
    );
  const removeMatch = (ri: number, mi: number) =>
    setRounds((rs) =>
      rs.map((r, i) =>
        i === ri ? { ...r, matches: r.matches.filter((_, j) => j !== mi) } : r
      )
    );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const bracket = cleanBracket(rounds);
      await saveTournamentBracket(t.id, bracket);
      await logAuditEvent({
        action: "tournament.bracket",
        ...actorFrom(user),
        targetPath: `tournaments/${t.id}`,
        details: {
          tournament: t.name,
          rounds: bracket.length,
          matches: bracket.reduce((n, r) => n + r.matches.length, 0),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colosseum-tournaments"] });
      toastSuccess("Bracket saved.", t.name);
      close();
    },
    onError: (e) => toastError(e, "Could not save the bracket. Please try again."),
  });

  return (
    <>
      <Button
        variant="default"
        size="compact-md"
        leftSection={<IconTrophy size={14} />}
        onClick={startEditing}
        tt="uppercase"
        style={{
          background: "none",
          borderColor: WELL_BORDER,
          clipPath: CHIP_CLIP,
          letterSpacing: "0.12em",
        }}
      >
        {t.bracket?.length ? "Edit bracket" : "Create bracket"}
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700}>Bracket . {t.name}</Text>}
        centered
        radius={12}
        size="lg"
        fullScreen={fullScreen}
      >
        <Stack gap={16}>
          <Text fz={14} c="dimmed">
            Add rounds and matches, set the two entrants per match (signed-up members are
            suggested, any name works), and mark the winner once a match is decided. Nothing
            changes for members until you save.
          </Text>

          {rounds.map((round, ri) => (
            <Box
              key={ri}
              p={14}
              style={{ border: `1px solid ${WELL_BORDER}`, background: "#17151c" }}
            >
              <Stack gap={12}>
                <Group wrap="nowrap" align="flex-end" gap={10}>
                  <TextInput
                    label={`Round ${ri + 1}`}
                    placeholder="Quarterfinals"
                    value={round.name}
                    onChange={(e) => updateRound(ri, { name: e.currentTarget.value })}
                    style={{ flex: 1, minWidth: 0 }}
                    styles={{ input: { background: WELL_BG, borderColor: WELL_BORDER } }}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    aria-label={`Remove round ${ri + 1}`}
                    onClick={() => removeRound(ri)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                {round.matches.map((m, mi) => (
                  <MatchEditor
                    key={mi}
                    roundName={round.name}
                    index={mi}
                    match={m}
                    entrants={entrants}
                    onChange={(patch) => updateMatch(ri, mi, patch)}
                    onRemove={() => removeMatch(ri, mi)}
                  />
                ))}

                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => addMatch(ri)}
                  style={{ alignSelf: "flex-start" }}
                >
                  Add match
                </Button>
              </Stack>
            </Box>
          ))}

          <Button
            variant="default"
            leftSection={<IconPlus size={14} />}
            onClick={addRound}
            style={{ borderColor: WELL_BORDER, background: "none" }}
          >
            Add round
          </Button>

          <Group justify="flex-end" wrap="wrap">
            <Button variant="subtle" onClick={close} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              color="teal"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            >
              Save bracket
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
