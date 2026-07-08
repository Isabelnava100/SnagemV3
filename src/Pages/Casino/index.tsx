import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowsExchange,
  IconCoin,
  IconDice5,
  IconDroplet,
  IconGhost2,
  IconMinus,
  IconPlayerPlayFilled,
  IconPlus,
  IconRotateClockwise2,
  IconSkull,
  IconTargetArrow,
  IconTicket,
  IconTriangleInverted,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { hasCapability } from "../../lib/permissions";
import {
  buyLottoTicket,
  CasinoGame,
  drawLotto,
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

const BG = "#0d0716";
const PANEL = "#171029";
const PANEL_BORDER = "#2b2142";

/** Pull a numeric balance out of a currency value (number or legacy string). */
function num(value?: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A single line that announces an action result to screen readers. */
function StatusLine(props: { color?: string; children: React.ReactNode }) {
  if (!props.children) return null;
  return (
    <Text role="status" aria-live="polite" fz={13} c={props.color} mt={4}>
      {props.children}
    </Text>
  );
}

/** Little uppercase caption used above every stepper and section. */
function Caption(props: { children: React.ReactNode; c?: string }) {
  return (
    <Text fz={11} fw={700} tt="uppercase" c={props.c ?? "dimmed"} style={{ letterSpacing: 1.5 }}>
      {props.children}
    </Text>
  );
}

/** A -/+ number stepper. Keyboard-operable (real buttons) with a labeled value. */
function Stepper(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  accent: string;
}) {
  const clamp = (n: number) => Math.max(props.min, Math.min(props.max, n));
  const set = (n: number) => props.onChange(clamp(n));
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        background: "#0e0a18",
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 12,
        padding: 6,
      }}
    >
      <ActionIcon
        variant="subtle"
        radius="md"
        size="lg"
        onClick={() => set(props.value - 1)}
        disabled={props.value <= props.min}
        aria-label={`Decrease ${props.label}`}
        style={{ color: props.accent }}
      >
        <IconMinus size={18} />
      </ActionIcon>
      <Text fz={22} fw={800} c="white" aria-label={`${props.label}: ${props.value}`}>
        {props.value}
      </Text>
      <ActionIcon
        variant="subtle"
        radius="md"
        size="lg"
        onClick={() => set(props.value + 1)}
        disabled={props.value >= props.max}
        aria-label={`Increase ${props.label}`}
        style={{ color: props.accent }}
      >
        <IconPlus size={18} />
      </ActionIcon>
    </Box>
  );
}

/** Rounded pill badge shown top-right of each game card. */
function PayoutBadge(props: { children: React.ReactNode; color: string }) {
  return (
    <Text
      fz={12}
      fw={800}
      tt="uppercase"
      px={12}
      py={5}
      style={{
        borderRadius: 999,
        color: props.color,
        background: `${props.color}1f`,
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
      }}
    >
      {props.children}
    </Text>
  );
}

