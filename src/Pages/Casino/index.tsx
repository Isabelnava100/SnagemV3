import { Box, Button, Container, Flex, Group, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconArrowsExchange,
  IconDice5,
  IconTargetArrow,
  IconTicket,
  IconTriangleInverted,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { hasCapability } from "../../lib/permissions";
import {
  buyLottoTicket,
  CasinoGame,
  DEFAULT_LOTTO_MIN_TICKETS,
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
 *
 * The cinematic "casino floor" restyle (July 2026): a striped hero with three
 * wallet chips, the Exchange Cage bar, a table-picker grid ("The Floor"), and a
 * seated single-game view driven by a shared 1 / 2 / 5 chip stake. Only the
 * presentation changed; the four server-backed games (Hex Roulette, Dream Dice,
 * Payback Pyramid, Shadow Lotto) keep their exact queries, mutations, and RNG.
 */

const DEFAULT_RATE = 2;

/* Redesign palette (mirrors src/assets/styles/redesign.css). */
const INK = "#0e0d11";
const CARD = "#17151c";
const CARD_BORDER = "#2a2637";
const WELL = "#141318";
const RED = "#E54156";
const GOLD = "#FFD074";
const GOLD_DEEP = "#C9940F";
const CYAN = "#12B7B6";
const PURPLE = "#7E2C75";
const PURPLE_LT = "#c79bd6";
const DIM = "#b6b1bc";
const MUTED = "#6f6a78";
const ON_GOLD = "#1A1B1E";
const HERO_BORDER = "#3a3550";

const PRIMARY_CTA = "linear-gradient(90deg,#7E2C75,#E54156)";
const GOLD_GRAD = "linear-gradient(135deg,#FFD074,#C9940F)";
const GOLD_GRAD_H = "linear-gradient(90deg,#FFD074,#C9940F)";

const CLIP_CTA = "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)";
const CLIP_CTA_SM = "polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)";
const CLIP_CARD = "polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)";
const CLIP_CHIP = "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)";
const CLIP_PANEL = "polygon(0 0,100% 0,100% 100%,22px 100%,0 calc(100% - 22px))";
const CLIP_BAR = "polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)";
const CLIP_BADGE = "polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)";
const CLIP_CELL = "polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)";
const CLIP_ICON = "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)";

const displayFont = "var(--font-display, 'Quantico', sans-serif)";

/** Pull a numeric balance out of a currency value (number or legacy string). */
function num(value?: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type Session = { won: number; lost: number; streak: number; best: number };

/* ------------------------------ small pieces ------------------------------ */

/** Square glyph tile (purple well, angled corners) used beside labels. */
function IconTile(props: { children: React.ReactNode; size?: number }) {
  const size = props.size ?? 42;
  return (
    <Box
      style={{
        flex: "none",
        width: size,
        height: size,
        background: "#3a1d63",
        border: `1px solid ${HERO_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        clipPath: CLIP_ICON,
      }}
    >
      {props.children}
    </Box>
  );
}

/** Gold payout badge (dark text, angled). */
function GoldBadge(props: { children: React.ReactNode; fz?: number }) {
  return (
    <Text
      component="span"
      tt="uppercase"
      style={{
        fontFamily: displayFont,
        fontSize: props.fz ?? 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: ON_GOLD,
        background: GOLD_GRAD_H,
        padding: "6px 12px",
        clipPath: CLIP_BADGE,
        whiteSpace: "nowrap",
      }}
    >
      {props.children}
    </Text>
  );
}

/** Angled gradient call-to-action. Gold fills always carry dark text. */
function Cta(props: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "gold" | "cyan" | "red";
}) {
  const tone = props.tone ?? "primary";
  const bg = tone === "gold" ? GOLD_GRAD_H : tone === "cyan" ? CYAN : tone === "red" ? "#8f1d2c" : PRIMARY_CTA;
  const color = tone === "gold" ? ON_GOLD : "#fff";
  return (
    <Button
      radius={0}
      onClick={props.onClick}
      disabled={props.disabled}
      loading={props.loading}
      tt="uppercase"
      style={{
        background: bg,
        color,
        border: tone === "red" ? `1px solid ${RED}` : "none",
        clipPath: CLIP_CTA,
        fontFamily: displayFont,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.1em",
        padding: "14px 26px",
        height: "auto",
      }}
    >
      {props.children}
    </Button>
  );
}

/** A joined toggle button (BUY / SELL, EVEN / ODD). */
function Toggle(props: { active: boolean; onClick: () => void; label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      aria-label={props.label}
      style={{
        fontFamily: displayFont,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "12px 24px",
        cursor: "pointer",
        border: `1px solid ${HERO_BORDER}`,
        marginLeft: props.first ? 0 : -2,
        background: props.active ? PRIMARY_CTA : "#1b1a1e",
        color: props.active ? "#fff" : DIM,
        clipPath: CLIP_CTA_SM,
      }}
    >
      {props.children}
    </UnstyledButton>
  );
}

/** Colored status line under each game. ok: null idle, true win, false loss. */
function GameMsg(props: { ok: boolean | null; children: React.ReactNode }) {
  const color = props.ok == null ? MUTED : props.ok ? CYAN : RED;
  return (
    <Text
      role="status"
      aria-live="polite"
      tt="uppercase"
      style={{ fontFamily: displayFont, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color }}
    >
      {props.children}
    </Text>
  );
}

/** Dim "you need N tokens" note. */
function NeedNote(props: { children: React.ReactNode }) {
  return (
    <Text fz={14} c="dimmed" mt={4}>
      {props.children}
    </Text>
  );
}

/** A selectable board cell (roulette hex, dice total, lotto number). */
function Cell(props: { n: React.ReactNode; selected: boolean; onClick: () => void; accent?: string; w?: number; h: number; fz: number; label: string }) {
  const accent = props.accent ?? RED;
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.selected}
      aria-label={props.label}
      style={{
        width: props.w,
        height: props.h,
        cursor: "pointer",
        fontFamily: displayFont,
        fontWeight: 700,
        fontSize: props.fz,
        border: `1px solid ${props.selected ? accent : CARD_BORDER}`,
        background: props.selected ? PRIMARY_CTA : "#1b1a1e",
        color: props.selected ? "#fff" : DIM,
        clipPath: CLIP_CELL,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {props.n}
    </UnstyledButton>
  );
}

/** Roulette wheel: purple/red conic with a dark center number. */
function Wheel(props: { value: React.ReactNode }) {
  return (
    <Box
      style={{
        width: 110,
        height: 110,
        borderRadius: "50%",
        flexShrink: 0,
        background:
          "conic-gradient(#7E2C75 0 30deg,#E54156 30deg 60deg,#7E2C75 60deg 90deg,#E54156 90deg 120deg,#7E2C75 120deg 150deg,#E54156 150deg 180deg,#7E2C75 180deg 210deg,#E54156 210deg 240deg,#7E2C75 240deg 270deg,#E54156 270deg 300deg,#7E2C75 300deg 330deg,#E54156 330deg 360deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text fz={24} fw={700} c="white" style={{ fontFamily: displayFont }}>
          {props.value}
        </Text>
      </Box>
    </Box>
  );
}

/* ------------------------------ wallet + hero ----------------------------- */

function WalletChip(props: { label: string; value: React.ReactNode; border: string; labelColor: string; valueColor?: string; sub?: React.ReactNode }) {
  return (
    <Box
      px={20}
      py={12}
      style={{ background: "rgba(20,19,24,.6)", border: `1px solid ${props.border}`, clipPath: CLIP_CHIP, minWidth: 132 }}
    >
      <Text
        tt="uppercase"
        style={{ fontFamily: displayFont, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: props.labelColor }}
      >
        {props.label}
      </Text>
      <Text style={{ fontFamily: displayFont, fontSize: 24, fontWeight: 700, color: props.valueColor ?? "#fff", lineHeight: 1.1 }}>
        {props.value}
      </Text>
      {props.sub && (
        <Text fz={11} c={MUTED} mt={1}>
          {props.sub}
        </Text>
      )}
    </Box>
  );
}

function WalletChips(props: { snagCoins: number; gengarTokens: number; session: Session }) {
  const net = props.session.won - props.session.lost;
  return (
    <Group gap={12} wrap="wrap">
      <WalletChip label="Snag Coins" value={props.snagCoins.toLocaleString()} border={GOLD_DEEP} labelColor={GOLD} />
      <WalletChip label="Gengar Tokens" value={props.gengarTokens.toLocaleString()} border={PURPLE} labelColor={PURPLE_LT} />
      <WalletChip
        label="Tonight"
        value={(net >= 0 ? "+" : "") + net}
        valueColor={net >= 0 ? CYAN : RED}
        border="#1f6f7a"
        labelColor={CYAN}
        sub={`streak ${props.session.streak} · best ${props.session.best}`}
      />
    </Group>
  );
}

/* ------------------------------ exchange cage ----------------------------- */

function ExchangeCage(props: { uid: string }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState<number>(1);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  const config = useQuery({ queryKey: ["casino-config"], queryFn: getCasinoConfig });
  const rate = config.data?.exchangeRate ?? DEFAULT_RATE;

  const mutation = useMutation({
    mutationFn: () => exchangeTokens(direction, amount),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      setNote({
        ok: true,
        text:
          direction === "buy"
            ? `Bought ${amount} Gengar Tokens. Balance: ${res.gengarcoin} Tokens.`
            : `Sold ${amount} Gengar Tokens. Balance: ${res.pokecoin} Snag Coins.`,
      });
    },
    onError: (err: unknown) => {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Exchange failed." });
    },
  });

  const safeAmount = amount >= 1 ? amount : 1;
  const idleLine =
    direction === "buy"
      ? `Buy: costs ${safeAmount * rate} Snag Coins`
      : `Sell: returns ${safeAmount * rate} Snag Coins`;

  const stepBtn = (dir: -1 | 1) => (
    <UnstyledButton
      onClick={() => setAmount((a) => Math.max(1, Math.min(99, a + dir)))}
      aria-label={dir < 0 ? "Decrease tokens" : "Increase tokens"}
      style={{ width: 38, height: 38, color: PURPLE_LT, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {dir < 0 ? "−" : "+"}
    </UnstyledButton>
  );

  return (
    <Box p={{ base: 16, sm: 20 }} style={{ background: WELL, border: `1px solid ${CARD_BORDER}`, clipPath: CLIP_BAR }}>
      <Group gap={14} align="center" wrap="wrap">
        <IconTile size={38}>
          <IconArrowsExchange size={20} color="#fff" />
        </IconTile>
        <Text component="h2" tt="uppercase" style={{ fontFamily: displayFont, fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "#fff", margin: 0 }}>
          Exchange Cage
        </Text>
        <Text
          tt="uppercase"
          style={{
            fontFamily: displayFont,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: PURPLE_LT,
            border: `1px solid ${HERO_BORDER}`,
            padding: "6px 12px",
            clipPath: "polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)",
          }}
        >
          {rate} Snag = 1 Gengar
        </Text>
        <Box style={{ flex: "1 1 20px", minWidth: 0 }} />
        <Group gap={0} wrap="nowrap">
          <Toggle first active={direction === "buy"} onClick={() => { setDirection("buy"); setNote(null); }} label="Buy Gengar Tokens">
            Buy
          </Toggle>
          <Toggle active={direction === "sell"} onClick={() => { setDirection("sell"); setNote(null); }} label="Sell Gengar Tokens">
            Sell
          </Toggle>
        </Group>
        <Group gap={0} align="center" wrap="nowrap" style={{ background: "#1b1a1e", border: `1px solid ${CARD_BORDER}` }}>
          {stepBtn(-1)}
          <Text ta="center" style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 700, color: "#fff", minWidth: 48 }} aria-label={`Amount: ${amount}`}>
            {amount}
          </Text>
          {stepBtn(1)}
        </Group>
        <Cta onClick={() => { setNote(null); mutation.mutate(); }} loading={mutation.isPending} disabled={mutation.isPending || safeAmount < 1}>
          Exchange
        </Cta>
      </Group>
      <Text role="status" aria-live="polite" fz={13} mt={12} style={{ color: note ? (note.ok ? CYAN : RED) : MUTED }}>
        {note ? note.text : idleLine}
      </Text>
    </Box>
  );
}

/* ------------------------------- the floor -------------------------------- */

interface TableDef {
  id: CasinoGame | "shadowLotto";
  name: string;
  icon: React.ReactNode;
  payout: string;
  blurb: string;
  rules: string;
}

const TABLES: TableDef[] = [
  {
    id: "hexRoulette",
    name: "Hex Roulette",
    icon: <IconTargetArrow size={22} color={GOLD} />,
    payout: "Win 5.5x",
    blurb: "Cover a hex on the board, then one spin decides your fate.",
    rules: "Pick a number 1 to 36 and set your chip. Land it and take 5.5x your stake.",
  },
  {
    id: "dreamDice",
    name: "Dream Dice",
    icon: <IconDice5 size={22} color={CYAN} />,
    payout: "2x · 3x Doubles",
    blurb: "Call the total before the bones land. Doubles pay extra.",
    rules: "Call the 2d6 total and set your chip. A hit pays 2x, or 3x on doubles.",
  },
  {
    id: "paybackPyramid",
    name: "Payback Pyramid",
    icon: <IconTriangleInverted size={20} color={GOLD} />,
    payout: "Win 2x",
    blurb: "Even or odd on a d4. Simple, spooky, 50/50.",
    rules: "Call even or odd. The d4 pays 2x your chip.",
  },
  {
    id: "shadowLotto",
    name: "Shadow Lotto",
    icon: <IconTicket size={22} color={CYAN} />,
    payout: "Jackpot",
    blurb: "One token, one number, one weekly draw. Winner takes the pot.",
    rules: "Tickets cost 1 Gengar Token. Match the weekly draw (1 to 50) and the jackpot is yours.",
  },
];

function FloorKicker(props: { children: React.ReactNode }) {
  return (
    <Group gap={12} align="center" wrap="nowrap">
      <Box style={{ width: 28, height: 3, background: RED, flexShrink: 0 }} aria-hidden />
      <Text tt="uppercase" style={{ fontFamily: displayFont, fontSize: 13, fontWeight: 700, letterSpacing: "0.28em", color: PURPLE_LT }}>
        {props.children}
      </Text>
    </Group>
  );
}

function TableCard(props: { table: TableDef; onSit: () => void }) {
  const t = props.table;
  return (
    <UnstyledButton
      onClick={props.onSit}
      className="dc-card-tile"
      aria-label={`Sit down at ${t.name}`}
      style={{
        textAlign: "left",
        background: "radial-gradient(ellipse at 50% 0%,#1c1526,#141318)",
        padding: "22px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        clipPath: CLIP_CARD,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" w="100%">
        <IconTile>{t.icon}</IconTile>
        <GoldBadge>{t.payout}</GoldBadge>
      </Group>
      <Text style={{ fontFamily: displayFont, fontSize: 19, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
        {t.name}
      </Text>
      <Text fz={13} c={DIM} lh={1.5} style={{ flex: 1 }}>
        {t.blurb}
      </Text>
      <Text tt="uppercase" mt={4} style={{ fontFamily: displayFont, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: GOLD }}>
        Sit down &rarr;
      </Text>
    </UnstyledButton>
  );
}

function Floor(props: { onSit: (id: TableDef["id"]) => void }) {
  return (
    <Stack gap={16}>
      <FloorKicker>The Floor · Pick a Table</FloorKicker>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={16}>
        {TABLES.map((t) => (
          <TableCard key={t.id} table={t} onSit={() => props.onSit(t.id)} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/* ---------------------------- seated: chip rail --------------------------- */

function ChipSelector(props: { stake: number; setStake: (n: number) => void }) {
  return (
    <Group gap={10} align="center" wrap="nowrap">
      <Text tt="uppercase" style={{ fontFamily: displayFont, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", color: MUTED }}>
        Your Chips
      </Text>
      <Group gap={8} wrap="nowrap">
        {[1, 2, 5].map((v) => {
          const active = props.stake === v;
          return (
            <UnstyledButton
              key={v}
              onClick={() => props.setStake(v)}
              aria-pressed={active}
              aria-label={`Stake ${v} tokens`}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                cursor: "pointer",
                fontFamily: displayFont,
                fontSize: 16,
                fontWeight: 700,
                border: `3px dashed ${active ? GOLD : HERO_BORDER}`,
                background: active ? GOLD_GRAD : "#1b1a1e",
                color: active ? ON_GOLD : DIM,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {v}
            </UnstyledButton>
          );
        })}
      </Group>
    </Group>
  );
}

/* ------------------------------- game hook -------------------------------- */

/** Wires a playGame call into a mutation plus a tri-state message. */
function useGamePlay(
  uid: string,
  format: (res: { win: boolean; roll: number | number[]; payout: number }) => string,
  onResult?: (res: { win: boolean; roll: number | number[]; payout: number }, bet: number) => void
) {
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<{ ok: boolean | null; msg: string | null }>({ ok: null, msg: null });

  const mutation = useMutation({
    mutationFn: (vars: { game: CasinoGame; bet: number; pick: number | "even" | "odd" }) =>
      playGame(vars.game, vars.bet, vars.pick),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["currencies", uid] });
      setState({ ok: res.win, msg: format(res) });
      onResult?.(res, vars.bet);
    },
    onError: (err: unknown) => {
      setState({ ok: false, msg: err instanceof Error ? err.message : "The play failed." });
    },
  });

  const reset = () => setState({ ok: null, msg: null });
  return { mutation, ok: state.ok, msg: state.msg, reset };
}

type GameProps = {
  uid: string;
  tokens: number;
  stake: number;
  record: (win: boolean, payout: number, wager: number) => void;
};

/* --------------------------------- games ---------------------------------- */

function HexRouletteBody(props: GameProps) {
  const [pick, setPick] = React.useState<number>(1);
  const [wheel, setWheel] = React.useState<string>("?");
  const { mutation, ok, msg, reset } = useGamePlay(
    props.uid,
    (res) =>
      res.win
        ? `The wheel lands on ${res.roll}. Take ${res.payout} Gengar Tokens.`
        : `The wheel lands on ${res.roll}. The house sweeps ${props.stake}.`,
    (res, bet) => {
      setWheel(String(res.roll));
      props.record(res.win, res.payout, bet);
    }
  );
  const disabled = mutation.isPending || props.tokens < props.stake;

  return (
    <Flex gap={28} wrap="wrap" align="flex-start">
      <Box style={{ flex: "1 1 300px", minWidth: 0, maxWidth: 372 }}>
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
          {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
            <Cell key={n} n={n} label={`Number ${n}`} selected={pick === n} onClick={() => setPick(n)} h={44} fz={15} />
          ))}
        </Box>
      </Box>
      <Stack gap={16} style={{ flex: "1 1 240px", minWidth: 240 }}>
        <Group gap={20} align="center" wrap="wrap">
          <Wheel value={wheel} />
          <Stack gap={8}>
            <Text fz={14} c={DIM}>
              {props.stake} token{props.stake > 1 ? "s" : ""} on hex {pick}.
            </Text>
            <Cta onClick={() => { reset(); mutation.mutate({ game: "hexRoulette", bet: props.stake, pick }); }} loading={mutation.isPending} disabled={disabled}>
              Spin the Wheel &rarr;
            </Cta>
          </Stack>
        </Group>
        <GameMsg ok={ok}>{msg ?? "Cover a hex and spin."}</GameMsg>
        {props.tokens < props.stake && <NeedNote>You need {props.stake} Gengar Tokens for this chip.</NeedNote>}
      </Stack>
    </Flex>
  );
}

function DreamDiceBody(props: GameProps) {
  const [total, setTotal] = React.useState<number>(7);
  const [dice, setDice] = React.useState<[number, number]>([5, 2]);
  const { mutation, ok, msg, reset } = useGamePlay(
    props.uid,
    (res) => {
      const shown = Array.isArray(res.roll) ? res.roll.join(" and ") : String(res.roll);
      return res.win
        ? `You rolled ${shown}. Take ${res.payout} Gengar Tokens.`
        : `You rolled ${shown}. That total missed.`;
    },
    (res, bet) => {
      if (Array.isArray(res.roll) && res.roll.length >= 2) setDice([res.roll[0], res.roll[1]]);
      props.record(res.win, res.payout, bet);
    }
  );
  const disabled = mutation.isPending || props.tokens < props.stake;

  const dieTile = (v: number, key: number) => (
    <Box
      key={key}
      style={{
        width: 58,
        height: 58,
        background: "#1b1a1e",
        border: `1px solid #1f6f7a`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: displayFont,
        fontSize: 26,
        fontWeight: 700,
        color: CYAN,
        clipPath: CLIP_CHIP,
      }}
    >
      {v}
    </Box>
  );

  return (
    <Stack gap={18}>
      <Group gap={8} wrap="wrap">
        {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
          <Cell key={n} n={n} label={`Total ${n}`} selected={total === n} onClick={() => setTotal(n)} accent={CYAN} w={54} h={48} fz={17} />
        ))}
      </Group>
      <Group gap={24} align="center" wrap="wrap">
        <Group gap={10}>
          {dieTile(dice[0], 0)}
          {dieTile(dice[1], 1)}
        </Group>
        <Text fz={14} c={DIM}>
          {props.stake} token{props.stake > 1 ? "s" : ""} on a total of {total}.
        </Text>
        <Cta onClick={() => { reset(); mutation.mutate({ game: "dreamDice", bet: props.stake, pick: total }); }} loading={mutation.isPending} disabled={disabled}>
          Roll the Dice &rarr;
        </Cta>
      </Group>
      <GameMsg ok={ok}>{msg ?? "Call the total, then roll."}</GameMsg>
      {props.tokens < props.stake && <NeedNote>You need {props.stake} Gengar Tokens for this chip.</NeedNote>}
    </Stack>
  );
}

function PaybackPyramidBody(props: GameProps) {
  const [call, setCall] = React.useState<"even" | "odd">("even");
  const [face, setFace] = React.useState<string>("?");
  const { mutation, ok, msg, reset } = useGamePlay(
    props.uid,
    (res) =>
      res.win
        ? `The d4 shows ${res.roll}. ${call.toUpperCase()} pays ${res.payout} Gengar Tokens.`
        : `The d4 shows ${res.roll}. The pyramid takes its cut.`,
    (res, bet) => {
      setFace(String(res.roll));
      props.record(res.win, res.payout, bet);
    }
  );
  const disabled = mutation.isPending || props.tokens < props.stake;

  return (
    <Stack gap={18}>
      <Group gap={28} align="center" wrap="wrap">
        <Box
          style={{
            width: 64,
            height: 64,
            background: GOLD_GRAD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: displayFont,
            fontSize: 28,
            fontWeight: 700,
            color: ON_GOLD,
            clipPath: "polygon(50% 0,100% 100%,0 100%)",
          }}
        >
          {face}
        </Box>
        <Group gap={0} wrap="nowrap">
          <Toggle first active={call === "even"} onClick={() => setCall("even")} label="Call even">
            Even
          </Toggle>
          <Toggle active={call === "odd"} onClick={() => setCall("odd")} label="Call odd">
            Odd
          </Toggle>
        </Group>
        <Cta onClick={() => { reset(); mutation.mutate({ game: "paybackPyramid", bet: props.stake, pick: call }); }} loading={mutation.isPending} disabled={disabled}>
          Play &rarr;
        </Cta>
      </Group>
      <GameMsg ok={ok}>{msg ?? "Call it and play."}</GameMsg>
      {props.tokens < props.stake && <NeedNote>You need {props.stake} Gengar Tokens for this chip.</NeedNote>}
    </Stack>
  );
}

function ShadowLottoBody(props: { uid: string; tokens: number; record: (win: boolean, payout: number, wager: number) => void }) {
  const queryClient = useQueryClient();
  const [pick, setPick] = React.useState<number>(1);
  const [state, setState] = React.useState<{ ok: boolean | null; msg: string | null }>({ ok: null, msg: null });

  const lotto = useQuery({ queryKey: ["lotto-state"], queryFn: getLottoState });
  const mine = useQuery({ queryKey: ["my-casino", props.uid], queryFn: () => getMyCasino(props.uid) });
  const config = useQuery({ queryKey: ["casino-config"], queryFn: getCasinoConfig });
  const minTickets = Math.max(1, config.data?.lottoMinTickets ?? DEFAULT_LOTTO_MIN_TICKETS);

  const buy = useMutation({
    mutationFn: () => buyLottoTicket(pick),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lotto-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-casino", props.uid] });
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      props.record(false, 0, 1);
      setState({ ok: true, msg: `Ticket Nº ${res.number} is in the draw. Jackpot is now ${res.jackpot} Gengar Tokens.` });
    },
    onError: (err: unknown) => setState({ ok: false, msg: err instanceof Error ? err.message : "Ticket purchase failed." }),
  });

  const { user } = useAuth();
  const canDraw = hasCapability(user, Capability.ReviewRewards);

  const draw = useMutation({
    mutationFn: () => drawLotto(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lotto-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-casino", props.uid] });
      queryClient.invalidateQueries({ queryKey: ["currencies", props.uid] });
      if (res.winners) props.record(true, res.share, 0);
      setState({
        ok: !!res.winners,
        msg: res.winners
          ? `Drawn: ${res.drawn}. ${res.winners} winner(s) split the pot for ${res.share} Gengar Tokens each.`
          : `Drawn: ${res.drawn}. No winning tickets this round.`,
      });
    },
    onError: (err: unknown) => setState({ ok: false, msg: err instanceof Error ? err.message : "The draw failed." }),
  });

  const jackpot = lotto.data?.jackpot;
  const ticket = mine.data?.lottoNumber;
  const entries = lotto.data?.ticketCount ?? 0;
  const disabled = buy.isPending || props.tokens < 1;

  return (
    <Flex gap={28} wrap="wrap" align="flex-start">
      <Box style={{ flex: "1 1 300px", minWidth: 0, maxWidth: 470 }}>
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 5 }}>
          {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
            <Cell key={n} n={n} label={`Number ${n}`} selected={pick === n} onClick={() => setPick(n)} h={36} fz={13} />
          ))}
        </Box>
      </Box>
      <Stack gap={14} style={{ flex: "1 1 240px", minWidth: 240 }}>
        <Box>
          <Text tt="uppercase" style={{ fontFamily: displayFont, fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: CYAN }}>
            Jackpot
          </Text>
          <Text style={{ fontFamily: displayFont, fontSize: 34, fontWeight: 700, color: CYAN, lineHeight: 1 }}>
            {typeof jackpot === "number" ? jackpot : "-"}
          </Text>
          <Text fz={12} c={MUTED}>
            Gengar Tokens · {entries} of {minTickets} entries in
          </Text>
        </Box>
        <Group gap={10} wrap="wrap">
          <Cta onClick={() => { setState({ ok: null, msg: null }); buy.mutate(); }} loading={buy.isPending} disabled={disabled}>
            Buy Ticket · 1 &#10022;
          </Cta>
          {canDraw && (
            <Cta tone="red" onClick={() => { setState({ ok: null, msg: null }); draw.mutate(); }} loading={draw.isPending} disabled={draw.isPending}>
              Draw · Admin
            </Cta>
          )}
        </Group>
        {typeof ticket === "number" && (
          <Text
            style={{
              fontFamily: displayFont,
              fontSize: 12,
              fontWeight: 700,
              color: PURPLE_LT,
              border: `1px solid ${HERO_BORDER}`,
              padding: "5px 12px",
              clipPath: "polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)",
              alignSelf: "flex-start",
            }}
          >
            Nº {ticket}
          </Text>
        )}
        <GameMsg ok={state.ok}>{state.msg ?? "Pick a number, buy in."}</GameMsg>
        {props.tokens < 1 && <NeedNote>You need at least 1 Gengar Token for a ticket.</NeedNote>}
      </Stack>
    </Flex>
  );
}

