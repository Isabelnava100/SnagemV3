import {
  ActionIcon,
  Avatar,
  Button,
  Flex,
  Group,
  Paper,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { Bookmark } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { removeBookmark } from "../../forum/mutations";
import { getBookmarks } from "../../../queries/dashboard";
import formatter from "../../../utils/date";
import DefaultCharacterAvatarSrc from "/src/assets/images/character-default.jpg";

export default function Bookmarks() {
  const { user } = useAuth();
  const { isPending: isLoading, data, isError } = useQuery({
    queryKey: ["get-bookmarks", user?.uid],
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
  const { title, date, color, threadLocation, threadID, latestPostBy, latestPostAt } = props;
  const { isOverXs } = useMediaQuery();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [confirmOpened, setConfirmOpened] = React.useState(false);

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await removeBookmark(user, threadLocation, threadID);
    },
    onSuccess: () => {
      setConfirmOpened(false);
      queryClient.invalidateQueries({ queryKey: ["get-bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["forum-bookmarks"] });
    },
  });

  return (
    <Paper
      radius={15}
      bg="rgba(62, 61, 61, 0.65)"
      component={Link}
      to={`/Forum/${threadLocation}/thread/${threadID}/last`}
      style={{ textDecoration: "none", position: "relative" }}
    >
      {/* Delete with a confirmation step, in a popover anchored to the trash. */}
      <Popover
        opened={confirmOpened}
        onChange={setConfirmOpened}
        position="bottom-end"
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <ActionIcon
            color="red"
            variant="filled"
            title="Remove bookmark"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpened((o) => !o);
            }}
            style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          bg="#1E1D20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Stack gap={8}>
            <Text c="white" fz={14}>
              Remove this bookmark?
            </Text>
            <Group gap={8} justify="flex-end">
              <Button size="xs" color="gray" variant="light" onClick={() => setConfirmOpened(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="red"
                loading={removeMutation.isPending}
                onClick={() => removeMutation.mutateAsync()}
              >
                Remove
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <Flex gap={15} pl="md" align="stretch">
        <BookmarkIcon color={color} />
        {/* pr clears the absolute trash icon so the title never runs under it. */}
        <Stack py="md" pr={44} sx={{ flex: 1 }}>
          <Title c="white" order={4} lineClamp={2}>
            {title}
          </Title>
          <Stack gap={3}>
            <Text>Latest post by: {latestPostBy ?? "—"}</Text>
            <Text size="xs" color="dimmed">
              {formatter.format(new Date((latestPostAt?.seconds ?? date.seconds) * 1000))}
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
