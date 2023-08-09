import { Badge, Flex, Group, Image, Popover, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { ArrowSwapIcon, CheckCircleIcon } from "../../../../icons";
import { getBadges, getEmojis } from "../../../../queries/settings";
import Emoji1Src from "/src/assets/emojis/emoji-1.png";
import Emoji2Src from "/src/assets/emojis/emoji-2.png";
import Emoji3Src from "/src/assets/emojis/emoji-3.png";

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
    <Stack spacing={12}>
      <Group align="center">
        <Title size={24} color="white" weight={400} order={3}>
          {title}
        </Title>
        {secondaryText && (
          <Text color="rgba(255, 255, 255, 0.50)" size={16} weight={400}>
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
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-badges"],
    queryFn: async () => getBadges(user?.uid as string),
  });
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { formattedData } = data;
  return (
    <Flex justify="space-between" align="center">
      <BadgesSectionWrapper title="Badges Enabled" secondaryText="Max: 5" badges={formattedData} />
      <Image src={ArrowSwapIcon} alt="Arrow swap icon" width={24} />
      <BadgesSectionWrapper
        title="Badges Disabled"
        badges={formattedData}
        showEnabledOnly={false}
      />
    </Flex>
  );
}

function Emojis() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-emojis"],
    queryFn: async () => getEmojis(user?.uid as string),
  });
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const emojis = data;
  return (
    <SimpleSectionWrapper>
      <Stack spacing={18}>
        <Title size={24} color="white" weight={400} order={3}>
          Your Emoji Collection
        </Title>
        <Flex wrap="wrap">
          {emojis.map((emojiUrl: string) => (
            <div key={emojiUrl}>
              <Image width={30} sx={{ objectFit: "cover" }} src={emojiUrl} alt={emojiUrl} />
            </div>
          ))}
        </Flex>
      </Stack>
    </SimpleSectionWrapper>
  );
}

interface EmojiItem {
  Name: string;
  Description: string;
  imageSrc: string;
  Timeline: string;
  GemCost: number;
  CoinCost: number;
}

const emojiData: EmojiItem[] = [
  {
    Name: "Happy Espeon",
    Description: "Commissioned from Seviyummy in 2022.",
    imageSrc: Emoji1Src,
    Timeline: new Date().toISOString(),
    GemCost: 1,
    CoinCost: 50,
  },
  {
    Name: "Happy Espeon",
    Description: "Commissioned from Seviyummy in 2022.",
    imageSrc: Emoji2Src,
    Timeline: new Date().toISOString(),
    GemCost: 1,
    CoinCost: 50,
  },
  {
    Name: "Zoroark's Laugh",
    Description: "Commissioned from Seviyummy in 2022.",
    Timeline: new Date().toISOString(),
    GemCost: 1,
    CoinCost: 50,
    imageSrc: Emoji3Src,
  },
];

function EmojiCollection() {
  return (
    <Stack spacing={18}>
      <Title size={24} color="white" weight={400} order={3}>
        Collection of All Emojis
      </Title>
      <Flex wrap="wrap" gap={8}>
        {emojiData.map((emoji, index) => (
          <Flex
            justify="center"
            align="center"
            key={index}
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
            <Image src={emoji.imageSrc} alt={emoji.Name} width={30} height={30} />
          </Flex>
        ))}
      </Flex>
    </Stack>
  );
}

interface BadgeItem {
  name: string;
  background: string;
  description: string;
}

const badgeData: BadgeItem[] = [
  {
    name: "Legacy",
    description: "“New User” Badges is enabled to anyone with less than 100 posts.",
    background: "linear-gradient(90deg, #772976 0%, #464C9A 100%);",
  },
  {
    name: "Admin",
    description: "“Admin” Badges is enabled to anyone with less than 100 posts.",
    background: "linear-gradient(90deg, #E54156 0%, #F59135 100%);",
  },
  {
    name: "New User",
    description: "“New User” Badges is enabled to anyone with less than 100 posts.",
    background: "linear-gradient(90deg, #464C9A 0%, #469A95 100%);",
  },
];

function BadgesCollection() {
  return (
    <Stack spacing={18}>
      <Stack spacing={0}>
        <Title size={24} color="white" weight={400} order={3}>
          Collection of All Badges
        </Title>
        <Text>Here&apos;s a list of all badges and how to obtain them.</Text>
      </Stack>
      <Flex wrap="wrap" gap={8}>
        {badgeData.map((badge, index) => (
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
                <Text size={14} weight={500}>
                  {badge.description}
                </Text>
                <Flex justify="space-between" align="center">
                  <Text size={14} weight={500} color="#22B573">
                    You have this badge
                  </Text>
                  <Image src={CheckCircleIcon} alt="Check circle icon" width={20} />
                </Flex>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        ))}
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
