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
import { toastError } from "../../../lib/toast";
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
  if (isError)
    return (
      <EmptyMessage
        title="Could not load bookmarks"
        description="Something went wrong loading your bookmarks. Refresh to try again."
      />
    );

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
    <SimpleGrid spacing={16} cols={isOverLg ? 2 : 1}>
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
    onError: (e) => toastError(e, "Could not remove that bookmark."),
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
          {/* Mockup remove button: small dark square over the top-right of the
              card, trash glyph kept from the original build. */}
          <ActionIcon
            variant="filled"
            title="Remove bookmark"
            aria-label="Remove bookmark"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpened((o) => !o);
            }}
            style={{
              position: "absolute",
              top: isOverXs ? 8 : 6,
              right: isOverXs ? 8 : 6,
              zIndex: 2,
              width: isOverXs ? 28 : 24,
              height: isOverXs ? 28 : 24,
              minWidth: isOverXs ? 28 : 24,
              minHeight: isOverXs ? 28 : 24,
              padding: 0,
              background: "rgba(10,9,13,0.65)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 0,
              color: "#fff",
            }}
          >
            <IconTrash size={14} />
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
        {/* Colored avatar strip on the right (78px desktop, 60px on phones). */}
        <Flex
          justify="center"
          align="center"
          w={isOverXs ? 78 : 60}
          sx={{ flexShrink: 0 }}
          bg={color}
        >
          <Avatar
            size={isOverXs ? 44 : 38}
            alt={`${title} thread avatar`}
            sx={{ objectFit: "cover", borderRadius: "100%", border: "2px solid rgba(255,255,255,0.5)" }}
            src={DefaultCharacterAvatarSrc}
          />
        </Flex>
      </Flex>
    </Paper>
  );
}
