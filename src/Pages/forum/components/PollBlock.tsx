import { Badge, Box, Group, Radio, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { GradientButtonSecondary } from "../../../components/common/GradientButton";
import { useAuth } from "../../../context/AuthContext";
import { votePoll } from "../mutations";
import { ThreadPoll } from "../types";

/** Poll block at the top of a thread: one vote per user, counts always visible. */
export default function PollBlock(props: {
  poll: ThreadPoll;
  forum: string;
  threadId: string;
}) {
  const { poll, forum, threadId } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const myVote = user ? poll.votes?.[user.uid] : undefined;
  const [selected, setSelected] = React.useState<string | undefined>(myVote);

  const counts = React.useMemo(() => {
    const byOption: Record<string, number> = {};
    Object.values(poll.votes ?? {}).forEach((optionId) => {
      byOption[optionId] = (byOption[optionId] ?? 0) + 1;
    });
    return byOption;
  }, [poll.votes]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user) return;
      await votePoll(forum, threadId, optionId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] }),
  });

  return (
    <Box p={14} bg="#3C3A3C" style={{ borderRadius: 10 }} mb={12}>
      <Text fw={600} c="white" fz={15} mb={10}>
        Poll: {poll.question}
      </Text>
      <Radio.Group value={selected} onChange={setSelected}>
        <Stack gap={6}>
          {poll.options.map((option) => (
            <Group key={option.id} gap={8}>
              <Radio
                value={option.id}
                label={option.text}
                color="pink.0"
                disabled={!user}
              />
              <Text fz={12} c="dimmed">
                {counts[option.id] ?? 0} vote{(counts[option.id] ?? 0) === 1 ? "" : "s"}
              </Text>
              {myVote === option.id && (
                <Badge size="xs" variant="light" color="green.0">
                  You voted for this option
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      </Radio.Group>
      {user && (
        <GradientButtonSecondary
          mt={12}
          radius="xl"
          size="xs"
          loading={isPending}
          disabled={!selected || selected === myVote}
          onClick={() => selected && mutateAsync(selected)}
        >
          Submit Answer
        </GradientButtonSecondary>
      )}
    </Box>
  );
}
