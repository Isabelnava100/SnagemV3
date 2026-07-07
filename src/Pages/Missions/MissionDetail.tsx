import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconCoin, IconStar } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getMission, Mission, submitMission } from "../../queries/missions";

/**
 * Full-page mission brief (the detail view behind a Mission Vault card). Members
 * read the story, objective, opposition, and rewards, then paste their Quests
 * thread link to send the run to a grader. Picking up and grading happen in the
 * forum, so this page only writes through the submitMission callable.
 */

const TIER_COLOR: Record<string, string> = {
  Story: "grape",
  Standard: "teal",
  Master: "violet",
  Exceptional: "orange",
};

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "Pokemon Egg",
};

/** Normalize a string | string[] field into an array of lines. */
function toLines(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function RewardChip(props: { label: string; dot?: string; icon?: React.ReactNode }) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      bg="rgba(255,255,255,0.05)"
      px={8}
      py={4}
      style={{ borderRadius: 8 }}
    >
      {props.icon}
      {props.dot && (
        <Box
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: props.dot,
          }}
        />
      )}
      <Text fz={12} c="white">
        {props.label}
      </Text>
    </Group>
  );
}

function BackLink() {
  return (
    <Link
      to="/Missions"
      style={{ textDecoration: "none", width: "fit-content" }}
    >
      <Group gap={6} wrap="nowrap" c="dimmed">
        <IconArrowLeft size={16} />
        <Text fz={13}>Back to missions</Text>
      </Group>
    </Link>
  );
}

function LineSection(props: { title: string; lines: string[] }) {
  if (!props.lines.length) return null;
  return (
    <Box>
      <Text c="white" fw={600} fz={15} mb={6}>
        {props.title}
      </Text>
      <Stack gap={3}>
        {props.lines.map((line, i) => (
          <Text key={i} c="gray.4" fz={14}>
            {line}
          </Text>
        ))}
      </Stack>
    </Box>
  );
}

function SubmitCard(props: { missionId: string }) {
  const { user } = useAuth();
  const [threadLink, setThreadLink] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const submit = useMutation({
    mutationFn: () => submitMission(props.missionId, threadLink.trim()),
    onSuccess: () =>
      setMsg("Sent to a grader. Watch your notifications for the reward."),
    onError: (e) => setMsg((e as Error).message || "Could not submit. Try again."),
  });

  return (
    <Card bg="#232122" radius="lg" withBorder p={{ base: 16, sm: 20 }}>
      <Text c="white" fw={600} fz={16} mb={4}>
        Submit for grading
      </Text>
      <Text c="dimmed" fz={13} mb={12}>
        Play this mission out in a Quests forum thread, then paste the thread link
        here to send it to a grader. Base pay is Snag Coins, write it well and the
        grader tips extra.
      </Text>

      {!user ? (
        <Text
          c="dimmed"
          fz={14}
          role="status"
          aria-live="polite"
          py={8}
        >
          Sign in to submit this mission.
        </Text>
      ) : (
        <>
          <TextInput
            value={threadLink}
            onChange={(e) => setThreadLink(e.currentTarget.value)}
            placeholder="Link to your Quests thread"
            aria-label="Link to your Quests thread"
            mb={10}
          />
          <Button
            fullWidth
            loading={submit.isPending}
            disabled={!threadLink.trim() || submit.isPending}
            onClick={() => {
              setMsg("");
              submit.mutate();
            }}
          >
            Submit for grading
          </Button>
          {msg && (
            <Text
              role="status"
              aria-live="polite"
              fz={13}
              mt={8}
              c={
                /could not|error|not enough|cannot|invalid|fail/i.test(msg)
                  ? "#E35C65"
                  : "teal"
              }
            >
              {msg}
            </Text>
          )}
        </>
      )}
    </Card>
  );
}