/** Shared game-card shell: icon tile, title, payout badge, blurb, body. */
function GameCard(props: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  blurb: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box p={{ base: "md", sm: "lg" }} style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}`, borderRadius: 20 }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" mb={6}>
        <Group gap={12} wrap="nowrap">
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              flexShrink: 0,
              background: props.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {props.icon}
          </Box>
          <Text fz={22} fw={800} c="white">
            {props.title}
          </Text>
        </Group>
        {props.badge}
      </Group>
      <Text fz={14} c="gray.5" mb="md">
        {props.blurb}
      </Text>
      {props.children}
    </Box>
  );
}

/** Hook that wires a playGame call into a mutation plus a status line. */
function useGamePlay(
  uid: string,
  format: (res: { win: boolean; roll: number | number[]; payout: number }) => string
) {
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

/* --------------------------------- Wheel ---------------------------------- */

function RouletteWheel(props: { number: number }) {
  return (
    <Box style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
      <Box
        style={{
          position: "absolute",
          top: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "12px solid #f5c518",
          zIndex: 2,
        }}
      />
      <Box
        style={{
          width: 128,
          height: 128,
          borderRadius: "50%",
          background:
            "repeating-conic-gradient(#d6249f 0deg 15deg, #6b1f6b 15deg 30deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          style={{
            width: 62,
            height: 62,
            borderRadius: "50%",
            background: "#0e0a18",
            border: "2px solid #2b2142",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fz={26} fw={800} c="white">
            {props.number}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

/** A die face with pips for 1-6. */
function PipDie(props: { value: number; size?: number; bg?: string; pip?: string }) {
  const size = props.size ?? 72;
  const pip = props.pip ?? "#1a1622";
  const layouts: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };
  const dots = layouts[Math.max(1, Math.min(6, props.value))] ?? layouts[1];
  const cell = (r: number, c: number) => dots.some(([dr, dc]) => dr === r && dc === c);
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: props.bg ?? "#f4f2ee",
        padding: size * 0.14,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: size * 0.06,
        boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        return (
          <Box
            key={i}
            style={{
              borderRadius: "50%",
              background: cell(r, c) ? pip : "transparent",
            }}
          />
        );
      })}
    </Box>
  );
}

/* --------------------------------- Games ---------------------------------- */

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
    <Box p={{ base: "md", sm: "lg" }} style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}`, borderRadius: 20 }}>
      <Group justify="space-between" wrap="wrap" gap={12} mb="lg">
        <Group gap={14} wrap="nowrap">
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #a855f7, #6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconArrowsExchange size={24} color="#fff" />
          </Box>
          <Text fz={24} fw={800} c="white">
            The Exchange Cage
          </Text>
        </Group>
        <Text
          fz={13}
          fw={700}
          c="grape.3"
          px={14}
          py={7}
          style={{ borderRadius: 999, background: "#0e0a18", letterSpacing: 0.5 }}
        >
          Rate &middot; {rate} Snag = 1 Gengar
        </Text>
      </Group>

      <Group gap={12} align="flex-end" wrap="wrap">
        <SegmentedControl
          value={direction}
          onChange={(v) => setDirection(v as "buy" | "sell")}
          data={[
            { label: "Buy", value: "buy" },
            { label: "Sell", value: "sell" },
          ]}
          color="grape"
          aria-label="Exchange direction"
        />
        <Box style={{ flex: "1 1 140px", minWidth: 120 }}>
          <Caption>Tokens</Caption>
          <Box mt={4}>
            <Stepper label="Tokens" value={amount} onChange={setAmount} min={1} max={999} accent="#c084fc" />
          </Box>
        </Box>
        <Button
          variant="gradient"
          gradient={{ from: "grape", to: "violet", deg: 90 }}
          radius="md"
          size="md"
          onClick={() => {
            setStatus(null);
            mutation.mutate();
          }}
          loading={mutation.isPending}
          disabled={disabled}
        >
          Exchange
        </Button>
        <Text fz={13} c="dimmed">
          {line}
        </Text>
      </Group>
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </Box>
  );
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
    <GameCard
      icon={<IconTargetArrow size={22} color="#f472b6" />}
      iconBg="#2a1526"
      title="Hex Roulette"
      blurb="Pick a number 1 to 36 and bet up to 5 tokens. Land it and take twenty times the pot."
      badge={<PayoutBadge color="#f5c518">Win 20x</PayoutBadge>}
    >
      <Group gap="md" wrap="nowrap" align="center">
        <RouletteWheel number={number} />
        <Stack gap={10} style={{ flex: 1, minWidth: 0 }}>
          <Box>
            <Caption>Number 1-36</Caption>
            <Box mt={4}>
              <Stepper label="Number" value={number} onChange={setNumber} min={1} max={36} accent="#f472b6" />
            </Box>
          </Box>
          <Box>
            <Caption>Bet 1-5</Caption>
            <Box mt={4}>
              <Stepper label="Bet" value={bet} onChange={setBet} min={1} max={5} accent="#f472b6" />
            </Box>
          </Box>
        </Stack>
      </Group>
      <Button
        fullWidth
        mt="md"
        size="md"
        radius="md"
        variant="gradient"
        gradient={{ from: "pink", to: "grape", deg: 90 }}
        leftSection={<IconRotateClockwise2 size={18} />}
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "hexRoulette", bet, pick: number });
        }}
        loading={mutation.isPending}
        disabled={disabled}
      >
        Spin the Wheel
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed" mt={6}>
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
  const [dice, setDice] = React.useState<[number, number]>([5, 2]);
  const { mutation, status, setStatus } = useGamePlay(props.uid, (res) => {
    if (Array.isArray(res.roll) && res.roll.length >= 2) {
      setDice([res.roll[0], res.roll[1]]);
    }
    const shown = Array.isArray(res.roll) ? res.roll.join(" and ") : String(res.roll);
    return res.win
      ? `You rolled ${shown}. You win ${res.payout} Gengar Tokens.`
      : `You rolled ${shown}. That total missed.`;
  });
  const disabled = mutation.isPending || props.tokens < bet;

  return (
    <GameCard
      icon={<IconDice5 size={22} color="#5eead4" />}
      iconBg="#132a27"
      title="Dream Dice"
      blurb="Predict the 2d6 total. Pays 2x, or 3x if it lands on doubles."
      badge={<PayoutBadge color="#5eead4">2x / 3x DBL</PayoutBadge>}
    >
      <Group justify="center" gap="md" my={4}>
        <PipDie value={dice[0]} />
        <PipDie value={dice[1]} />
      </Group>
      <Group gap="md" grow mt="sm">
        <Box>
          <Caption>Predict 2-12</Caption>
          <Box mt={4}>
            <Stepper label="Predicted total" value={total} onChange={setTotal} min={2} max={12} accent="#5eead4" />
          </Box>
        </Box>
        <Box>
          <Caption>Bet 1-3</Caption>
          <Box mt={4}>
            <Stepper label="Bet" value={bet} onChange={setBet} min={1} max={3} accent="#5eead4" />
          </Box>
        </Box>
      </Group>
      <Button
        fullWidth
        mt="md"
        size="md"
        radius="md"
        variant="gradient"
        gradient={{ from: "teal", to: "cyan", deg: 90 }}
        leftSection={<IconDice5 size={18} />}
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "dreamDice", bet, pick: total });
        }}
        loading={mutation.isPending}
        disabled={disabled}
      >
        Roll the Dice
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed" mt={6}>
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
  const [face, setFace] = React.useState<number>(3);
  const { mutation, status, setStatus } = useGamePlay(props.uid, (res) => {
    if (typeof res.roll === "number") setFace(Math.max(1, Math.min(6, res.roll)));
    return res.win
      ? `The d4 rolled ${res.roll}. You win ${res.payout} Gengar Tokens.`
      : `The d4 rolled ${res.roll}. Better luck next round.`;
  });
  const disabled = mutation.isPending || props.tokens < bet;

  return (
    <GameCard
      icon={<IconTriangleInverted size={20} color="#f5c518" />}
      iconBg="#2a2410"
      title="Payback Pyramid"
      blurb="Call even or odd on a d4 roll. Simple, spooky, 50/50."
      badge={<PayoutBadge color="#f5c518">Win 2x</PayoutBadge>}
    >
      <Group justify="center" my={6}>
        <PipDie value={face} bg="#f2d675" pip="#2a2410" size={78} />
      </Group>
      <Group gap="md" align="flex-end" mt="sm" wrap="nowrap">
        <SegmentedControl
          value={pick}
          onChange={(v) => setPick(v as "even" | "odd")}
          color="yellow"
          data={[
            { label: "Even", value: "even" },
            { label: "Odd", value: "odd" },
          ]}
          aria-label="Even or odd"
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Caption>Bet 1-5</Caption>
          <Box mt={4}>
            <Stepper label="Bet" value={bet} onChange={setBet} min={1} max={5} accent="#f5c518" />
          </Box>
        </Box>
      </Group>
      <Button
        fullWidth
        mt="md"
        size="md"
        radius="md"
        variant="gradient"
        gradient={{ from: "yellow", to: "orange", deg: 90 }}
        c="#2a2410"
        leftSection={<IconPlayerPlayFilled size={16} />}
        onClick={() => {
          setStatus(null);
          mutation.mutate({ game: "paybackPyramid", bet, pick });
        }}
        loading={mutation.isPending}
        disabled={disabled}
      >
        Play
      </Button>
      {props.tokens < bet && (
        <Text fz={12} c="dimmed" mt={6}>
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
  const mine = useQuery({ queryKey: ["my-casino", props.uid], queryFn: () => getMyCasino(props.uid) });

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

  // Graders/admins draw the winner by hand (no scheduled job runs it).
  const { user } = useAuth();
  const canDraw = hasCapability(user, Capability.ReviewRewards);

  const drawMutation = useMutation({
    mutationFn: () => drawLotto(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lotto-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-casino", props.uid] });
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      setStatus({
        color: "teal",
        text: res.winners
          ? `Drew #${res.drawn}. ${res.winners} winner(s) split the pot for ${res.share} Gengar Tokens each.`
          : `Drew #${res.drawn}. No winning tickets this round.`,
      });
    },
    onError: (err: unknown) => {
      setStatus({ color: "red", text: err instanceof Error ? err.message : "The draw failed." });
    },
  });

  const jackpot = lotto.data?.jackpot;
  const ticket = mine.data?.lottoNumber;
  const disabled = mutation.isPending || props.tokens < 1;

  return (
    <GameCard
      icon={<IconTicket size={22} color="#f472b6" />}
      iconBg="#2a1526"
      title="Shadow Lotto"
      blurb="One ticket costs 1 Gengar Token. Match the weekly draw, 1 to 50."
      badge={
        typeof ticket === "number" ? <PayoutBadge color="#c084fc">Ticket #{ticket}</PayoutBadge> : null
      }
    >
      <Stack gap={2} align="center" my={4}>
        <Caption c="teal.4">Jackpot</Caption>
        <Text fz={40} fw={800} c="#5eead4" lh={1.05}>
          {typeof jackpot === "number" ? jackpot : "-"}
        </Text>
        <Text fz={13} c="dimmed">
          Gengar Tokens
        </Text>
      </Stack>
      <Group gap="md" align="flex-end" mt="sm" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Caption>Pick 1-50</Caption>
          <Box mt={4}>
            <Stepper label="Pick" value={pick} onChange={setPick} min={1} max={50} accent="#5eead4" />
          </Box>
        </Box>
        <Button
          size="md"
          radius="md"
          variant="gradient"
          gradient={{ from: "teal", to: "green", deg: 90 }}
          leftSection={<IconTicket size={18} />}
          onClick={() => {
            setStatus(null);
            mutation.mutate();
          }}
          loading={mutation.isPending}
          disabled={disabled}
        >
          Buy ticket
        </Button>
      </Group>
      {props.tokens < 1 && (
        <Text fz={12} c="dimmed" mt={6}>
          You need at least 1 Gengar Token to buy a ticket.
        </Text>
      )}
      {canDraw && (
        <Stack gap={4} mt="md">
          <Button
            fullWidth
            variant="light"
            color="red"
            radius="md"
            leftSection={<IconDroplet size={16} />}
            onClick={() => {
              setStatus(null);
              drawMutation.mutate();
            }}
            loading={drawMutation.isPending}
            disabled={drawMutation.isPending}
          >
            Draw winner (admin)
          </Button>
          <Text fz={11} c="dimmed">
            Draws the number, splits the jackpot among matching tickets, and resets the pot.
          </Text>
        </Stack>
      )}
      {status && <StatusLine color={status.color}>{status.text}</StatusLine>}
    </GameCard>
  );
}

/* --------------------------------- Page ----------------------------------- */

function CurrencyCard(props: { icon: React.ReactNode; label: string; value: number; border: string; iconBg: string }) {
  return (
    <Group
      gap={12}
      wrap="nowrap"
      px={16}
      py={10}
      style={{ borderRadius: 14, background: PANEL, border: `1px solid ${props.border}` }}
    >
      <Box
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: props.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {props.icon}
      </Box>
      <Box>
        <Caption>{props.label}</Caption>
        <Text fz={22} fw={800} c="white" lh={1.1}>
          {props.value.toLocaleString()}
        </Text>
      </Box>
    </Group>
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
    <Box style={{ background: BG, minHeight: "100%" }}>
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        {/* Header */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap={16} mb={28}>
          <Box style={{ minWidth: 0 }}>
            <Group gap={8} mb={6}>
              <IconSkull size={16} color="#c084fc" />
              <Text fz={12} fw={700} c="grape.3" tt="uppercase" style={{ letterSpacing: 3 }}>
                The Casino &middot; Open All Night
              </Text>
            </Group>
            <Text component="h1" fw={800} fz={{ base: 40, sm: 56 }} c="white" style={{ lineHeight: 1, margin: 0 }}>
              Ghastly Gambling
            </Text>
            <Text fz={{ base: 14, sm: 16 }} c="gray.4" mt={10} maw={620}>
              Trade Snag Coins for Gengar Tokens and try your luck. The house RNG is server-side and final.
            </Text>
          </Box>
          {uid && (
            <Group gap={12} wrap="wrap">
              <CurrencyCard
                icon={<IconCoin size={22} color="#f5c518" />}
                iconBg="#2a2410"
                label="Snag Coins"
                value={snagCoins}
                border="#5a4a1e"
              />
              <CurrencyCard
                icon={<IconGhost2 size={22} color="#c084fc" />}
                iconBg="#1f1633"
                label="Gengar Tokens"
                value={gengarTokens}
                border={PANEL_BORDER}
              />
            </Group>
          )}
        </Group>

        {!uid ? (
          <Box p={24} style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}`, borderRadius: 20 }}>
            <Text fz={15} c="dimmed" ta="center">
              Sign in to play.
            </Text>
          </Box>
        ) : currencies.isPending ? (
          <SectionLoader />
        ) : (
          <Stack gap={20}>
            <ExchangeCard uid={uid} />
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <HexRoulette uid={uid} tokens={gengarTokens} />
              <DreamDice uid={uid} tokens={gengarTokens} />
              <PaybackPyramid uid={uid} tokens={gengarTokens} />
              <ShadowLotto uid={uid} tokens={gengarTokens} />
            </SimpleGrid>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
