import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck, IconGift, IconInfoCircle, IconLock } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
import {
  SNAG_TASKS,
  SnagTask,
  claimSnagBox,
  currentWeekId,
  getSnagList,
  resetCountdown,
} from "../../queries/activities";
import { getItems } from "../../queries/dashboard";
import {
  DEFAULT_BATTLE_MECHANICS,
  callEnsureFishingThread,
  callHarvestBerry,
  callPlantBerry,
  getBattleConfig,
  getFarm,
} from "../../queries/game";

/**
 * The Activities page: the Snag List, a weekly six-task checklist. Progress is
 * tracked server-side (the gameplay Cloud Functions mark each task), resets
 * every Monday 00:00 UTC, and finishing all six unlocks one weekly Mystery
 * Box. The streak counts consecutive fully-completed weeks.
 */

interface TaskDef {
  key: SnagTask;
  icon: SnagIconName;
  iconBg: string;
  title: string;
  desc: string;
  pts: number;
  linkLabel: string;
  link: string;
}

const TASKS: TaskDef[] = [
  {
    key: "battle",
    icon: "swords",
    iconBg: "#3a3114",
    title: "Battle once at the Colosseum",
    desc: "Any Super Training bout or a Battle Rankings match counts.",
    pts: 40,
    linkLabel: "Go to Colosseum",
    link: "/Colosseum",
  },
  {
    key: "casino",
    icon: "dice",
    iconBg: "#2d1f3d",
    title: "Roll once at the Casino",
    desc: "Spin, roll, or buy a lotto ticket. One wager is enough.",
    pts: 30,
    linkLabel: "Go to Casino",
    link: "/Casino",
  },
  {
    key: "post",
    icon: "chat",
    iconBg: "#242743",
    title: "Make a post on the Forum",
    desc: "Reply to a thread or start your own in any board.",
    pts: 35,
    linkLabel: "Go to Forum",
    link: "/Forum/Main-Forum",
  },
  {
    key: "catch",
    icon: "pokeball",
    iconBg: "#3d1d1d",
    title: "Catch a Pokémon",
    desc: "Log one new capture from a mission, tour, or encounter.",
    pts: 50,
    linkLabel: "Find encounters",
    link: "/Missions",
  },
  {
    key: "activity",
    icon: "ferris",
    iconBg: "#1d3436",
    title: "Participate in an activity",
    desc: "Join any community activity, mission or event this week.",
    pts: 55,
    linkLabel: "See activities",
    link: "/Missions",
  },
  {
    key: "mall",
    icon: "bag",
    iconBg: "#3a1f33",
    title: "Spend at the Snag Mall",
    desc: "Buy, recycle, or craft anything at the Mall.",
    pts: 25,
    linkLabel: "Visit the Mall",
    link: "/Shop",
  },
];

const BOX_CHOICES: Array<{ value: "random" | "currency" | "egg"; label: string; icon: SnagIconName }> = [
  { value: "random", label: "Random Item", icon: "bag" },
  { value: "currency", label: "Currency Stash", icon: "coin" },
  { value: "egg", label: "Mystery Egg", icon: "egg" },
];

function TaskCard(props: { task: TaskDef; done: boolean }) {
  const { task, done } = props;
  return (
    <Card
      bg="#17141f"
      radius="lg"
      p="lg"
      withBorder
      style={{ borderColor: done ? "#2f7a4a" : "#2a2637", opacity: done ? 0.92 : 1 }}
    >
      <Group justify="space-between" align="flex-start" mb="md" wrap="nowrap">
        <Box
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: task.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SnagIcon name={task.icon} size={26} title="" cut={task.iconBg} />
        </Box>
        <Box
          aria-label={done ? `${task.title}: done` : `${task.title}: not done yet`}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `2px solid ${done ? "#37b26c" : "#3a3550"}`,
            background: done ? "#1d4a30" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {done && <IconCheck size={18} color="#69db7c" />}
        </Box>
      </Group>

      <Text fz={21} fw={700} c="white" mb={4}>
        {task.title}
      </Text>
      <Text fz={14} c="dimmed" mb="md">
        {task.desc}
      </Text>

      <Group gap={10}>
        <Badge variant="filled" color="gold.0" radius="xl" size="lg">
          {task.pts}
        </Badge>
        <Text component={Link} to={task.link} fz={14} fw={600} c="grape.3" td="none">
          {task.linkLabel} &rarr;
        </Text>
      </Group>
    </Card>
  );
}

