import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import {
  buyLottoTicket,
  CasinoGame,
  exchangeTokens,
  getCasinoConfig,
  getLottoState,
  getMyCasino,
  playGame,
} from "../../queries/casino";
import { getCurrencies } from "../../queries/dashboard";

/**
 * Darts' Ghastly Gambling. Players trade Snag Coins (pokecoin) for Gengar Tokens
 * (gengarcoin) at a server-set rate, then wager tokens on instant games. Every
 * outcome, balance check, and payout is decided server-side by Cloud Functions:
 * the client only shows results. See docs/CASINO_DATA.md.
 */

const DEFAULT_RATE = 2;

/** Pull a numeric balance out of the string-valued Currencies doc. */
function num(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function CurrencyChip(props: { label: string; value: number }) {
  return (
    <Badge variant="light" color="grape" size="lg" radius="sm">
      {props.value.toLocaleString()} {props.label}
    </Badge>
  );
}

/** A single line that announces an action result to screen readers. */
function StatusLine(props: { color?: string; children: React.ReactNode }) {
  if (!props.children) return null;
  return (
    <Text role="status" aria-live="polite" fz={13} c={props.color}>
      {props.children}
    </Text>
  );
}

function ExchangeCard(props: { uid: string }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState<number>(1);

  const config = useQuery({ queryKey: ["casino-config"], queryFn: getCasinoConfig });
  const rate = config.data?.exchangeRate ?? DEFAULT_RATE;

  const [status, setStatus] = React.useState<{ color: string; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => exchangeTokens(direction, amount),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      setStatus({
        color: "teal",
        text:
          direction === "buy"
            ? `Bought ${amount} Gengar Tokens. Balance: ${res.gengarcoin} Tokens.`
            : `Sold ${amount} Gengar Tokens. Balance: ${res.pokecoin} Snag Coins.`,
      });
    },
    onError: (err: unknown) => {
      setStatus({ color: "red", text: err instanceof Error ? err.message : "Exchange failed." });
    },
  });

  const safeAmount = amount >= 1 ? amount : 1;
  const line =
    direction === "buy"
      ? `Buy: costs ${safeAmount * rate} Snag Coins`
      : `Sell: returns ${safeAmount} Snag Coins`;

  const disabled = mutation.isPending || safeAmount < 1;

  return (
    <Card bg="#241a2e" radius="md" p={16} withBorder>
      <Stack gap={12}>
        <Group justify="space-between" wrap="wrap" gap={8}>
          <Text fz={16} c="white" fw={600}>
            Exchange
          </Text>
          <Text fz={12} c="dimmed">
            Rate: {rate} Snag Coins = 1 Gengar Token
          </Text>
        </Group>

        <SegmentedControl
          value={direction}
          onChange={(v) => setDirection(v as "buy" | "sell")}
          data={[
            { label: "Buy", value: "buy" },
            { label: "Sell", value: "sell" },
          ]}
          aria-label="Exchange direction"
        />

        <NumberInput
          label="Tokens"
          value={amount}
          onChange={(v) => setAmount(typeof v === "number" ? v : 1)}
          min={1}
          allowNegative={false}
          maw={200}
          w="100%"
        />

        <Text fz={13} c="dimmed">
          {line}
        </Text>

        <Button
          color="grape"
          onClick={() => {
            setStatus(null);
            mutation.mutate();
          }}
          loading={mutation.isPending}
          disabled={disabled}
          maw={200}
          w="100%"
        >
          Exchange
        </Button>

        {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
      </Stack>
    </Card>
  );
}

/** Shared shell so every game card looks the same. */
function GameCard(props: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <Card bg="#1f1a26" radius="md" p={16} withBorder>
      <Stack gap={10}>
        <Text fz={16} c="white" fw={600}>
          {props.title}
        </Text>
        <Text fz={12} c="dimmed">
          {props.blurb}
        </Text>
        {props.children}
      </Stack>
    </Card>
  );
}

/** Hook that wires a playGame call into a mutation plus a status line. */
function useGamePlay(uid: string, format: (res: {
  win: boolean;
  roll: number | number[];
  payout: number;
}) => string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<{ color: string; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { game: CasinoGame; bet: number; pick: number | "even" | "odd" }) =>
      playGame(vars.game, vars.bet, vars.pick),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["currencies", uid] });
      setStatus({ color: res.win ? "teal" : "red", text: format(res) });
    },
    onError: (err: unknown) => {
      setStatus({ color: "red", text: err instanceof Error ? err.message : "The play failed." });
    },
  });

  return { mutation, status, setStatus };
}

