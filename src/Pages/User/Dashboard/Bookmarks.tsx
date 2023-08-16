import { Avatar, Flex, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { Bookmark } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getBookmarks } from "../../../queries/dashboard";
import formatter from "../../../utils/date";
import DefaultCharacterAvatarSrc from "/src/assets/images/character-default.jpg";

export default function Bookmarks() {
  const { user } = useAuth();
  const { isLoading, data, isError, error } = useQuery({
    queryKey: ["get-bookmarks"],
    queryFn: () => getBookmarks(user?.uid as string),
    enabled: !!user,
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { sortedData } = data;

  if (sortedData.length === 0)
    return (
      <EmptyMessage
        description={
          <Text>
            You currently have no bookmarks!
            <br />
            Go to any thread in the <Link to="/Forum/Main-Forum">Forums</Link> and mark it as
            bookmarked to see it appear in this section.
            <br />
            You can also edit your settings to receive notifications your liking.
          </Text>
        }
      />
    );

  return (
    <SimpleGrid spacing={25} cols={isOverLg ? 2 : 1}>
      {sortedData.map((bookmark) => (
        <SingleBookmark key={bookmark.id} {...bookmark} />
      ))}
    </SimpleGrid>
  );
}

function BookmarkIcon(props: { color: string }) {
  const { color } = props;
  const { isOverXs } = useMediaQuery();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="63"
      height="126"
      viewBox="0 0 63 126"
      fill="none"
      style={{
        marginTop: isOverXs ? -10 : 0,
      }}
    >
      <path
        id="Rectangle 179"
        d="M0 8C0 3.58172 3.58172 0 8 0H55C59.4183 0 63 3.58172 63 8V121.606C63 124.033 61.0327 126 58.606 126V126C57.1721 126 55.834 125.308 55.0034 124.14C50.3497 117.591 34.7754 96 31.7386 96C28.723 96 13.3435 117.292 8.57249 124.001C7.68216 125.253 6.24415 126 4.7079 126V126C2.1078 126 0 123.892 0 121.292V8Z"
        fill={color}
      />
    </svg>
  );
}

function SingleBookmark(props: Bookmark) {
  const { title, date, color } = props;
  const { isOverXs } = useMediaQuery();
  const { user } = useAuth();
  return (
    <Paper radius={15} bg="rgba(62, 61, 61, 0.65)">
      <Flex gap={15} pl="md" align="stretch">
        <BookmarkIcon color={color} />
        <Stack py="md" sx={{ flex: 1 }}>
          <Title color="white" order={4} lineClamp={1}>
            {title}
          </Title>
          <Stack spacing={3}>
            <Text>Latest post by: {user?.displayName}</Text>
            <Text size="xs" color="dimmed">
              {formatter.format(new Date(date.seconds))}
            </Text>
          </Stack>
        </Stack>
        {isOverXs && (
          <Flex
            justify="center"
            align="center"
            pl={50}
            pr={30}
            sx={{ borderTopLeftRadius: 100, borderTopRightRadius: 15, borderBottomRightRadius: 15 }}
            bg={color}
          >
            <Avatar
              size="xl"
              sx={{ objectFit: "cover", borderRadius: "100%" }}
              src={DefaultCharacterAvatarSrc}
            />
          </Flex>
        )}
      </Flex>
    </Paper>
  );
}