/**
 * The Berry Farm: plant a berry from your bag in an open plot, wait the grow
 * days, harvest a multiplied yield. All writes go through the plantBerry /
 * harvestBerry callables; plot count, grow days and yield are admin-tunable.
 */
function BerryFarm(props: { uid: string }) {
  const { uid } = props;
  const queryClient = useQueryClient();
  const [pickFor, setPickFor] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState("");

  const { data: farm } = useQuery({ queryKey: ["farm", uid], queryFn: () => getFarm(uid) });
  const { data: items } = useQuery({
    queryKey: ["get-items", uid],
    queryFn: () => getItems(uid),
  });
  const { data: cfg } = useQuery({ queryKey: ["battle-config"], queryFn: getBattleConfig });
  const mech = cfg?.mechanics ?? DEFAULT_BATTLE_MECHANICS;
  const berries = (items ?? []).filter((i) => i.category === "berry" && Number(i.quantity) > 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["farm", uid] });
    queryClient.invalidateQueries({ queryKey: ["get-items", uid] });
  };
  const plant = useMutation({
    mutationFn: (input: { itemId: string; slot: number }) =>
      callPlantBerry(input.itemId, input.slot),
    onSuccess: () => {
      setMessage("Planted! Come back when it has grown.");
      setPickFor(null);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "That could not be planted."),
  });
  const harvest = useMutation({
    mutationFn: (slot: number) => callHarvestBerry(slot),
    onSuccess: (res) => {
      setMessage(`Harvested ${res.qty}x ${res.harvested}!`);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "Not ready yet."),
  });

  const plots = farm?.plots ?? {};
  const plotCount = Math.max(1, mech.farmPlots);
  const daysGrown = (p: { plantedAt?: { seconds: number } }) =>
    p.plantedAt?.seconds ? (Date.now() / 1000 - p.plantedAt.seconds) / 86_400 : 0;

  return (
    <Card bg="#141b14" radius="lg" p="lg" withBorder style={{ borderColor: "#26372a" }}>
      <Text fz={14} fw={700} c="#8CE99A" tt="uppercase" style={{ letterSpacing: 2 }}>
        The Berry Farm
      </Text>
      <Title order={2} fz={24} fw={800} c="white" lh="md">
        Plant one, harvest {Math.max(1, mech.berryYield)}
      </Title>
      <Text fz={14} c="dimmed" mb={12}>
        Drop a bag berry in an open plot; it is ready to pick after {mech.berryGrowDays}{" "}
        {mech.berryGrowDays === 1 ? "day" : "days"}.
      </Text>
      <SimpleGrid cols={{ base: 1, xs: Math.min(3, plotCount) as 1 | 2 | 3 }} spacing="md">
        {Array.from({ length: plotCount }).map((_, slot) => {
          const plot = plots[String(slot)];
          const grown = plot ? daysGrown(plot) : 0;
          const ready = plot && grown >= mech.berryGrowDays;
          return (
            <Card key={slot} bg="#101710" radius="md" p="md" withBorder style={{ borderColor: "#26372a", borderStyle: plot ? "solid" : "dashed" }}>
              <Stack gap={6} align="center">
                <Text fz={13} c="dimmed" tt="uppercase" fw={700}>
                  Plot {slot + 1}
                </Text>
                {plot ? (
                  <>
                    <Text fz={16} fw={700} c="white" ta="center">
                      {plot.name}
                    </Text>
                    <Text fz={13} c={ready ? "teal.4" : "dimmed"}>
                      {ready
                        ? "Ready to harvest!"
                        : `About ${Math.max(1, Math.ceil(mech.berryGrowDays - grown))} day(s) to go`}
                    </Text>
                    <Button
                      size="compact-sm"
                      radius="xl"
                      color="teal"
                      variant={ready ? "filled" : "default"}
                      loading={harvest.isPending}
                      onClick={() => {
                        setMessage("");
                        harvest.mutate(slot);
                      }}
                    >
                      Harvest
                    </Button>
                  </>
                ) : pickFor === slot ? (
                  <Stack gap={6} w="100%">
                    {berries.length ? (
                      berries.slice(0, 20).map((b) => (
                        <Button
                          key={b.id}
                          size="compact-sm"
                          radius="xl"
                          variant="light"
                          color="teal"
                          loading={plant.isPending}
                          onClick={() => {
                            setMessage("");
                            plant.mutate({ itemId: b.id, slot });
                          }}
                        >
                          Plant {b.name} (x{b.quantity})
                        </Button>
                      ))
                    ) : (
                      <Text fz={13} c="dimmed" ta="center">
                        No berries in your bag. The Mall and encounters drop them.
                      </Text>
                    )}
                    <Button size="compact-xs" radius="xl" variant="subtle" color="gray" onClick={() => setPickFor(null)}>
                      Cancel
                    </Button>
                  </Stack>
                ) : (
                  <>
                    <Text fz={14} c="dimmed">
                      Empty soil
                    </Text>
                    <Button size="compact-sm" radius="xl" color="teal" variant="default" onClick={() => setPickFor(slot)}>
                      Plant a berry
                    </Button>
                  </>
                )}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
      {message && (
        <Text fz={14} mt="sm" c="teal.4" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Card>
  );
}

/**
 * The Fishing Pond: a pinned Events thread where members cast once a week
 * (rod required, star 1-3 Water-types, release for 1 Snag Coin). The thread
 * is created server-side on first visit, like the Colosseum training log.
 */
function FishingPondCard() {
  const [message, setMessage] = React.useState("");
  const go = useMutation({
    mutationFn: callEnsureFishingThread,
    onSuccess: (res) => {
      window.location.assign(`/Forum/Events/thread/${res.threadId}/last`);
    },
    onError: (e) => setMessage((e as Error).message || "Could not reach the pond. Try again."),
  });
  return (
    <Card bg="#101720" radius="lg" p="lg" withBorder style={{ borderColor: "#24374a" }}>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Box style={{ minWidth: 0, flex: "1 1 320px" }}>
          <Text fz={14} fw={700} c="#74c0fc" tt="uppercase" style={{ letterSpacing: 2 }}>
            The Fishing Pond
          </Text>
          <Text fz={24} fw={800} c="white">
            Cast a line, once a week
          </Text>
          <Text fz={14} c="dimmed">
            A rod is required: earn your first from the Rod Thief mission, or buy one at the
            Snag Mall. Fish with the character of your choice. Bites are mostly 1★ to 3★
            Water-types, better rods land rarer bites, and the Super Rod even has a 5% shot
            at a 4★ catch. Battle and catch it, or let it go for 1 Snag Coin. The pond
            restocks Monday 00:00 UTC.
          </Text>
        </Box>
        <Button
          radius="xl"
          size="md"
          variant="gradient"
          gradient={{ from: "blue", to: "cyan", deg: 90 }}
          loading={go.isPending}
          onClick={() => {
            setMessage("");
            go.mutate();
          }}
        >
          Head to the Pond
        </Button>
      </Group>
      {message && (
        <Text fz={14} mt="sm" c="#E54156" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Card>
  );
}

export default function Activities() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [choice, setChoice] = React.useState<"random" | "currency" | "egg">("random");
  const [claimMessage, setClaimMessage] = React.useState("");

  const { data: list, isPending } = useQuery({
    queryKey: ["snaglist", uid],
    queryFn: () => getSnagList(uid as string),
    enabled: !!uid,
  });

  const claimMutation = useMutation({
    mutationFn: () => claimSnagBox(choice),
    onSuccess: (res) => {
      setClaimMessage(`Box opened! You got ${res.reward}.`);
      queryClient.invalidateQueries({ queryKey: ["snaglist", uid] });
      queryClient.invalidateQueries({ queryKey: ["currencies", uid] });
      queryClient.invalidateQueries({ queryKey: ["get-items", uid] });
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons", uid] });
    },
    onError: (e) =>
      setClaimMessage((e as Error).message || "Could not open the box. Try again."),
  });

  // Stale docs from a previous week read as an empty checklist.
  const sameWeek = list?.weekId === currentWeekId();
  const tasks = sameWeek ? list?.tasks ?? {} : {};
  const doneCount = SNAG_TASKS.filter((t) => tasks[t]).length;
  const allDone = doneCount === SNAG_TASKS.length;
  const boxClaimed = sameWeek && !!list?.boxClaimed;
  // A streak is only alive if last week (or this week) was fully completed;
  // the stored number goes stale after a missed week until the next full run.
  const prevWeekId = (() => {
    const d = new Date(`${currentWeekId()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const streakAlive =
    list?.completedWeekId === currentWeekId() || list?.completedWeekId === prevWeekId;
  const streak = streakAlive ? list?.streak ?? 0 : 0;

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo page="/Activities" />
      <PageHero
        eyebrow={
          streak > 0
            ? `${streak}-week streak · keep it alive`
            : "Weekly checklist · resets Monday"
        }
        eyebrowColor="#F5C842"
        title="The Snag List"
        subtitle="Knock out these six and open your Weekly Mystery Box. Everything resets Monday, so pace yourself."
        aside={
          <Card bg="rgba(0,0,0,0.35)" radius="lg" p="md" withBorder style={{ borderColor: "#3a3550" }}>
            <Group gap="md" wrap="nowrap">
              <RingProgress
                size={84}
                thickness={8}
                roundCaps
                sections={[{ value: (doneCount / SNAG_TASKS.length) * 100, color: "teal" }]}
                label={
                  <Stack gap={0} align="center">
                    <Text fz={20} fw={800} c="white" lh={1}>
                      {doneCount}/6
                    </Text>
                    <Text fz={14} c="dimmed" tt="uppercase">
                      done
                    </Text>
                  </Stack>
                }
              />
              <Box>
                <Text fz={14} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
                  Resets in
                </Text>
                <Text fz={26} fw={800} c="#F5C842" lh={1.1}>
                  {resetCountdown()}
                </Text>
                <Text fz={14} c="dimmed">
                  Monday, 00:00 UTC
                </Text>
              </Box>
            </Group>
          </Card>
        }
      />

      {!uid ? (
        <Title order={2} fz={16} fw={400} c="dimmed" py={20} lh="md">
          Sign in to track your weekly Snag List.
        </Title>
      ) : isPending ? (
        <SectionLoader />
      ) : (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            {TASKS.map((task) => (
              <TaskCard key={task.key} task={task} done={!!tasks[task.key]} />
            ))}
          </SimpleGrid>

          {/* Weekly Mystery Box */}
          <Card bg="#17141f" radius="lg" p="lg" withBorder style={{ borderColor: "#2a2637" }}>
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 320px" }}>
                <Box
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: allDone && !boxClaimed ? "#3a3114" : "#221f2b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconGift size={30} color={allDone && !boxClaimed ? "#F5C842" : "#6a6580"} />
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text fz={14} fw={700} c="#F5C842" tt="uppercase" style={{ letterSpacing: 2 }}>
                    Weekly Mystery Box Choice
                  </Text>
                  <Title order={2} fz={24} fw={800} c="white" lh="md">
                    Finish all six, pick your box
                  </Title>
                  <Text fz={14} c="dimmed" mb={10}>
                    Inside your pick: a random Mall item, a coin stash, or an egg that hatches on
                    the spot.
                  </Text>
                  <Group gap={8} wrap="wrap">
                    {BOX_CHOICES.map((b) => (
                      <Button
                        key={b.value}
                        size="xs"
                        radius="xl"
                        variant={choice === b.value ? "gradient" : "default"}
                        gradient={{ from: "gold.0", to: "gold.3", deg: 90 }}
                        leftSection={<SnagIcon name={b.icon} size={14} title="" />}
                        onClick={() => setChoice(b.value)}
                        aria-pressed={choice === b.value}
                        disabled={boxClaimed}
                      >
                        {b.label}
                      </Button>
                    ))}
                  </Group>
                </Box>
              </Group>

              <Stack gap={6} align="flex-end" style={{ flexShrink: 0 }}>
                {boxClaimed ? (
                  <Badge color="teal" variant="filled" size="lg" radius="xl">
                    Opened this week
                  </Badge>
                ) : allDone ? (
                  <Button
                    variant="gradient"
                    gradient={{ from: "gold.0", to: "gold.3", deg: 90 }}
                    radius="xl"
                    size="md"
                    loading={claimMutation.isPending}
                    onClick={() => {
                      setClaimMessage("");
                      claimMutation.mutate();
                    }}
                  >
                    Open your box
                  </Button>
                ) : (
                  <Button variant="default" radius="xl" size="md" disabled leftSection={<IconLock size={16} />}>
                    Locked &middot; {SNAG_TASKS.length - doneCount} to go
                  </Button>
                )}
              </Stack>
            </Group>
            {claimMessage && (
              <Text
                fz={14}
                mt="sm"
                c={/could not|error|finish|already/i.test(claimMessage) ? "#E54156" : "teal.4"}
                role="status"
                aria-live="polite"
              >
                {claimMessage}
              </Text>
            )}
          </Card>

          <BerryFarm uid={uid} />

          <FishingPondCard />

          <Group gap={8} wrap="nowrap" align="flex-start">
            <IconInfoCircle size={16} color="#74c0fc" style={{ flexShrink: 0, marginTop: 2 }} />
            <Text fz={14} c="dimmed">
              More activities are coming soon. The Snag List is the first of the weekly events;
              seasonal games and community challenges will join it here.
            </Text>
          </Group>
        </Stack>
      )}
    </Container>
  );
}
