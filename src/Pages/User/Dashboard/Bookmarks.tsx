import { Avatar, Flex, Image, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { BookmarkSymbol } from "../../../icons";

export default function Bookmarks() {
  const { user } = useAuth();
  const { isOverLg } = useMediaQuery();
  return (
    <SimpleGrid cols={isOverLg ? 2 : 1}>
      <SingleBookmark
        title="Title of Thread goes Here for test"
        displayUsername={user?.displayName as string}
        time="May 18 at 15:55"
      />
      <SingleBookmark
        title="Title of Thread goes Here for test"
        displayUsername={user?.displayName as string}
        time="May 18 at 15:55"
      />
    </SimpleGrid>
  );
}

function SingleBookmark(props: {
  title: string;
  displayUsername: string;
  time: string;
  userAvatar?: string;
}) {
  const { title, displayUsername, time, userAvatar } = props;
  const { isOverSm } = useMediaQuery();
  return (
    <Paper radius={15} bg="rgba(62, 61, 61, 0.65)">
      <Flex gap={15} align="stretch">
        <Image width={isOverSm ? 65 : 50} src={BookmarkSymbol} alt="Bookmark" />
        <Stack py="md" sx={{ flex: 1 }}>
          <Title order={4} lineClamp={1}>
            {title}
          </Title>
          <Stack spacing={3}>
            <Text>Latest post by: {displayUsername}</Text>
            <Text>{time}</Text>
          </Stack>
        </Stack>
        <Flex justify="center" align="center" px="xl">
          <Avatar w={isOverSm ? 100 : 50} />
        </Flex>
      </Flex>
    </Paper>
  );
}
