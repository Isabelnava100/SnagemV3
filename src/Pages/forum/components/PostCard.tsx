import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Flex,
  Group,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import DOMPurify from "dompurify";
import React from "react";
import { Link } from "react-router-dom";
import { getColor1, getColor2 } from "../../../components/user-forum/getColorBadges";
import { useAuth } from "../../../context/AuthContext";
import { itemData } from "../../../data/item";
import { getPokemonImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { SnagIcon, type SnagIconName } from "../../../icons/SnagIcon";
import { PokemonHoverCard } from "../../../components/pokemon/PokemonHoverCard";
import { SHADOW_GUIDE_LINK } from "../../../lib/shadow";
import { ForumPost, PostCharacter, formatFireTime } from "../types";
import { ForumTextLink, GameResultText } from "./ui";

const DISPLAY = "var(--font-display)";
const LOG_BG = "#141318";

/** One team's sprite tiles under a post, matching the mockup's TEAM footer row. */
function CharacterTeam(props: { character: PostCharacter }) {
  const { character } = props;
  const mons = character.pokemon.slice(0, 6);
  if (!mons.length) return null;
  return (
    <Box>
      <Text
        fz={12}
        fw={700}
        c="#8f8a99"
        mb={8}
        style={{ fontFamily: DISPLAY, letterSpacing: ".16em", textTransform: "uppercase" }}
      >
        {character.name || "Team"}
      </Text>
      <Flex gap={8} wrap="wrap">
        {mons.map((p) => (
          <PokemonHoverCard key={p.slug} species={{ slug: p.slug, name: p.name }}>
            <Box
              w={44}
              h={44}
              bg={LOG_BG}
              style={{
                border: "1px solid #2a2637",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              sx={{ "&:hover": { borderColor: "#FFD074" } }}
            >
              <img
                src={getPokemonImageURL(p.slug)}
                alt={p.name}
                loading="lazy"
                style={{ width: 32, height: 32, imageRendering: "pixelated" }}
              />
            </Box>
          </PokemonHoverCard>
        ))}
      </Flex>
    </Box>
  );
}

/** Clicking a user opens a small profile card with avatar and links (board 10). */
function AuthorPopover(props: {
  post: ForumPost;
  forum: string;
  threadId: string;
  fz?: number;
}) {
  const { post } = props;
  return (
    <Popover width={190} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <Text
          fz={props.fz ?? 14}
          fw={700}
          c="white"
          component="span"
          style={{ cursor: "pointer", fontFamily: DISPLAY }}
        >
          {post.owner}
        </Text>
      </Popover.Target>
      <Popover.Dropdown bg="#282727" p={10}>
        <Group gap={10} wrap="nowrap" align="flex-start">
          <Avatar
            src={post.avatar || undefined}
            alt={`${post.owner ?? "User"} avatar`}
            size={46}
            radius="xl"
          />
          <Stack gap={2}>
            <Text fz={14} fw={600} c="white">
              {post.owner}
            </Text>
            <ForumTextLink component={Link} to={`/Users/${post.owner}`}>
              View Profile
            </ForumTextLink>
            <ForumTextLink component={Link} to={`/Users/${post.owner}`}>
              View Collections
            </ForumTextLink>
            <ForumTextLink
              component={Link}
              to={`/Forum/${props.forum}/thread/${props.threadId}/post?quote=${post.id}`}
            >
              Quote their post
            </ForumTextLink>
          </Stack>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

interface LogRow {
  key: string;
  icon: SnagIconName;
  tag: string;
  color: string;
  text: string;
}

/**
 * The dashed "BATTLE LOG" box: every in-post game result (encounters, items,
 * dice, randoms, the enemy's counter-attack, Center visits, mega, boss) folded
 * into tagged rows. The underlying text is preserved verbatim; only the
 * presentation changed from pink cards to tagged log rows.
 */
export function GameBlocks(props: { post: ForumPost }) {
  const { blocks } = props.post;
  const { isOverSm } = useMediaQuery();
  if (!blocks) return null;

  const rows: LogRow[] = [];

  if (blocks.mega && props.post.type === "user") {
    const m = blocks.mega;
    rows.push({
      key: "mega",
      icon: "sparkle",
      tag: "MEGA",
      color: "#c79bd6",
      text: `${m.fromName} Mega Evolved into ${m.toName} for this post!`,
    });
  }
  if (blocks.boss && props.post.type === "user") {
    rows.push({
      key: "boss",
      icon: "ghost",
      tag: "BOSS",
      color: "#E54156",
      text: `A boss encounter is present in this post... it's a ${blocks.boss.name}!`,
    });
  }
  blocks.encounters?.forEach((enc, i) => {
    const fleeLine =
      enc.outcome === "fled"
        ? ` They tried to run away (${enc.fleeChance ?? "?"}% chance) and escaped!`
        : enc.outcome === "flee_failed"
        ? ` They tried to run away (${enc.fleeChance ?? "?"}% chance) but the ${enc.name} blocked the escape!`
        : "";
    rows.push({
      key: `enc${i}`,
      icon: "ghost",
      tag: "ENCOUNTER",
      color: "#c79bd6",
      text: `${
        enc.mode === "roll"
          ? `A pokemon has been encountered... it's a ${enc.name}!`
          : `An encounter has been chosen... it's a ${enc.name}!`
      }${!enc.catchable ? " (It is owned by a trainer and cannot be caught.)" : ""}${fleeLine}`,
    });
  });
  if (blocks.center?.healed) {
    rows.push({
      key: "center",
      icon: "shieldcheck",
      tag: "CENTER",
      color: "#12B7B6",
      text:
        "A trip to the Pokemon Center! Nurse Joy fully healed and cured this trainer's team. No battles for them until their next post.",
    });
  }
  if (blocks.battle) {
    const b = blocks.battle;
    const healLines = (b.heals ?? []).map((h) =>
      h.revive
        ? `${h.itemName} revived ${h.pokemonName} (+${h.amount} HP).`
        : `${h.itemName} healed ${h.pokemonName} for ${h.amount} HP.`
    );
    const hitLine =
      b.damageTaken > 0
        ? b.fainted
          ? `${b.fighterName} took ${b.damageTaken} damage and fainted!`
          : `${b.fighterName} took ${b.damageTaken} damage (HP ${b.hpLeft}${
              b.maxHp ? `/${b.maxHp}` : ""
            } left).`
        : "";
    const text = [...(b.notes ?? []), ...healLines, hitLine].filter(Boolean).join(" ");
    if (text) rows.push({ key: "battle", icon: "bolt", tag: "ENEMY", color: "#E54156", text });
  }
  blocks.itemsUsed?.forEach((item, i) => {
    // Resolve the display name from the canonical catalog by id so older posts
    // (stored with raw slug names) show the full name too.
    const catalog = itemData.find((c) => c.id === item.itemId);
    const itemName = catalog?.name ?? item.name;
    rows.push({
      key: `item${i}`,
      icon: "gift",
      tag: "ITEM",
      color: "#FFD074",
      text: `${item.qty > 1 ? `${item.qty}x ` : "A "}${itemName} has been used...${
        item.caughtPokemon ? ` it successfully caught the ${item.caughtPokemon}!` : ""
      }${item.note ? ` ${item.note}` : ""}`,
    });
  });
  blocks.dice?.forEach((d, i) => {
    rows.push({
      key: `dice${i}`,
      icon: "dice",
      tag: "DICE",
      color: "#FFD074",
      text:
        d.count === 1
          ? `A D${d.sides} has been rolled... the result is ${d.results[0]}!`
          : `${d.count} D${d.sides} have been rolled... the results are ${d.results.join(", ")}!`,
    });
  });
  blocks.randoms?.forEach((r, i) => {
    rows.push({
      key: `rand${i}`,
      icon: "dice",
      tag: "RANDOM",
      color: "#FFD074",
      text: `A random number between ${r.min} and ${r.max} was generated... the result is ${r.result}!`,
    });
  });

  if (!rows.length) return null;

  return (
    <Box mt={16} bg={LOG_BG} style={{ border: "1px dashed #4b3f63" }}>
      <Flex align="center" gap={10} px={16} py={10} style={{ borderBottom: "1px solid #232028" }}>
        <SnagIcon name="dice" size={16} color="#FFD074" cut={LOG_BG} />
        <Text
          fz={isOverSm ? 14 : 12}
          fw={700}
          c="#FFD074"
          style={{ fontFamily: DISPLAY, letterSpacing: ".16em" }}
        >
          BATTLE LOG
        </Text>
      </Flex>
      <Stack gap={0} py={4}>
        {rows.map((r) => (
          <Flex key={r.key} align="flex-start" gap={isOverSm ? 12 : 10} px={16} py={7}>
            <Box style={{ flex: "none", marginTop: 2 }}>
              <SnagIcon name={r.icon} size={16} color={r.color} cut={LOG_BG} />
            </Box>
            <Text
              fz={isOverSm ? 14 : 11}
              fw={700}
              c={r.color}
              style={{
                flex: "none",
                width: isOverSm ? 104 : 76,
                fontFamily: DISPLAY,
                letterSpacing: ".1em",
              }}
            >
              {r.tag}
            </Text>
            <Text fz={isOverSm ? 14 : 12} c="#d7d2de" style={{ lineHeight: 1.5 }}>
              {r.text}
            </Text>
          </Flex>
        ))}
      </Stack>
    </Box>
  );
}

/** In-stream announcement card when the host starts or ends a boss battle. */
function BossAnnouncement(props: { post: ForumPost }) {
  const { post } = props;
  const boss = post.blocks?.boss;
  if (!boss) return null;
  const starting = post.type === "boss_start";
  return (
    <Box p={16} bg="#2a1a1e" style={{ border: "1px solid #E54156" }}>
      <Flex align="center" gap={12}>
        <PokemonHoverCard species={{ slug: boss.slug, name: boss.name }}>
          <Avatar
            src={getPokemonImageURL(boss.slug)}
            alt={`${boss.name} sprite`}
            size={64}
            radius="xl"
          />
        </PokemonHoverCard>
        <Stack gap={4}>
          <GameResultText>
            {starting
              ? `A boss has appeared... it's a ${boss.name}!`
              : `The boss battle against ${boss.name} has ended!`}
          </GameResultText>
          {starting && post.text && (
            <Text
              fz={14}
              c="gray.3"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.text) }}
            />
          )}
        </Stack>
      </Flex>
    </Box>
  );
}

/** In-stream card announcing an evolution that a post triggered. */
function EvolutionAnnouncement(props: { post: ForumPost }) {
  const evo = props.post.blocks?.evolution;
  if (!evo) return null;
  return (
    <Box p={16} bg="#14251a" style={{ border: "1px solid #3f7a2b" }}>
      <Flex align="center" gap={12} wrap="wrap">
        <PokemonHoverCard species={{ slug: evo.fromSlug, name: evo.fromName }}>
          <Avatar src={getPokemonImageURL(evo.fromSlug)} alt={`${evo.fromName} sprite`} size={56} radius="xl" />
        </PokemonHoverCard>
        <Text c="dimmed" fz={24}>
          &rarr;
        </Text>
        <PokemonHoverCard species={{ slug: evo.toSlug, name: evo.toName }}>
          <Avatar src={getPokemonImageURL(evo.toSlug)} alt={`${evo.toName} sprite`} size={56} radius="xl" />
        </PokemonHoverCard>
        <GameResultText>
          Wow! {evo.fromName} evolved into {evo.toName}!
        </GameResultText>
      </Flex>
    </Box>
  );
}

/** In-stream card announcing pokemon that became fully shadowed on a post. */
function ShadowedAnnouncement(props: { post: ForumPost }) {
  const names = props.post.blocks?.shadowed?.names ?? [];
  if (!names.length) return null;
  return (
    <Box p={16} bg="#241f2e" style={{ border: "1px solid #772976" }}>
      <GameResultText>
        Your pokemon have become shadowed! {names.join(", ")} {names.length === 1 ? "is" : "are"} now
        shadowed.
      </GameResultText>
      <Anchor component={Link} to={SHADOW_GUIDE_LINK} c="grape.3" fz={14} mt={4} display="inline-block">
        What does that mean, and how do I cure it? &rarr;
      </Anchor>
    </Box>
  );
}

const EDIT_BTN_SX = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  border: "1px solid #3a3550",
  color: "#b6b1bc",
  fontFamily: DISPLAY,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: ".1em",
  padding: "7px 14px",
  cursor: "pointer",
  textDecoration: "none",
  "&:hover": { borderColor: "#FFD074", color: "#FFD074" },
} as const;

export default function PostCard(props: {
  post: ForumPost;
  forum: string;
  threadId: string;
  anchorId?: string;
  /** Closed threads are read-only, so the edit control is hidden. */
  threadClosed?: boolean;
}) {
  const { post, forum, threadId } = props;
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const isSystem =
    post.type === "boss_start" ||
    post.type === "boss_end" ||
    post.type === "evolution" ||
    post.type === "shadowed";
  const canEdit =
    !isSystem &&
    !props.threadClosed &&
    !!user &&
    (post.ownerUid ? post.ownerUid === user.uid : false);

  // System posts (evolution / shadowed / boss start-end) render their own
  // announcement card inside the article surface.
  if (isSystem) {
    return (
      <Box id={props.anchorId} bg="#282727" p={isOverSm ? 20 : 16} style={{ border: "1px solid #2a2637" }}>
        <Flex justify="space-between" align="center" gap={8} wrap="wrap" mb={12}>
          <Group gap={8}>
            <Avatar src={post.avatar || undefined} alt={`${post.owner ?? "User"} avatar`} size={26} radius="xl" />
            <Text fz={14} fw={700} c="white" style={{ fontFamily: DISPLAY }}>
              {post.owner}
            </Text>
          </Group>
          <Text fz={14} c="dimmed">
            {formatFireTime(post.timePosted)}
          </Text>
        </Flex>
        {post.type === "evolution" ? (
          <EvolutionAnnouncement post={post} />
        ) : post.type === "shadowed" ? (
          <ShadowedAnnouncement post={post} />
        ) : (
          <BossAnnouncement post={post} />
        )}
      </Box>
    );
  }

  const badges = (post.badges ?? []).filter(Boolean).map((badge) => (
    <Badge
      key={badge}
      variant="gradient"
      gradient={{ from: getColor1(badge), to: getColor2(badge) }}
      size="sm"
    >
      {badge}
    </Badge>
  ));

  const timeText = (
    <Text fz={14} c="#b6b1bc">
      {formatFireTime(post.timePosted)}
      {post.editedAt ? " (edited)" : ""}
    </Text>
  );

  const editBtn = canEdit ? (
    <Box
      component={Link}
      to={`/Forum/${forum}/thread/${threadId}/edit/${post.id}`}
      sx={EDIT_BTN_SX}
    >
      &#9998; EDIT
    </Box>
  ) : null;

  const body = (
    <Text
      fz={isOverSm ? 16 : 15}
      c="#e8e4ec"
      style={{ width: "100%", overflowWrap: "break-word", lineHeight: 1.75 }}
      className="forum-post-body"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.text) }}
    />
  );

  const legacyChar =
    !post.characters?.length && post.character ? (
      <Text fz={14} c="dimmed">
        [ {post.character} ]
      </Text>
    ) : null;

  const teamChars = (post.characters ?? []).filter((c) => c.pokemon?.length);
  const hasSig =
    !!post.signature && post.signature.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasFooter = hasSig || teamChars.length > 0;

  const signature = hasSig ? (
    <Box style={{ flex: 1, minWidth: 220 }}>
      <Text
        fz={14}
        c="#b6b1bc"
        style={{ width: "100%", overflowWrap: "break-word", lineHeight: 1.6 }}
        className="forum-post-body"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.signature!) }}
      />
    </Box>
  ) : null;

  const teams =
    teamChars.length > 0 ? (
      <Flex gap={20} wrap="wrap" justify={isOverSm ? "flex-end" : "flex-start"}>
        {teamChars.map((c) => (
          <CharacterTeam key={c.id} character={c} />
        ))}
      </Flex>
    ) : null;

  const footer = hasFooter ? (
    <Box mt={isOverSm ? 22 : 0} pt={isOverSm ? 16 : 12} style={{ borderTop: "1px solid #3a3550" }}>
      {isOverSm ? (
        <Flex align="flex-end" justify="space-between" gap={20} wrap="wrap">
          {signature}
          {teams}
        </Flex>
      ) : (
        <Stack gap={14}>
          {signature}
          {teams}
        </Stack>
      )}
    </Box>
  ) : null;

  const bodyColumn = (
    <>
      {legacyChar}
      {body}
      <GameBlocks post={post} />
      <PostFooterNote post={post} />
      {footer}
    </>
  );

  // Desktop: left author rail + right body column.
  if (isOverSm) {
    return (
      <Box
        id={props.anchorId}
        bg="#282727"
        style={{ border: "1px solid #2a2637", display: "flex", overflow: "hidden" }}
      >
        <Box
          style={{
            flex: "none",
            width: 170,
            background: "#1f1e1e",
            borderRight: "1px solid #2a2637",
            padding: "22px 18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <Avatar
            src={post.avatar || undefined}
            alt={`${post.owner ?? "User"} avatar`}
            size={72}
            radius="xl"
            style={{ border: "2px solid #772976" }}
          />
          <AuthorPopover post={post} forum={forum} threadId={threadId} />
          {badges.length > 0 && (
            <Group gap={5} justify="center">
              {badges}
            </Group>
          )}
        </Box>
        <Box style={{ flex: 1, minWidth: 0, padding: "24px 28px" }}>
          <Flex justify="space-between" align="center" gap={14} mb={14}>
            {timeText}
            {editBtn}
          </Flex>
          {bodyColumn}
        </Box>
      </Box>
    );
  }

  // Mobile: stacked header + body.
  return (
    <Box
      id={props.anchorId}
      bg="#282727"
      p={16}
      style={{ border: "1px solid #2a2637", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <Flex align="center" gap={12} pb={12} style={{ borderBottom: "1px solid #3a3550" }}>
        <Avatar
          src={post.avatar || undefined}
          alt={`${post.owner ?? "User"} avatar`}
          size={44}
          radius="xl"
          style={{ border: "2px solid #772976", flex: "none" }}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <AuthorPopover post={post} forum={forum} threadId={threadId} />
          {badges.length > 0 && (
            <Group gap={5} mt={4}>
              {badges}
            </Group>
          )}
        </Box>
        <Box style={{ flex: "none" }}>{timeText}</Box>
      </Flex>
      {editBtn && <Box style={{ alignSelf: "flex-start" }}>{editBtn}</Box>}
      {bodyColumn}
    </Box>
  );
}

/**
 * ~10px note under a post: the abbreviated stats the team earned this post
 * (hover each for its full name) plus any active encounter/boss. Stats that are
 * maxed out for the whole team are omitted server-side.
 */
function PostFooterNote(props: { post: ForumPost }) {
  const { post } = props;
  const xp = post.xpEarned;
  const stats: Array<{ abbr: string; full: string; value: number }> = [];
  if ((xp?.experience ?? 0) > 0) stats.push({ abbr: "exp", full: "Experience", value: xp!.experience! });
  if ((xp?.friendship ?? 0) > 0) stats.push({ abbr: "frn", full: "Friendship points", value: xp!.friendship! });
  if ((xp?.shadow ?? 0) > 0) stats.push({ abbr: "shd", full: "Shadow points", value: xp!.shadow! });
  if ((xp?.purification ?? 0) > 0)
    stats.push({ abbr: "prf", full: "Purification points", value: xp!.purification! });

  const flags: string[] = [];
  if ((post.blocks?.encounters?.length ?? 0) > 0) flags.push("encounter active");
  if (post.blocks?.boss) flags.push("boss battle active");
  if (!stats.length && !flags.length) return null;

  return (
    <Group gap={5} mt={10} wrap="wrap" align="center">
      {stats.map((s, i) => (
        <React.Fragment key={s.abbr}>
          {i > 0 && (
            <Text fz={14} c="dimmed">
              |
            </Text>
          )}
          <Tooltip label={s.full} withArrow openDelay={100}>
            <Text fz={14} c="dimmed" style={{ cursor: "help" }}>
              {s.value} {s.abbr}
            </Text>
          </Tooltip>
        </React.Fragment>
      ))}
      {flags.length > 0 && (
        <Text fz={14} c="grape.4" ml={stats.length ? 4 : 0}>
          {flags.join("  ·  ")}
        </Text>
      )}
      {stats.length > 0 && (
        <Anchor component={Link} to={SHADOW_GUIDE_LINK} fz={14} c="dimmed" ml={2}>
          (guide)
        </Anchor>
      )}
    </Group>
  );
}
