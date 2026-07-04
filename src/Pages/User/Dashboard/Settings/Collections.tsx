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
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { badgeData } from "../../../../data/badge";
import { emojiData, getEmoteImageURL } from "../../../../data/emote";
import { ArrowSwapIcon, CheckCircleIcon, CrossCircleIcon } from "../../../../icons";
import { getBadges, getEmojis } from "../../../../queries/settings";

function useGetBadgesQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["get-badges"],
    queryFn: async () => getBadges(user?.uid as string),
  });
}

function useGetEmojisQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["get-emojis"],
    queryFn: async () => getEmojis(user?.uid as string),
  });
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
}) {
  const { title, secondaryText, badges, showEnabledOnly = true } = props;
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
      <Flex gap={17}>
        {displayedBadges.map((badge) => (
          <Badge
            key={badge.label}
            bg={badge.background}
            sx={{ color: "white", textTransform: "none", fontWeight: 400, fontSize: 16 }}
            size="lg"
          >
            {badge.label}
          </Badge>
        ))}
      </Flex>
    </Stack>
  );
}

function Badges() {
  const { data, isPending: isLoading, isError } = useGetBadgesQuery();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { formattedData } = data;
  return (
    <Flex justify="space-between" align="center">
      {formattedData.length ? (
        <>
          <BadgesSectionWrapper
            title="Badges Enabled"
            secondaryText="Max: 5"
            badges={formattedData}
          />
          <Image src={ArrowSwapIcon} alt="Arrow swap icon" width={24} />
          <BadgesSectionWrapper
            title="Badges Disabled"
            badges={formattedData}
            showEnabledOnly={false}
          />
        </>
      ) : (
        <EmptyMessage title="No badges" description="You currently have no badges" />
      )}
    </Flex>
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
      <Flex wrap="wrap" gap={8}>
        {badgeData.map((badge, index) => {
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
        <Badges />
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
