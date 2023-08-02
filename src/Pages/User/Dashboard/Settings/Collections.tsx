import { Badge, Flex, Group, Image, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { ArrowSwapIcon } from "../../../../icons";
import { getBadges, getEmojis } from "../../../../queries/settings";

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
      <Title size={24} color="white" weight={400} order={3}>
        Your Emoji Collection
      </Title>
      <Flex wrap="wrap">
        {emojis.map((emojiUrl: string) => (
          <div key={emojiUrl}>
            <Image w={30} h={30} sx={{ objectFit: "cover" }} src={emojiUrl} alt={emojiUrl} />
          </div>
        ))}
      </Flex>
    </SimpleSectionWrapper>
  );
}

function Collection() {
  return (
    <SimpleSectionWrapper>
      <Stack>
        <h1>Collection of emojis</h1>
        <h1>Collection of badges</h1>
      </Stack>
    </SimpleSectionWrapper>
  );
}

export default function Collections() {
  return (
    <Stack w="100%">
      <SimpleSectionWrapper>
        <Badges />
      </SimpleSectionWrapper>
      <Emojis />
      <Collection />
    </Stack>
  );
}
