import {
  Anchor,
  Badge,
  Box,
  Flex,
  Group,
  Image,
  List,
  Popover,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { emojiData, getEmoteImageURL } from "../../../../data/emote";
import { ArrowSwapIcon, CheckCircleIcon, CrossCircleIcon } from "../../../../icons";
import { autoBadgeIdsFor, getBadgeCatalog } from "../../../../queries/badges";
import { getBadges, getEmojis } from "../../../../queries/settings";

function useGetBadgesQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["get-badges", user?.uid],
    queryFn: async () => getBadges(user?.uid as string),
  });
}

function useGetEmojisQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["get-emojis", user?.uid],
    queryFn: async () => getEmojis(user?.uid as string),
  });
}

/**
 * Insert/disable a badge. Runs through the setBadgeEnabled Cloud Function,
 * which validates ownership + the max-5 rule and syncs the enabled set into
 * users/{uid}.badges (what forum post cards display).
 */
function useToggleBadgeMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState("");
  const mutation = useMutation({
    mutationFn: async ({ label, enabled }: { label: string; enabled: boolean }) => {
      const { callSetBadgeEnabled } = await import("../../../forum/functionsClient");
      await callSetBadgeEnabled(label, enabled);
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["get-badges", user?.uid] });
    },
    onError: async (err) => {
      const { callableMessage } = await import("../../../forum/functionsClient");
      setError(callableMessage(err, "Could not update the badge — try again."));
    },
  });
  return { ...mutation, error };
}

export type BadgeTypes = "New User" | "Admin" | "Legacy";

export interface Badge {
  label: BadgeTypes;
  background: string;
  enabled: boolean;
}

