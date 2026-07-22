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
      radius={0}
      className="dc-card"
      component={Link}
      to={`/Forum/${threadLocation}/thread/${threadID}/last`}
      style={{ textDecoration: "none", position: "relative", overflow: "hidden" }}
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
            <Text c="white" fz={16}>
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
      <Flex align="stretch">
        {/* pr clears the absolute trash icon so the title never runs under it. */}
        <Stack gap={8} py={20} px={22} pr={44} sx={{ flex: 1, minWidth: 0 }}>
          <Text c="white" fw={700} fz={16} lineClamp={2} style={{ lineHeight: 1.35 }}>
            {title}
          </Text>
          <Text fz={14} c="#b6b1bc">
            Latest post by {latestPostBy ?? "N/A"} ·{" "}
            {formatter.format(new Date((latestPostAt?.seconds ?? date?.seconds ?? 0) * 1000))}
          </Text>
        </Stack>
        {isOverXs && (
          <Flex
            justify="center"
            align="center"
            w={78}
            sx={{ flexShrink: 0 }}
            bg={color}
          >
            <Avatar
              size={44}
              alt={`${title} thread avatar`}
              sx={{ objectFit: "cover", borderRadius: "100%", border: "2px solid rgba(255,255,255,0.5)" }}
              src={DefaultCharacterAvatarSrc}
            />
          </Flex>
        )}
      </Flex>
    </Paper>
  );
}