export default function MissionDetail() {
  const { id } = useParams();
  const { data: mission, isPending } = useQuery({
    queryKey: ["mission", id],
    queryFn: () => getMission(id!),
    enabled: !!id,
  });

  if (isPending) {
    return (
      <Container size="md" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        <Stack gap={16}>
          <BackLink />
          <SectionLoader />
        </Stack>
      </Container>
    );
  }

  if (!mission) {
    return (
      <Container size="md" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        <Stack gap={16}>
          <BackLink />
          <Card bg="#232122" radius="lg" withBorder p={{ base: 20, sm: 28 }}>
            <Title order={1} c="white" fz={{ base: 22, sm: 26 }} mb={8}>
              Mission not found
            </Title>
            <Text c="dimmed" fz={14}>
              This mission may have been retired or the link is out of date. Head
              back to the Vault to pick another job.
            </Text>
          </Card>
        </Stack>
      </Container>
    );
  }

  const objectives = toLines(mission.objective);
  const oppositions = toLines(mission.opposition);
  const rewardLabel = mission.pokemon_reward
    ? REWARD_LABEL[mission.pokemon_reward.kind]
    : undefined;
  const hasRewards =
    !!mission.coins ||
    !!rewardLabel ||
    !!mission.special_item ||
    !!mission.emblem_eligible ||
    !!mission.pokemon_reward?.note;

  return (
    <Box>
      <Container size="md" pt={{ base: 16, sm: 24 }} px={{ base: 16, sm: 24 }}>
        <BackLink />
      </Container>

      <Container size="md" py={{ base: 16, sm: 24 }} px={{ base: 16, sm: 24 }}>
        <Stack gap={20}>
          <Box
            p={{ base: 20, sm: 32 }}
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              background: mission.image
                ? `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.7) 100%), center / cover no-repeat url(${mission.image})`
                : "linear-gradient(135deg,#3A2A4D 0%,#2C3E50 100%)",
            }}
          >
            <Group gap={8} wrap="wrap" mb={12}>
              {mission.tier && (
                <Badge
                  color={TIER_COLOR[mission.tier] ?? "gray"}
                  variant="filled"
                  size="sm"
                >
                  {mission.tier}
                </Badge>
              )}
              {mission.emblem_eligible && (
                <Badge
                  color="yellow"
                  variant="filled"
                  size="sm"
                  leftSection={<IconStar size={11} />}
                >
                  EMBLEM
                </Badge>
              )}
            </Group>
            <Title order={1} c="white" fw={700} fz={{ base: 26, sm: 34 }}>
              {mission.title}
            </Title>
            {mission.location && (
              <Text c="gray.3" fz={{ base: 13, sm: 15 }} mt={6}>
                {mission.location}
              </Text>
            )}
          </Box>

          {mission.story && (
            <Box>
              <Text c="white" fw={600} fz={15} mb={6}>
                Story
              </Text>
              <Box
                fz={14}
                c="gray.3"
                style={{ lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(mission.story),
                }}
              />
            </Box>
          )}

          <LineSection title="Objective" lines={objectives} />
          <LineSection title="Opposition" lines={oppositions} />

          {mission.pokemon_note && (
            <Box>
              <Text c="white" fw={600} fz={15} mb={6}>
                Pokemon note
              </Text>
              <Text c="gray.4" fz={14}>
                {mission.pokemon_note}
              </Text>
            </Box>
          )}

          {hasRewards && (
            <Box>
              <Text c="white" fw={600} fz={15} mb={8}>
                Rewards
              </Text>
              <Group gap={8} wrap="wrap">
                {!!mission.coins && (
                  <RewardChip
                    label={`${mission.coins} Snag Coins`}
                    icon={<IconCoin size={14} color="#F5C842" />}
                  />
                )}
                {rewardLabel && <RewardChip label={rewardLabel} dot="#8C2595" />}
                {mission.special_item && (
                  <RewardChip label={mission.special_item} dot="#3B82F6" />
                )}
                {mission.emblem_eligible && (
                  <RewardChip label="Snag Emblem Piece" dot="#F5C842" />
                )}
                {mission.pokemon_reward?.note && (
                  <RewardChip label={mission.pokemon_reward.note} />
                )}
              </Group>
            </Box>
          )}

          <Divider />

          <SubmitCard missionId={mission.id} />
        </Stack>
      </Container>
    </Box>
  );
}