function BadgesSectionWrapper(props: {
  title: string;
  secondaryText?: string;
  badges: Badge[];
  showEnabledOnly?: boolean;
  onToggle: (badge: Badge) => void;
  toggling: boolean;
}) {
  const { title, secondaryText, badges, showEnabledOnly = true, onToggle, toggling } = props;
  const enabledBadges = badges.filter((badge) => badge.enabled);
  const disabledBadges = badges.filter((badge) => !badge.enabled);
  const displayedBadges = showEnabledOnly ? enabledBadges : disabledBadges;
  return (
    <Stack gap={12}>
      <Group align="center">
        <Title size={24} c="white" fw={400} order={3}>
          {title}
        </Title>
        {secondaryText && (
          <Text c="rgba(255, 255, 255, 0.50)" fz={16} fw={400}>
            {secondaryText}
          </Text>
        )}
      </Group>
      <Flex gap={8} wrap="wrap">
        {displayedBadges.map((badge) => (
          <Badge
            key={badge.label}
            bg={badge.background}
            sx={{
              color: "white",
              textTransform: "none",
              fontWeight: 400,
              fontSize: 16,
              cursor: toggling ? "wait" : "pointer",
              opacity: toggling ? 0.6 : 1,
            }}
            size="lg"
            title={badge.enabled ? "Click to disable" : "Click to insert"}
            onClick={() => !toggling && onToggle(badge)}
          >
            {badge.label}
          </Badge>
        ))}
        {!displayedBadges.length && (
          <Text fz={13} c="dimmed">
            {showEnabledOnly ? "No badges inserted." : "Nothing here."}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}

/**
 * Badges the user earns automatically from their account status (legacy, new
 * user, admin, master). Derived — always current — and shown read-only above
 * the toggleable badges.
 */
function AutoBadges() {
  const { user } = useAuth();
  const { data: catalog } = useQuery({ queryKey: ["badge-catalog"], queryFn: getBadgeCatalog });
  const info = (user?.otherinfo ?? {}) as {
    permissions?: string;
    capabilities?: string[];
    isGaia?: string;
  };
  const ids = autoBadgeIdsFor(info);
  if (!ids.length || !catalog) return null;
  const earned = catalog.filter((badge) => ids.includes(badge.id));
  if (!earned.length) return null;

  return (
    <Stack gap={8}>
      <Group gap={6} align="center">
        <Title size={18} c="white" fw={400} order={4}>
          Earned Automatically
        </Title>
        <Text c="rgba(255, 255, 255, 0.50)" fz={13}>
          from your account status
        </Text>
      </Group>
      <Flex gap={8} wrap="wrap">
        {earned.map((badge) => (
          <Badge
            key={badge.id}
            size="lg"
            title={badge.description}
            sx={{
              background: badge.background,
              color: "white",
              textTransform: "none",
              fontWeight: 400,
              fontSize: 16,
            }}
          >
            {badge.name}
          </Badge>
        ))}
      </Flex>
    </Stack>
  );
}

function Badges() {
  const { data, isPending: isLoading, isError } = useGetBadgesQuery();
  const toggleMutation = useToggleBadgeMutation();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { formattedData } = data;

  const toggle = (badge: Badge) =>
    toggleMutation
      .mutateAsync({ label: badge.label, enabled: !badge.enabled })
      .catch(() => undefined);

  return (
    <Stack gap={8}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        {formattedData.length ? (
          <>
            <BadgesSectionWrapper
              title="Badges Enabled"
              secondaryText="Max: 5 — click a badge to move it"
              badges={formattedData}
              onToggle={toggle}
              toggling={toggleMutation.isPending}
            />
            <Box
              mt={6}
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image src={ArrowSwapIcon} alt="Swap" w="100%" h="100%" fit="contain" />
            </Box>
            <BadgesSectionWrapper
              title="Badges Disabled"
              badges={formattedData}
              showEnabledOnly={false}
              onToggle={toggle}
              toggling={toggleMutation.isPending}
            />
          </>
        ) : (
          <EmptyMessage title="No badges" description="You currently have no badges" />
        )}
      </Flex>
      {toggleMutation.error && (
        <Text fz={13} c="#E35C65">
          {toggleMutation.error}
        </Text>
      )}
    </Stack>
  );
}

function Emojis() {
  const { data, isPending: isLoading, isError } = useGetEmojisQuery();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const emojiIds = data;
  return (
    <SimpleSectionWrapper>
      <Stack gap={18}>
        <Title size={24} c="white" fw={400} order={3}>
          Your Emoji Collection
        </Title>
        {emojiIds.length ? (
          <Flex gap={10} wrap="wrap">
            {emojiIds.map((emojiId: string) => {
              const emoji = emojiData.find((emojiObj) => emojiObj.id === emojiId);
              if (!emoji) return <></>;
              return (
                <Flex
                  w={50}
                  h={50}
                  justify="center"
                  align="center"
                  bg="#3C3A3C"
                  sx={{ borderRadius: "100%", flexShrink: 0, border: "3px solid transparent" }}
                  key={emojiId}
                >
                  <Image
                    width={30}
                    height={30}
                    sx={{ objectFit: "cover" }}
                    src={getEmoteImageURL(emoji?.Filename)}
                    alt={emojiId}
                  />
                </Flex>
              );
            })}
          </Flex>
        ) : (
          <EmptyMessage title="Empty" description="You haven't obtained any emojis yet" />
        )}
      </Stack>
    </SimpleSectionWrapper>
  );
}

function EmojiCollection() {
  const { data, isPending: isLoading, isError } = useGetEmojisQuery();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const userEmojiIds = data;
  return (
    <Stack gap={18}>
      <Title size={24} c="white" fw={400} order={3}>
        Collection of All Emojis
      </Title>
      <Flex wrap="wrap" gap={8}>
        {emojiData.map((emoji, index) => {
          const existingEmoji = userEmojiIds.find(
            (userEmojiId: string) => userEmojiId === emoji.id
          );
          return (
            <Popover width={265} withinPortal position="bottom-start" shadow="md" key={index}>
              <Popover.Target>
                <Flex
                  justify="center"
                  align="center"
                  bg="#3C3A3C"
                  sx={{
                    borderRadius: "100%",
                    width: 50,
                    height: 50,
                    cursor: "pointer",
                    border: "3px solid",
                    borderColor: "transparent",
                  }}
                >
                  <Image
                    src={getEmoteImageURL(emoji.Filename)}
                    alt={emoji.Name}
                    width={30}
                    height={30}
                  />
                </Flex>
              </Popover.Target>
              <Popover.Dropdown
                bg="#1E1D20"
                sx={{ borderRadius: 22, border: "none", color: "white" }}
                p={16}
              >
                <Stack gap={8}>
                  <Flex gap={10}>
                    <Flex
                      w={60}
                      h={60}
                      justify="center"
                      align="center"
                      bg="#3C3A3C"
                      sx={{
                        borderRadius: "100%",
                        border: "4px solid",
                        borderColor: existingEmoji ? "#22B573" : "white",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={getEmoteImageURL(emoji.Filename)}
                        alt={emoji.Name}
                        width={30}
                        height={30}
                        className="object-cover"
                      />
                    </Flex>
                    <Stack gap={0}>
                      <Title order={4} size={16} fw={500}>
                        {emoji.Name}
                      </Title>
                      <Text fz={12}>{emoji.Description}</Text>
                    </Stack>
                    <Box sx={{ flexShrink: 0 }}>
                      {existingEmoji ? (
                        <Image
                          src={CheckCircleIcon}
                          alt="Check circle icon"
                          width={20}
                          height={20}
                        />
                      ) : (
                        <Image
                          src={CrossCircleIcon}
                          alt="Cross circle icon"
                          width={20}
                          height={20}
                        />
                      )}
                    </Box>
                  </Flex>
                  <Stack gap={0}>
                    <Title order={5} size={16} fw={600}>
                      How to Obtain:
                    </Title>
                    <List color="white" sx={{ fontSize: 16, color: "white", fontWeight: 400 }}>
                      <List.Item>Join before 2025</List.Item>
                      <List.Item>
                        Buy for {emoji.CoinCost} Snag Coins in the{" "}
                        <Anchor className="underline text-white" component={Link} to="/Shop">
                          Marketplace
                        </Anchor>
                        .
                      </List.Item>
                      <List.Item>
                        Buy for {emoji.GemCost} Gem in the{" "}
                        <Anchor className="underline text-white inline" component={Link} to="/Shop">
                          Credit shop
                        </Anchor>
                        .
                      </List.Item>
                    </List>
                  </Stack>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          );
        })}
      </Flex>
    </Stack>
  );
}

function BadgesCollection() {
  const { data, isPending: isLoading, isError } = useGetBadgesQuery();
  const { data: catalog } = useQuery({ queryKey: ["badge-catalog"], queryFn: getBadgeCatalog });
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { formattedData: userBadges } = data;
  return (
    <Stack gap={18}>
      <Stack gap={0}>
        <Title size={24} c="white" fw={400} order={3}>
          Collection of All Badges
        </Title>
        <Text>Here&apos;s a list of all badges and how to obtain them.</Text>
      </Stack>
      <Flex wrap="wrap" gap={6}>
        {(catalog ?? []).map((badge, index) => {
          const existingUserBadge = userBadges.find(
            (userBadge) => userBadge.label === badge.name && userBadge.enabled
          );
          return (
            <Popover width={265} withinPortal position="bottom-start" shadow="md" key={index}>
              <Popover.Target>
                <Badge
                  size="lg"
                  sx={{
                    background: badge.background,
                    color: "white",
                    textTransform: "none",
                    fontSize: 16,
                    fontWeight: 400,
                    paddingTop: 5,
                    paddingBottom: 5,
                    cursor: "pointer",
                  }}
                >
                  {badge.name}
                </Badge>
              </Popover.Target>
              <Popover.Dropdown
                bg="#1E1D20"
                sx={{ borderRadius: 22, border: "none", color: "white" }}
                py={12}
                px={17}
              >
                <Stack>
                  <Text fz={14} fw={500}>
                    {badge.description}
                  </Text>
                  <Flex justify="space-between" align="center">
                    {existingUserBadge ? (
                      <>
                        <Text fz={14} fw={500} c="#22B573">
                          You have this badge
                        </Text>
                        <Image src={CheckCircleIcon} alt="Check circle icon" width={20} />
                      </>
                    ) : (
                      <>
                        <Text fz={14} fw={500} c="#E35C65">
                          You don&apos;t have this badge
                        </Text>
                        <Image src={CrossCircleIcon} alt="Cross circle icon" width={20} />
                      </>
                    )}
                  </Flex>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          );
        })}
      </Flex>
    </Stack>
  );
}

function Collection() {
  return (
    <SimpleSectionWrapper>
      <Stack>
        <EmojiCollection />
        <BadgesCollection />
      </Stack>
    </SimpleSectionWrapper>
  );
}

export default function Collections() {
  const [showCollections, setShowCollections] = React.useState(false);
  return (
    <Stack w="100%">
      <SimpleSectionWrapper>
        <Stack gap={16}>
          <AutoBadges />
          <Badges />
        </Stack>
      </SimpleSectionWrapper>
      <Emojis />
      <Stack align="end">
        <button
          onClick={() => setShowCollections((pre) => !pre)}
          className="text-[#E35C65] bg-transparent border-none outline-none text-[16px] font-[400] underline cursor-pointer"
        >
          {showCollections ? "Hide all collections" : "Show all collections"}
        </button>
      </Stack>
      {showCollections && <Collection />}
    </Stack>
  );
}