/* ------------------------------ seated view ------------------------------- */

function Seated(props: {
  table: TableDef;
  uid: string;
  tokens: number;
  stake: number;
  setStake: (n: number) => void;
  record: (win: boolean, payout: number, wager: number) => void;
  onStand: () => void;
}) {
  const t = props.table;
  const showStake = t.id !== "shadowLotto";
  const gameProps: GameProps = { uid: props.uid, tokens: props.tokens, stake: props.stake, record: props.record };

  return (
    <Stack gap={16}>
      <Flex align="center" gap={16} wrap="wrap">
        <UnstyledButton
          onClick={props.onStand}
          aria-label="Back to the floor"
          style={{
            fontFamily: displayFont,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: PURPLE_LT,
            border: `1px solid ${HERO_BORDER}`,
            padding: "10px 18px",
            cursor: "pointer",
            clipPath: CLIP_CTA_SM,
          }}
        >
          &larr; Back to the Floor
        </UnstyledButton>
        <Text component="h2" style={{ fontFamily: displayFont, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "0.04em", margin: 0 }}>
          {t.name}
        </Text>
        <Box style={{ flex: "1 1 10px", minWidth: 0 }} />
        {showStake && <ChipSelector stake={props.stake} setStake={props.setStake} />}
      </Flex>

      <Box
        p={{ base: 20, sm: 30 }}
        style={{
          background: "radial-gradient(ellipse at 50% -20%,#241f2e,#141318)",
          border: `1px solid ${HERO_BORDER}`,
          clipPath: CLIP_PANEL,
        }}
      >
        <Group gap={14} align="center" wrap="wrap" mb={20}>
          <GoldBadge fz={12}>{t.payout}</GoldBadge>
          <Text fz={14} c={DIM} lh={1.5} style={{ flex: 1, minWidth: 200 }}>
            {t.rules}
          </Text>
        </Group>
        {t.id === "hexRoulette" && <HexRouletteBody {...gameProps} />}
        {t.id === "dreamDice" && <DreamDiceBody {...gameProps} />}
        {t.id === "paybackPyramid" && <PaybackPyramidBody {...gameProps} />}
        {t.id === "shadowLotto" && <ShadowLottoBody uid={props.uid} tokens={props.tokens} record={props.record} />}
      </Box>
    </Stack>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function Casino() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [seat, setSeat] = React.useState<TableDef["id"] | null>(null);
  const [stake, setStake] = React.useState<number>(1);
  const [session, setSession] = React.useState<Session>({ won: 0, lost: 0, streak: 0, best: 0 });

  const record = React.useCallback((win: boolean, payout: number, wager: number) => {
    setSession((s) => {
      const streak = win ? s.streak + 1 : 0;
      return {
        won: s.won + Math.max(0, payout - wager),
        lost: s.lost + Math.max(0, wager - payout),
        streak,
        best: Math.max(s.best, streak),
      };
    });
  }, []);

  const currencies = useQuery({
    queryKey: ["currencies", uid],
    queryFn: () => getCurrencies(uid as string),
    enabled: !!uid,
  });

  const snagCoins = num(currencies.data?.pokecoin);
  const gengarTokens = num(currencies.data?.gengarcoin);
  const seatTable = TABLES.find((t) => t.id === seat) ?? null;

  return (
    <Box style={{ background: INK, minHeight: "100%" }}>
      <Seo page="/Casino" />
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        <PageHero
          eyebrow="The Casino · Open All Night"
          title="GHASTLY GAMBLING"
          subtitle="Pick a table, set your chips, and try your luck. The house RNG is server-side and final."
          aside={uid ? <WalletChips snagCoins={snagCoins} gengarTokens={gengarTokens} session={session} /> : undefined}
        />

        {!uid ? (
          <Box p={24} style={{ background: CARD, border: `1px solid ${CARD_BORDER}` }}>
            <Text fz={16} c="dimmed" ta="center">
              Sign in to play.
            </Text>
          </Box>
        ) : currencies.isPending ? (
          <SectionLoader />
        ) : (
          <Stack gap={20}>
            <ExchangeCage uid={uid} />
            {seatTable ? (
              <Seated
                table={seatTable}
                uid={uid}
                tokens={gengarTokens}
                stake={stake}
                setStake={setStake}
                record={record}
                onStand={() => setSeat(null)}
              />
            ) : (
              <Floor onSit={setSeat} />
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
