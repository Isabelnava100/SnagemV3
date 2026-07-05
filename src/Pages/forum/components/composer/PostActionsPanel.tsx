import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconMinus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { DICE_TYPES } from "../../config";
import { callRollDice, callRollRandom, callableMessage } from "../../functionsClient";
import { DiceBlock, RandomBlock, ThreadPoll } from "../../types";
import { ForumPanel, GameResultText } from "../ui";

function describeDice(d: DiceBlock): string {
  return d.count === 1
    ? `A D${d.sides} has been rolled... the result is ${d.results[0]}!`
    : `${d.count} D${d.sides} have been rolled... the results are ${d.results.join(", ")}!`;
}

/**
 * Post Actions panel for the post composer: Roll Dice + Random Number.
 * Rolls happen SERVER-SIDE (Cloud Function) and bind to your next post in the
 * thread. They lock immediately, publish with the post and can never be
 * re-rolled, even by abandoning the draft (board 19/20/21).
 */
export function PostActionsPanel(props: {
  forum: string;
  threadId: string;
  dice: DiceBlock | null;
  onDice: (d: DiceBlock) => void;
  random: RandomBlock | null;
  onRandom: (r: RandomBlock) => void;
  /** Already-published blocks (edit mode) rendered as locked lines. */
  lockedDice?: DiceBlock[];
  lockedRandoms?: RandomBlock[];
}) {
  const [diceOn, setDiceOn] = React.useState(false);
  const [sides, setSides] = React.useState<string | null>(null);
  const [count, setCount] = React.useState<number>(1);
  const [randomOn, setRandomOn] = React.useState(false);
  const [low, setLow] = React.useState<number>(1);
  const [high, setHigh] = React.useState<number>(100);
  const [rollError, setRollError] = React.useState("");

  const diceMutation = useMutation({
    mutationFn: () => callRollDice(props.forum, props.threadId, Number(sides), count),
    onSuccess: (result) => props.onDice(result),
    onError: (err) => setRollError(callableMessage(err, "The dice roll failed. Try again.")),
  });

  const randomMutation = useMutation({
    mutationFn: () =>
      callRollRandom(props.forum, props.threadId, Math.min(low, high), Math.max(low, high)),
    onSuccess: (result) => props.onRandom(result),
    onError: (err) => setRollError(callableMessage(err, "The roll failed. Try again.")),
  });

  const rollDice = () => {
    if (!sides || count < 1) return;
    setRollError("");
    diceMutation.mutateAsync().catch(() => undefined);
  };

  const rollRandom = () => {
    setRollError("");
    randomMutation.mutateAsync().catch(() => undefined);
  };

  return (
    <ForumPanel title="Post Actions" mt={16}>
      <Stack gap={12}>
        {(props.lockedDice ?? []).map((d, i) => (
          <GameResultText key={`ld${i}`}>{describeDice(d)}</GameResultText>
        ))}
        {(props.lockedRandoms ?? []).map((r, i) => (
          <GameResultText key={`lr${i}`}>
            A random number between {r.min} and {r.max} was generated... the result is {r.result}!
          </GameResultText>
        ))}

        {/* Roll dice, locked as soon as it's rolled */}
        {props.dice ? (
          <GameResultText>{describeDice(props.dice)}</GameResultText>
        ) : (
          <Stack gap={6}>
            <Checkbox
              label="Roll Dice"
              color="green.0"
              checked={diceOn}
              // Once a roll is submitted it locks in, so it can't be unchecked.
              disabled={diceMutation.isPending || diceMutation.isSuccess}
              onChange={(e) => setDiceOn(e.currentTarget.checked)}
              styles={{ label: { color: "white", fontSize: 14 } }}
            />
            <Text fz={11} c="dimmed" pl={30}>
              Once rolled, it will be published with your post and it cannot be re-rolled or
              changed.
            </Text>
            {diceOn && (
              <Group gap={8} pl={30} wrap="wrap">
                <Select
                  placeholder="Select Dice"
                  data={DICE_TYPES.map((d) => ({ value: String(d), label: `D${d}` }))}
                  value={sides}
                  onChange={setSides}
                  w={110}
                  size="xs"
                  styles={{ input: { background: "#2E2D2E" } }}
                />
                <Group gap={4}>
                  <Text fz={12} c="white">
                    Number of Dice:
                  </Text>
                  <NumberInput
                    value={count}
                    onChange={(v) => setCount(Math.max(1, Number(v) || 1))}
                    min={1}
                    max={20}
                    w={64}
                    size="xs"
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Group>
                <Button
                  size="xs"
                  radius="xl"
                  color="cyan.0"
                  disabled={!sides}
                  loading={diceMutation.isPending}
                  onClick={rollDice}
                >
                  Roll
                </Button>
              </Group>
            )}
          </Stack>
        )}

        {/* Random number, locked as soon as it's generated */}
        {props.random ? (
          <GameResultText>
            A random number between {props.random.min} and {props.random.max} was generated...
            the result is {props.random.result}!
          </GameResultText>
        ) : (
          <Stack gap={6}>
            <Checkbox
              label="Random Number"
              color="green.0"
              checked={randomOn}
              // Once generated it locks in, so it can't be unchecked.
              disabled={randomMutation.isPending || randomMutation.isSuccess}
              onChange={(e) => setRandomOn(e.currentTarget.checked)}
              styles={{ label: { color: "white", fontSize: 14 } }}
            />
            <Text fz={11} c="dimmed" pl={30}>
              Generate a random number from lowest to highest.
            </Text>
            {randomOn && (
              <Group gap={8} pl={30} wrap="wrap">
                <Group gap={4}>
                  <Text fz={12} c="white">
                    Lowest:
                  </Text>
                  <NumberInput
                    value={low}
                    onChange={(v) => setLow(Number(v) || 0)}
                    w={70}
                    size="xs"
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Group>
                <Group gap={4}>
                  <Text fz={12} c="white">
                    Highest:
                  </Text>
                  <NumberInput
                    value={high}
                    onChange={(v) => setHigh(Number(v) || 0)}
                    w={70}
                    size="xs"
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Group>
                <Button
                  size="xs"
                  radius="xl"
                  color="cyan.0"
                  loading={randomMutation.isPending}
                  onClick={rollRandom}
                >
                  Roll
                </Button>
              </Group>
            )}
          </Stack>
        )}

        {rollError && <GameResultText>{rollError}</GameResultText>}
      </Stack>
    </ForumPanel>
  );
}

