import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  List,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconFlask,
  IconLock,
  IconShieldCheck,
  IconShieldX,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getCharacters, getItems } from "../../queries/dashboard";
import {
  getResearchConfig,
  getResearchProgress,
  requestMasterMission,
  reviveFossil,
  ResearchProgress,
} from "../../queries/research";

/**
 * Snagem Research Facility. A mostly informational endgame page that frames the
 * Hybrid/Channeler progression: prerequisites, the path to mastery, the two
 * divisions, facility chambers (with a working Fossil Revitalization control),
 * and a per-character Master Mission tracker. Everything renders safely with no
 * characters and no stored progress.
 */

const MISSIONS_PER_TYPE = 10;

const DARK_CARD = "#242324";
const PANEL = "#1c1b1c";

function SectionHeading(props: { number: string; label: string }) {
  return (
    <Group gap={10} align="baseline" mb={4}>
      <Text fz={13} fw={700} c="grape.4" style={{ letterSpacing: 1 }}>
        {props.number}
      </Text>
      <Title order={2} c="white" fz={{ base: 20, sm: 24 }} fw={600}>
        {props.label}
      </Title>
    </Group>
  );
}

function InfoCard(props: { children: React.ReactNode }) {
  return (
    <Card bg={DARK_CARD} radius="md" p={{ base: 14, sm: 18 }} withBorder h="100%">
      {props.children}
    </Card>
  );
}

/** Prerequisites checklist + clearance panel. */
function Prerequisites(props: { character?: { name: string; species: string; type: string } }) {
  const granted =
    props.character?.type === "Hybrid" || props.character?.type === "Channeler";
  const prereqs = [
    "Own the species first",
    "Become a Hybrid or Channeler (irreversible)",
    "Admin review of your character",
    "Patience: ten missions per type",
  ];

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <InfoCard>
          <Text fz={12} fw={700} c="dimmed" mb={10} style={{ letterSpacing: 1 }}>
            PREREQUISITES
          </Text>
          <List
            spacing={8}
            icon={
              <ThemeIcon color="grape" size={20} radius="xl">
                <IconCheck size={13} />
              </ThemeIcon>
            }
          >
            {prereqs.map((p) => (
              <List.Item key={p}>
                <Text fz={14} c="gray.3">
                  {p}
                </Text>
              </List.Item>
            ))}
          </List>
        </InfoCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <InfoCard>
          <Text fz={12} fw={700} c="dimmed" mb={10} style={{ letterSpacing: 1 }}>
            YOUR CLEARANCE
          </Text>
          {props.character ? (
            <Stack gap={10}>
              <Badge
                size="lg"
                radius="sm"
                color={granted ? "teal" : "red"}
                leftSection={
                  granted ? <IconShieldCheck size={15} /> : <IconShieldX size={15} />
                }
              >
                {granted ? "GRANTED" : "DENIED"}
              </Badge>
              <Text fz={13} c="gray.4">
                Character {props.character.name} &middot; {props.character.species || "Unknown species"}{" "}
                &middot; {props.character.type}
              </Text>
            </Stack>
          ) : (
            <Text fz={13} c="dimmed">
              Select a Hybrid or Channeler character to see clearance.
            </Text>
          )}
        </InfoCard>
      </Grid.Col>
    </Grid>
  );
}

const PATH_STEPS = [
  {
    n: "1",
    title: "Transform",
    body: "Become a Hybrid or a Channeler. This is irreversible and starts your research file.",
  },
  {
    n: "2",
    title: "10 Master Missions",
    body: "Clear ten Master Missions per type, each one granting a single new ability.",
  },
  {
    n: "3",
    title: "Grand Master",
    body: "With all ten cleared, take on the Grand Master Mission for your type.",
  },
  {
    n: "4",
    title: "Mega & Z Access",
    body: "Finishing Grand Master unlocks Mega Evolution and Z-Move access, where the species supports it.",
  },
];

