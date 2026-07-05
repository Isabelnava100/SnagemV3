import {
  Anchor,
  Box,
  Flex,
  Group,
  HoverCard,
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
import { getProfile } from "../../../../queries/dashboard";
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
      setError(callableMessage(err, "Could not update the badge. Try again."));
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

/**
 * A clean gradient pill. We render our own instead of Mantine's <Badge> because
 * Mantine's Badge leaks its theme color at the rounded left cap (the "dot"),
 * and here we always want a full gradient/solid background.
 */
const BadgePill = React.forwardRef<
  HTMLDivElement,
  { label: string; background: string } & React.ComponentPropsWithoutRef<"div">
>(({ label, background, style, ...others }, ref) => (
  <Box
    ref={ref}
    {...others}
    style={{
      background,
      color: "white",
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1,
      padding: "7px 16px",
      borderRadius: 999,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      userSelect: "none",
      ...style,
    }}
  >
    {label}
  </Box>
));

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
          <BadgePill
            key={badge.label}
            label={badge.label}
            background={badge.background}
            title={badge.enabled ? "Click to disable" : "Click to insert"}
            onClick={() => !toggling && onToggle(badge)}
            style={{ cursor: toggling ? "wait" : "pointer", opacity: toggling ? 0.6 : 1 }}
          />
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
 * user, admin, master). Derived, always current. Users can still hide any of
 * them from public view; the hidden set lives on their own profile
 * (bag/profile.hiddenAutoBadges, owner-writable).
 */
function AutoBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: catalog } = useQuery({ queryKey: ["badge-catalog"], queryFn: getBadgeCatalog });
  const { data: profile } = useQuery({
    queryKey: ["get-profile", user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user,
  });

  const hidden = new Set(
    ((profile as { hiddenAutoBadges?: string[] } | undefined)?.hiddenAutoBadges ?? []) as string[]
  );

  const toggleHidden = useMutation({
    mutationFn: async (badgeId: string) => {
      const { doc, setDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await setDoc(
        doc(db, "users", user!.uid, "bag", "profile"),
        { hiddenAutoBadges: hidden.has(badgeId) ? arrayRemove(badgeId) : arrayUnion(badgeId) },
        { merge: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-profile", user?.uid] }),
  });

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
        {earned.map((badge) => {
          const isHidden = hidden.has(badge.id);
          return (
            <BadgePill
              key={badge.id}
              label={badge.name}
              background={badge.background}
              title={
                isHidden
                  ? "Hidden from public view. Click to show"
                  : "Click to hide from public view"
              }
              onClick={() => toggleHidden.mutate(badge.id)}
              style={{
                cursor: "pointer",
                opacity: isHidden ? 0.4 : 1,
                filter: isHidden ? "grayscale(0.6)" : undefined,
                textDecoration: isHidden ? "line-through" : undefined,
              }}
            />
          );
        })}
      </Flex>
      <Text c="rgba(255, 255, 255, 0.50)" fz={12}>
        Click a badge to hide it from your public profile (or show it again).
      </Text>
    </Stack>
  );
}

function Badges() {
  const { user } = useAuth();
  const { data, isPending: isLoading, isError } = useGetBadgesQuery();
  const { data: catalog } = useQuery({ queryKey: ["badge-catalog"], queryFn: getBadgeCatalog });
  const toggleMutation = useToggleBadgeMutation();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { formattedData } = data;

  // Consolidate against the catalog: use each badge's canonical background (so
  // "Admin" isn't two different colors), and drop badges the user already
  // earns automatically (shown separately) so they don't appear twice.
  const info = (user?.otherinfo ?? {}) as {
    permissions?: string;
    capabilities?: string[];
    isGaia?: string;
  };
  const cat = catalog ?? [];
  const autoNames = new Set(
    cat.filter((b) => autoBadgeIdsFor(info).includes(b.id)).map((b) => b.name.toLowerCase())
  );
  const badges = formattedData
    .filter((b) => !autoNames.has(b.label.toLowerCase()))
    .map((b) => {
      const match = cat.find((c) => c.name.toLowerCase() === b.label.toLowerCase());
      return match ? { ...b, background: match.background } : b;
    });

  const toggle = (badge: Badge) =>
    toggleMutation
      .mutateAsync({ label: badge.label, enabled: !badge.enabled })
      .catch(() => undefined);

  return (
    <Stack gap={8}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        {badges.length ? (
          <>
            <BadgesSectionWrapper
              title="Badges Enabled"
              secondaryText="Max: 5. Click a badge to move it"
              badges={badges}
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
              badges={badges}
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
  // No per-user obtain data yet, so show today as a temporary placeholder until
  // the "how you earn emojis" flow ships with Activities.
  const obtainedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
              if (!emoji) return null;
              return (
                <HoverCard
                  key={emojiId}
                  width={260}
                  position="top"
                  withArrow
                  shadow="md"
                  openDelay={80}
                >
                  <HoverCard.Target>
                    <Flex
                      w={50}
                      h={50}
                      justify="center"
                      align="center"
                      bg="#3C3A3C"
                      sx={{
                        borderRadius: "100%",
                        flexShrink: 0,
                        border: "3px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Image
                        width={30}
                        height={30}
                        sx={{ objectFit: "cover" }}
                        src={getEmoteImageURL(emoji.Filename)}
                        alt={emoji.Name}
                      />
                    </Flex>
                  </HoverCard.Target>
                  <HoverCard.Dropdown
                    bg="#1E1D20"
                    sx={{ borderRadius: 22, border: "none", color: "white" }}
                    p={16}
                  >
                    <Stack gap={8}>
                      <Group gap={10} wrap="nowrap">
                        <Flex
                          w={48}
                          h={48}
                          justify="center"
                          align="center"
                          bg="#3C3A3C"
                          sx={{ borderRadius: "100%", flexShrink: 0 }}
                        >
                          <Image
                            width={30}
                            height={30}
                            src={getEmoteImageURL(emoji.Filename)}
                            alt={emoji.Name}
                          />
                        </Flex>
                        <Title order={4} size={16} fw={600}>
                          {emoji.Name}
                        </Title>
                      </Group>
                      <Stack gap={2}>
                        <Text fz={12}>
                          <b>Created:</b> {emoji.Description || "Snagem"}
                        </Text>
                        <Text fz={12}>
                          <b>Obtained from:</b> Manually assigned
                        </Text>
                        <Text fz={12}>
                          <b>Date obtained:</b> {obtainedDate}
                        </Text>
                      </Stack>
                    </Stack>
                  </HoverCard.Dropdown>
                </HoverCard>
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
                        <Image src={CheckCircleIcon} alt="Check circle icon" w={22} h={22} fit="contain" />
                      ) : (
                        <Image src={CrossCircleIcon} alt="Cross circle icon" w={22} h={22} fit="contain" />
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
                <BadgePill
                  label={badge.name}
                  background={badge.background}
                  style={{ cursor: "pointer" }}
                />
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
                        <Image src={CheckCircleIcon} alt="Check circle icon" w={22} h={22} fit="contain" />
                      </>
                    ) : (
                      <>
                        <Text fz={14} fw={500} c="#E35C65">
                          You don&apos;t have this badge
                        </Text>
                        <Image src={CrossCircleIcon} alt="Cross circle icon" w={22} h={22} fit="contain" />
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
          <Badges />
          <AutoBadges />
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