/** Poll builder for the new-thread composer (question + removable options). */
export function PollBuilderPanel(props: {
  value: ThreadPoll | null;
  onChange: (poll: ThreadPoll | null) => void;
}) {
  const { value, onChange } = props;
  const enabled = value !== null;

  const toggle = (checked: boolean) => {
    onChange(
      checked
        ? {
            question: "",
            options: [
              { id: uuid(), text: "" },
              { id: uuid(), text: "" },
            ],
            votes: {},
          }
        : null
    );
  };

  return (
    <ForumPanel title="Post Actions" mt={16}>
      <Checkbox
        label="Poll"
        color="green.0"
        checked={enabled}
        onChange={(e) => toggle(e.currentTarget.checked)}
        styles={{ label: { color: "white", fontSize: 14 } }}
      />
      <Text fz={11} c="dimmed" pl={30}>
        Create a poll for people to vote in.
      </Text>
      {enabled && value && (
        <Stack gap={8} mt={10}>
          <TextInput
            placeholder="Write your question in this field."
            value={value.question}
            onChange={(e) => onChange({ ...value, question: e.currentTarget.value })}
            size="xs"
            styles={{ input: { background: "#2E2D2E" } }}
          />
          {value.options.map((option) => (
            <Group key={option.id} gap={6} wrap="nowrap">
              <ActionIcon
                size="sm"
                radius="xl"
                color="pink.0"
                variant="filled"
                disabled={value.options.length <= 2}
                onClick={() =>
                  onChange({
                    ...value,
                    options: value.options.filter((o) => o.id !== option.id),
                  })
                }
              >
                <IconMinus size={12} />
              </ActionIcon>
              <TextInput
                placeholder="Write an option."
                value={option.text}
                onChange={(e) =>
                  onChange({
                    ...value,
                    options: value.options.map((o) =>
                      o.id === option.id ? { ...o, text: e.currentTarget.value } : o
                    ),
                  })
                }
                size="xs"
                w="100%"
                styles={{ input: { background: "#2E2D2E" } }}
              />
            </Group>
          ))}
          <Group justify="flex-end">
            <GradientButtonSecondary
              size="xs"
              radius="xl"
              onClick={() =>
                onChange({ ...value, options: [...value.options, { id: uuid(), text: "" }] })
              }
            >
              Add an Answer
            </GradientButtonSecondary>
          </Group>
        </Stack>
      )}
    </ForumPanel>
  );
}