function PathToMastery() {
  return (
    <Stack gap={10}>
      <SectionHeading number="01" label="The Path to Mastery" />
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
        {PATH_STEPS.map((s) => (
          <Card key={s.n} bg={DARK_CARD} radius="md" p={16} withBorder h="100%">
            <Text fz={26} fw={700} c="grape.4" mb={6}>
              {s.n}
            </Text>
            <Text fz={15} fw={600} c="white" mb={6}>
              {s.title}
            </Text>
            <Text fz={13} c="gray.5">
              {s.body}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function DivisionCard(props: { tag: string; title: string; bullets: string[]; warning: string }) {
  return (
    <InfoCard>
      <Badge variant="light" color="grape" radius="sm" mb={8}>
        {props.tag}
      </Badge>
      <Text fz={18} fw={600} c="white" mb={10}>
        {props.title}
      </Text>
      <List spacing={6} size="sm" c="gray.4">
        {props.bullets.map((b) => (
          <List.Item key={b}>{b}</List.Item>
        ))}
      </List>
      <Text fz={12} c="orange.4" mt={10} fw={500}>
        {props.warning}
      </Text>
    </InfoCard>
  );
}

function TwoDivisions() {
  return (
    <Stack gap={10}>
      <SectionHeading number="02" label="The Two Divisions" />
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <DivisionCard
            tag="Division I"
            title="Hybrid Research"
            bullets={[
              "You must already own the species you want to fuse with.",
              "Hybrids are born from hybrids, or from an unusual accident.",
              "Missions must match the hybrid's type or types.",
              "Legendaries route through the Restricted Library instead.",
            ]}
            warning="Becoming a Hybrid is permanent and cannot be undone."
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <DivisionCard
            tag="Division II"
            title="Channeler Research"
            bullets={[
              "Begins with a concept discussion with an admin.",
              "Requires a focal artifact and a primary bonded Pokemon.",
              "All bonded Pokemon must share one single type.",
              "Ten Master Missions unlock ten ordered skill tiers.",
            ]}
            warning="The primary bond is required for tiers 1, 5, 10 and the ultimate."
          />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

/** Fossil Revitalization chamber with a working revive control. */
function FossilChamber(props: {
  fossilMap: Record<string, string>;
  fossilItems: Array<{ id: string; name: string }>;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  const options = props.fossilItems.map((f) => ({ value: f.id, label: f.name }));

  const onRevive = async () => {
    if (!selected) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await reviveFossil(selected);
      setStatus(`Success: your ${res.pokemon.name} has been revived and added to your box.`);
    } catch {
      setStatus("Revival failed. Check your fossils, coins, and an empty Poke Ball, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoCard>
      <Group justify="space-between" mb={8} wrap="nowrap">
        <Text fz={16} fw={600} c="white">
          Fossil Revitalization
        </Text>
        <Badge color="teal" radius="sm">
          OPEN
        </Badge>
      </Group>
      <Text fz={13} c="gray.5" mb={12}>
        Bring a fossil and an empty Poke Ball. We revive the ancient Pokemon and add it to your box.
      </Text>
      {options.length ? (
        <Stack gap={10}>
          <Select
            label="Fossil in your bag"
            placeholder="Pick a fossil"
            data={options}
            value={selected}
            onChange={setSelected}
            radius="md"
            aria-label="Choose a fossil to revive"
          />
          <Button
            color="grape"
            radius="md"
            onClick={onRevive}
            loading={busy}
            disabled={!selected}
            leftSection={<IconFlask size={16} />}
          >
            Revive
          </Button>
          {status && (
            <Text fz={13} c="gray.3" role="status" aria-live="polite">
              {status}
            </Text>
          )}
        </Stack>
      ) : (
        <Text fz={13} c="dimmed">
          You have no revivable fossils in your bag yet.
        </Text>
      )}
    </InfoCard>
  );
}

function ThreeChambers(props: {
  fossilMap: Record<string, string>;
  fossilItems: Array<{ id: string; name: string }>;
}) {
  return (
    <Stack gap={10}>
      <SectionHeading number="03" label="Facility Chambers" />
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FossilChamber fossilMap={props.fossilMap} fossilItems={props.fossilItems} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <InfoCard>
            <Group justify="space-between" mb={8} wrap="nowrap">
              <Text fz={16} fw={600} c="white">
                Mega & Z-Move Research
              </Text>
              <Badge color="yellow" radius="sm">
                GATED
              </Badge>
            </Group>
            <Text fz={13} c="gray.5">
              Finish your Grand Master Mission first. Mega needs a Key Stone plus a species Mega
              Stone, Z-Moves need a Sparkling Stone plus a type Z-Crystal. You may use one or the
              other in a mission, never both.
            </Text>
          </InfoCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <InfoCard>
            <Group justify="space-between" mb={8} wrap="nowrap">
              <Text fz={16} fw={600} c="white">
                Restricted Library
              </Text>
              <Badge color="red" radius="sm">
                CLASSIFIED
              </Badge>
            </Group>
            <Text fz={13} c="gray.5">
              The only path to a legendary hybrid. Roleplay your character entering, name the target
              legendary, and an admin writes a bespoke, story-driven mission. No fixed costs or
              success rates.
            </Text>
          </InfoCard>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

/** Per-character Master Mission tracker. */
function MasterMissions(props: {
  characterId: string;
  progress?: ResearchProgress;
  fallbackType: string;
}) {
  const typeEntries = props.progress?.types ?? [];
  const typeOptions = typeEntries.length
    ? typeEntries.map((t) => t.type)
    : [props.fallbackType];

  const [type, setType] = React.useState<string>(typeOptions[0]);
  const [status, setStatus] = React.useState<string>("");
  const [busy, setBusy] = React.useState<number | null>(null);

  React.useEffect(() => {
    setType(typeOptions[0]);
    setStatus("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.characterId]);

  const activeEntry = typeEntries.find((t) => t.type === type);
  const completed = activeEntry?.missionsCompleted ?? 0;
  const abilities = activeEntry?.abilities ?? [];

  const onRequest = async (index: number) => {
    setBusy(index);
    setStatus("");
    try {
      await requestMasterMission(props.characterId, type, index + 1);
      setStatus(`Mission ${index + 1} requested for ${type}. An admin will follow up.`);
    } catch {
      setStatus("Could not submit that request. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap={12}>
      <SectionHeading number="04" label="Master Missions" />
      <Group gap={12} align="flex-end" wrap="wrap">
        <Select
          label="Type track"
          data={typeOptions.map((t) => ({ value: t, label: t }))}
          value={type}
          onChange={(v) => v && setType(v)}
          radius="md"
          maw={220}
          w="100%"
          aria-label="Choose a Master Mission type track"
        />
        <Box style={{ flex: 1, minWidth: 200 }}>
          <Text fz={13} c="gray.4" mb={4}>
            {completed}/{MISSIONS_PER_TYPE} missions
          </Text>
          <Progress
            value={(completed / MISSIONS_PER_TYPE) * 100}
            color="grape"
            radius="xl"
            size="lg"
          />
        </Box>
      </Group>

      <Stack gap={8}>
        {Array.from({ length: MISSIONS_PER_TYPE }).map((_, i) => {
          const cleared = i < completed;
          const available = i === completed;
          const abilityName = abilities[i] || `Master Mission ${i + 1}`;

          return (
            <Card
              key={i}
              bg={cleared ? "rgba(64,192,140,0.08)" : DARK_CARD}
              radius="md"
              p={{ base: 12, sm: 14 }}
              withBorder
            >
              <Group justify="space-between" wrap="nowrap" gap={10}>
                <Group gap={12} wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon
                    size={30}
                    radius="xl"
                    color={cleared ? "teal" : available ? "grape" : "dark"}
                    variant={available ? "filled" : "light"}
                  >
                    {cleared ? (
                      <IconCheck size={16} />
                    ) : available ? (
                      <IconTargetArrow size={16} />
                    ) : (
                      <IconLock size={15} />
                    )}
                  </ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz={13} c="dimmed">
                      Mission {i + 1}
                    </Text>
                    <Text
                      fz={14}
                      fw={500}
                      c={cleared ? "teal.3" : "white"}
                      lineClamp={1}
                      style={
                        !cleared && !available
                          ? { filter: "blur(4px)", userSelect: "none" }
                          : undefined
                      }
                    >
                      {cleared || available ? abilityName : "Sealed ability"}
                    </Text>
                  </Box>
                </Group>
                {cleared ? (
                  <Badge color="teal" radius="sm" variant="light">
                    CLEARED
                  </Badge>
                ) : available ? (
                  <Button
                    size="xs"
                    color="grape"
                    radius="md"
                    onClick={() => onRequest(i)}
                    loading={busy === i}
                  >
                    Request Mission
                  </Button>
                ) : (
                  <Badge color="gray" radius="sm" variant="light">
                    SEALED
                  </Badge>
                )}
              </Group>
            </Card>
          );
        })}
      </Stack>
      {status && (
        <Text fz={13} c="gray.3" role="status" aria-live="polite">
          {status}
        </Text>
      )}
    </Stack>
  );
}

function CapstoneCard(props: { title: string; body: string; unlocked: boolean }) {
  return (
    <Card bg={PANEL} radius="md" p={{ base: 14, sm: 18 }} withBorder h="100%">
      <Group justify="space-between" mb={8} wrap="nowrap">
        <Text fz={16} fw={600} c="white">
          {props.title}
        </Text>
        <ThemeIcon
          size={26}
          radius="xl"
          color={props.unlocked ? "teal" : "dark"}
          variant="light"
        >
          {props.unlocked ? <IconSparkles size={15} /> : <IconLock size={14} />}
        </ThemeIcon>
      </Group>
      <Text fz={13} c="gray.5" mb={10}>
        {props.body}
      </Text>
      <Badge color={props.unlocked ? "teal" : "gray"} radius="sm" variant="light">
        {props.unlocked ? "UNLOCKED" : "SEALED"}
      </Badge>
    </Card>
  );
}

function Capstone(props: { progress?: ResearchProgress }) {
  const grand = props.progress?.grandMasterComplete ?? false;
  const mega = props.progress?.megaUnlocked ?? false;
  const zmove = props.progress?.zmoveUnlocked ?? false;
  const allCleared = (props.progress?.types ?? []).some(
    (t) => t.missionsCompleted >= MISSIONS_PER_TYPE
  );

  return (
    <Stack gap={10}>
      <SectionHeading number="05" label="The Capstone" />
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <CapstoneCard
          title="Grand Master Mission"
          body="Available once you have cleared all ten Master Missions for a type."
          unlocked={grand || allCleared}
        />
        <CapstoneCard
          title="Mega Evolution Access"
          body="Opens after Grand Master, where the species supports Mega Evolution."
          unlocked={mega}
        />
        <CapstoneCard
          title="Z-Move Access"
          body="Opens after Grand Master, paired with a Sparkling Stone and a Z-Crystal."
          unlocked={zmove}
        />
      </SimpleGrid>
    </Stack>
  );
}

export default function Research() {
  const { user } = useAuth();
  const uid = user?.uid;

  const configQuery = useQuery({
    queryKey: ["research-config"],
    queryFn: getResearchConfig,
  });

  const charactersQuery = useQuery({
    queryKey: ["characters", uid],
    queryFn: () => getCharacters(uid as string),
    enabled: !!uid,
  });

  const progressQuery = useQuery({
    queryKey: ["research-progress", uid],
    queryFn: () => getResearchProgress(uid as string),
    enabled: !!uid,
  });

  const itemsQuery = useQuery({
    queryKey: ["items", uid],
    queryFn: () => getItems(uid as string),
    enabled: !!uid,
  });

  const specialChars = React.useMemo(
    () => (charactersQuery.data?.sortedData ?? []).filter((c) => c.type !== "None"),
    [charactersQuery.data]
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedId && specialChars.length) {
      setSelectedId(specialChars[0].id);
    }
  }, [specialChars, selectedId]);

  const config = configQuery.data ?? {};
  const fossilMap = config.fossilMap ?? {};
  const channelerTypes = config.channelerTypes ?? [];
  const progressMap = progressQuery.data ?? {};

  const fossilItems = React.useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((item) => Object.prototype.hasOwnProperty.call(fossilMap, item.id))
        .map((item) => ({ id: item.id, name: item.name })),
    [itemsQuery.data, fossilMap]
  );

  const selected = specialChars.find((c) => c.id === selectedId);
  const selectedProgress = selectedId ? progressMap[selectedId] : undefined;
  const fallbackType = channelerTypes[0] ?? "Dark";

  const loading =
    configQuery.isPending ||
    (!!uid && (charactersQuery.isPending || progressQuery.isPending));

  return (
    <Container size="lg" py={{ base: 24, sm: 44 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={36}>
        {/* Hero */}
        <Stack gap={10}>
          <Text fz={12} fw={700} c="grape.4" style={{ letterSpacing: 2 }}>
            SNAGEM RESEARCH FACILITY &middot; CLEARANCE LEVEL O
          </Text>
          <Title order={1} c="white" fz={{ base: 34, sm: 46 }} fw={700}>
            Become a Master!
          </Title>
          <Text fz={15} c="gray.4" maw={720}>
            This is the endgame. Beyond the everyday roleplay lies the deepest research the Guild
            offers: transform your character, clear the Master Missions one by one, and earn access
            to powers no ordinary trainer will ever touch. It is a long road, and it starts here.
          </Text>
        </Stack>

        {loading ? (
          <SectionLoader />
        ) : (
          <>
            {/* Character selector + tracker */}
            {uid && specialChars.length ? (
              <Stack gap={16}>
                <Select
                  label="Viewing research for"
                  data={specialChars.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.type})`,
                  }))}
                  value={selectedId}
                  onChange={setSelectedId}
                  radius="md"
                  maw={320}
                  w="100%"
                  aria-label="Choose which character's research to view"
                />
                <Prerequisites
                  character={
                    selected
                      ? {
                          name: selected.name,
                          species: selected.species,
                          type: selected.type,
                        }
                      : undefined
                  }
                />
              </Stack>
            ) : (
              <Stack gap={16}>
                <Card bg={DARK_CARD} radius="md" p={{ base: 16, sm: 20 }} withBorder>
                  <Text fz={15} c="white" fw={600} mb={4}>
                    You have no Hybrid or Channeler characters yet
                  </Text>
                  <Text fz={13} c="gray.5">
                    Transform a character into a Hybrid or Channeler to open a research file and start
                    tracking Master Missions. The guide below explains every step.
                  </Text>
                </Card>
                <Prerequisites />
              </Stack>
            )}

            <PathToMastery />
            <TwoDivisions />
            <ThreeChambers fossilMap={fossilMap} fossilItems={fossilItems} />

            {selectedId && (
              <MasterMissions
                characterId={selectedId}
                progress={selectedProgress}
                fallbackType={fallbackType}
              />
            )}

            <Capstone progress={selectedProgress} />
          </>
        )}
      </Stack>
    </Container>
  );
}