function HexRoulette(props: { uid: string; tokens: number }) {
  const [number, setNumber] = React.useState<number>(1);
  const [bet, setBet] = React.useState<number>(1);
  const { mutation, status, setStatus } = useGamePlay(props.uid, (res) =>
    res.win
      ? `The ball landed on ${res.roll}. You win ${res.payout} Gengar Tokens.`
      : `The ball landed on ${res.roll}. No luck this spin.`
  );

  const disabled = mutation.isPending || props.tokens < bet;

  return (
    <GameCard title="Hex Roulette" blurb="Pick a number 1 to 36 and bet up to 5 tokens.">
      <Group gap={10} wrap="wrap">
        <NumberInput
          label="Number 1-36"
          value={number}
          onChange={(v) => setNumber(typeof v === "number" ? v : 1)}
          min={1}
          max={36}
          allowNegative={false}
          w={130}
        />
        <NumberInput
          label="Bet 1-5"
          value={bet}
          onChange={(v) => setBet(typeof v === "number" ? v : 1)}
          min={1}
          max={5}
          allowNegative={false}
          w={110}
        />
      </Group>
      <Button
        color="grape"
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "hexRoulette", bet, pick: number });
        }}
        loading={mutation.isPending}
        disabled={disabled}
        maw={160}
        w="100%"
      >
        Spin
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed">
          You need {bet} Gengar Tokens to play this bet.
        </Text>
      )}
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </GameCard>
  );
}

function DreamDice(props: { uid: string; tokens: number }) {
  const [total, setTotal] = React.useState<number>(7);
  const [bet, setBet] = React.useState<number>(1);
  const { mutation, status, setStatus } = useGamePlay(props.uid, (res) => {
    const dice = Array.isArray(res.roll) ? res.roll.join(" and ") : String(res.roll);
    return res.win
      ? `You rolled ${dice}. You win ${res.payout} Gengar Tokens.`
      : `You rolled ${dice}. That total missed.`;
  });

  const disabled = mutation.isPending || props.tokens < bet;

  return (
    <GameCard title="Dream Dice" blurb="Predict the 2d6 total. Pays 2x, or 3x on doubles.">
      <Group gap={10} wrap="wrap">
        <NumberInput
          label="Predict total 2-12"
          value={total}
          onChange={(v) => setTotal(typeof v === "number" ? v : 2)}
          min={2}
          max={12}
          allowNegative={false}
          w={160}
        />
        <NumberInput
          label="Bet 1-3"
          value={bet}
          onChange={(v) => setBet(typeof v === "number" ? v : 1)}
          min={1}
          max={3}
          allowNegative={false}
          w={110}
        />
      </Group>
      <Button
        color="grape"
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "dreamDice", bet, pick: total });
        }}
        loading={mutation.isPending}
        disabled={disabled}
        maw={160}
        w="100%"
      >
        Roll
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed">
          You need {bet} Gengar Tokens to play this bet.
        </Text>
      )}
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </GameCard>
  );
}

function PaybackPyramid(props: { uid: string; tokens: number }) {
  const [pick, setPick] = React.useState<"even" | "odd">("even");
  const [bet, setBet] = React.useState<number>(1);
  const { mutation, status, setStatus } = useGamePlay(props.uid, (res) =>
    res.win
      ? `The d4 rolled ${res.roll}. You win ${res.payout} Gengar Tokens.`
      : `The d4 rolled ${res.roll}. Better luck next round.`
  );

  const disabled = mutation.isPending || props.tokens < bet;

  return (
    <GameCard title="Payback Pyramid" blurb="Call even or odd on a d4 roll.">
      <Group gap={10} wrap="wrap" align="flex-end">
        <SegmentedControl
          value={pick}
          onChange={(v) => setPick(v as "even" | "odd")}
          data={[
            { label: "Even", value: "even" },
            { label: "Odd", value: "odd" },
          ]}
          aria-label="Even or odd"
        />
        <NumberInput
          label="Bet 1-5"
          value={bet}
          onChange={(v) => setBet(typeof v === "number" ? v : 1)}
          min={1}
          max={5}
          allowNegative={false}
          w={110}
        />
      </Group>
      <Button
        color="grape"
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "paybackPyramid", bet, pick });
        }}
        loading={mutation.isPending}
        disabled={disabled}
        maw={160}
        w="100%"
      >
        Play
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed">
          You need {bet} Gengar Tokens to play this bet.
        </Text>
      )}
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </GameCard>
  );
}

function ShadowLotto(props: { uid: string; tokens: number }) {
  const queryClient = useQueryClient();
  const [pick, setPick] = React.useState<number>(1);
  const [status, setStatus] = React.useState<{ color: string; text: string } | null>(null);

  const lotto = useQuery({ queryKey: ["lotto-state"], queryFn: getLottoState });
  const mine = useQuery({
    queryKey: ["my-casino", props.uid],
    queryFn: () => getMyCasino(props.uid),
  });

  const mutation = useMutation({
    mutationFn: () => buyLottoTicket(pick),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lotto-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-casino", props.uid] });
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      setStatus({
        color: "teal",
        text: `Ticket bought for number ${res.number}. Jackpot is now ${res.jackpot} Gengar Tokens.`,
      });
    },
    onError: (err: unknown) => {
      setStatus({ color: "red", text: err instanceof Error ? err.message : "Ticket purchase failed." });
    },
  });

  const jackpot = lotto.data?.jackpot;
  const ticket = mine.data?.lottoNumber;
  const disabled = mutation.isPending || props.tokens < 1;

  return (
    <GameCard title="Shadow Lotto" blurb="One ticket costs 1 Gengar Token. Match the weekly draw 1 to 50.">
      <Group gap={10} wrap="wrap">
        <Text fz={14} c="white">
          Jackpot: {typeof jackpot === "number" ? `${jackpot} Gengar Tokens` : "-"}
        </Text>
        {typeof ticket === "number" && (
          <Badge variant="light" color="grape">
            Your ticket: #{ticket}
          </Badge>
        )}
      </Group>
      <NumberInput
        label="Pick 1-50"
        value={pick}
        onChange={(v) => setPick(typeof v === "number" ? v : 1)}
        min={1}
        max={50}
        allowNegative={false}
        w={130}
      />
      <Button
        color="grape"
        onClick={() => {
          setStatus(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={disabled}
        maw={220}
        w="100%"
      >
        Buy ticket (1 Gengar Token)
      </Button>
      {props.tokens < 1 && (
        <Text fz={12} c="dimmed">
          You need at least 1 Gengar Token to buy a ticket.
        </Text>
      )}
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </GameCard>
  );
}

export default function Casino() {
  const { user } = useAuth();
  const uid = user?.uid;

  const currencies = useQuery({
    queryKey: ["currencies", uid],
    queryFn: () => getCurrencies(uid as string),
    enabled: !!uid,
  });

  const snagCoins = num(currencies.data?.pokecoin);
  const gengarTokens = num(currencies.data?.gengarcoin);

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={6} mb={20}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap={12}>
          <Box style={{ minWidth: 0 }}>
            <Title order={1} c="white" size={30} fw={600}>
              Darts' Ghastly Gambling
            </Title>
            <Text fz={13} c="dimmed" mt={4}>
              Trade Snag Coins for Gengar Tokens and try your luck. The house RNG is
              server-side and final.
            </Text>
          </Box>
          {uid && (
            <Group gap={8} wrap="wrap">
              <CurrencyChip label="Snag Coins" value={snagCoins} />
              <CurrencyChip label="Gengar Tokens" value={gengarTokens} />
            </Group>
          )}
        </Group>
      </Stack>

      {!uid ? (
        <Card bg="#1f1a26" radius="md" p={24} withBorder>
          <Text fz={15} c="dimmed" ta="center">
            Sign in to play.
          </Text>
        </Card>
      ) : currencies.isPending ? (
        <SectionLoader />
      ) : (
        <Stack gap={20}>
          <ExchangeCard uid={uid} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <HexRoulette uid={uid} tokens={gengarTokens} />
            <DreamDice uid={uid} tokens={gengarTokens} />
            <PaybackPyramid uid={uid} tokens={gengarTokens} />
            <ShadowLotto uid={uid} tokens={gengarTokens} />
          </SimpleGrid>
        </Stack>
      )}
    </Container>
  );
}
