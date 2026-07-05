import {
  Avatar,
  Badge,
  Box,
  Card,
  Flex,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import DOMPurify from "dompurify";
import React from "react";
import { Link } from "react-router-dom";
import { getColor1, getColor2 } from "../../../components/user-forum/getColorBadges";
import { useAuth } from "../../../context/AuthContext";
import { itemData } from "../../../data/item";
import { getItemImageURL, getPokemonImageURL } from "../../../helpers";
import { ForumPost, PostCharacter, formatFireTime } from "../types";
import { ForumTextLink, GameResultText } from "./ui";

/** Character avatar + name + party sprite row; the strip row scrolls on overflow. */
function CharacterStrip(props: { character: PostCharacter }) {
  const { character } = props;
  return (
    <Flex
      align="center"
      gap={10}
      p={8}
      bg="#3C3A3C"
      style={{ borderRadius: 10, flexShrink: 0 }}
    >
      <Avatar
        src={character.imageURL || undefined}
        alt={`${character.name ?? "Character"} avatar`}
        size={54}
        radius="xl"
      />
      <Stack gap={4}>
        <Text fz={14} c="white" fw={500}>
          {character.name}
        </Text>
        <Group gap={4} wrap="nowrap">
          {character.pokemon.slice(0, 6).map((p) => (
            <Avatar
              key={p.slug}
              src={getPokemonImageURL(p.slug)}
              alt={p.name}
              title={p.name}
              size={28}
              radius="xl"
              bg="#2b2a2b"
            />
          ))}
        </Group>
      </Stack>
    </Flex>
  );
}

/** Clicking a user opens a small profile card with avatar and links (board 10). */
function AuthorPopover(props: {
  post: ForumPost;
  forum: string;
  threadId: string;
}) {
  const { post } = props;
  return (
    <Popover width={190} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <Text
          fz={15}
          fw={600}
          c="white"
          component="span"
          style={{ cursor: "pointer" }}
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
            <Text fz={13} fw={600} c="white">
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

/** Pink in-post result blocks: encounters, items used, dice, randoms, boss. */
export function GameBlocks(props: { post: ForumPost }) {
  const { blocks } = props.post;
  if (!blocks) return null;
  const cards: React.ReactNode[] = [];

  if (blocks.boss && props.post.type === "user") {
    cards.push(
      <Flex key="boss" align="center" gap={8} p={10} bg="#332f33" style={{ borderRadius: 8 }}>
        <GameResultText>
          A boss encounter is present in this post... it&apos;s a {blocks.boss.name}!
        </GameResultText>
        <Avatar
          src={getPokemonImageURL(blocks.boss.slug)}
          alt={`${blocks.boss.name} sprite`}
          size={40}
          radius="xl"
        />
      </Flex>
    );
  }
  blocks.encounters?.forEach((enc, i) => {
    cards.push(
      <Flex key={`enc${i}`} align="center" gap={8} p={10} bg="#332f33" style={{ borderRadius: 8 }}>
        <GameResultText>
          {enc.mode === "roll"
            ? `A pokemon has been encountered... it's a ${enc.name}!`
            : `An encounter has been chosen... it's a ${enc.name}!`}
          {!enc.catchable && " (It cannot be caught.)"}
        </GameResultText>
        <Avatar
          src={getPokemonImageURL(enc.slug)}
          alt={`${enc.name} sprite`}
          size={36}
          radius="xl"
        />
      </Flex>
    );
  });
  blocks.itemsUsed?.forEach((item, i) => {
    // Resolve the display name + sprite from the canonical catalog by id so
    // older posts (stored with raw slug names) show the full name too.
    const catalog = itemData.find((c) => c.id === item.itemId);
    const itemName = catalog?.name ?? item.name;
    const itemFilePath = catalog?.filePath ?? item.filePath;
    cards.push(
      <Flex key={`item${i}`} align="center" gap={8} p={10} bg="#332f33" style={{ borderRadius: 8 }}>
        <Avatar src={getItemImageURL(itemFilePath)} alt={itemName} size={28} />
        <Stack gap={2}>
          <GameResultText>
            {item.qty > 1 ? `${item.qty}x ` : "A "}
            {itemName} has been used...
            {item.caughtPokemon && ` it successfully caught the ${item.caughtPokemon}!`}
          </GameResultText>
          {item.note && (
            <Text fz={12} c="gray.4">
              {item.note}
            </Text>
          )}
        </Stack>
      </Flex>
    );
  });
  blocks.dice?.forEach((d, i) => {
    cards.push(
      <Box key={`dice${i}`} p={10} bg="#332f33" style={{ borderRadius: 8 }}>
        <GameResultText>
          {d.count === 1
            ? `A D${d.sides} has been rolled... the result is ${d.results[0]}!`
            : `${d.count} D${d.sides} have been rolled... the results are ${d.results.join(", ")}!`}
        </GameResultText>
      </Box>
    );
  });
  blocks.randoms?.forEach((r, i) => {
    cards.push(
      <Box key={`rand${i}`} p={10} bg="#332f33" style={{ borderRadius: 8 }}>
        <GameResultText>
          A random number between {r.min} and {r.max} was generated... the result is {r.result}!
        </GameResultText>
      </Box>
    );
  });

  if (!cards.length) return null;
  return (
    <Flex gap={8} wrap="wrap" mt={10}>
      {cards}
    </Flex>
  );
}

/** In-stream announcement card when the host starts or ends a boss battle. */
function BossAnnouncement(props: { post: ForumPost }) {
  const { post } = props;
  const boss = post.blocks?.boss;
  if (!boss) return null;
  const starting = post.type === "boss_start";
  return (
    <Box p={16} mt={10} bg="#332f33" style={{ borderRadius: 10 }}>
      <Flex align="center" gap={12}>
        <Avatar
          src={getPokemonImageURL(boss.slug)}
          alt={`${boss.name} sprite`}
          size={64}
          radius="xl"
        />
        <Stack gap={4}>
          <GameResultText>
            {starting
              ? `A boss has appeared... it's a ${boss.name}!`
              : `The boss battle against ${boss.name} has ended!`}
          </GameResultText>
          {starting && post.text && (
            <Text
              fz={13}
              c="gray.3"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.text) }}
            />
          )}
        </Stack>
      </Flex>
    </Box>
  );
}

export default function PostCard(props: {
  post: ForumPost;
  forum: string;
  threadId: string;
  anchorId?: string;
}) {
  const { post, forum, threadId } = props;
  const { user } = useAuth();
  const isSystem = post.type === "boss_start" || post.type === "boss_end";
  const canEdit =
    !isSystem && !!user && (post.ownerUid ? post.ownerUid === user.uid : false);

  return (
    <Card id={props.anchorId} withBorder radius="md" bg="#2b2a2b" mt={12} p={0}>
      {/* header bar */}
      <Flex
        justify="space-between"
        align="center"
        px={14}
        py={8}
        bg="#3C3A3C"
        gap={8}
        wrap="wrap"
      >
        <Group gap={8}>
          <Avatar
            src={post.avatar || undefined}
            alt={`${post.owner ?? "User"} avatar`}
            size={26}
            radius="xl"
          />
          <AuthorPopover post={post} forum={forum} threadId={threadId} />
          {(post.badges ?? []).filter(Boolean).map((badge) => (
            <Badge
              key={badge}
              variant="gradient"
              gradient={{ from: getColor1(badge), to: getColor2(badge) }}
              size="sm"
            >
              {badge}
            </Badge>
          ))}
        </Group>
        <Group gap={10}>
          {canEdit && (
            <Badge
              component={Link}
              to={`/Forum/${forum}/thread/${threadId}/edit/${post.id}`}
              variant="gradient"
              gradient={{ from: "#E35C65", to: "#912691" }}
              style={{ cursor: "pointer", textTransform: "none" }}
            >
              Edit ✎
            </Badge>
          )}
          <Text fz={13} fw={600} c="white">
            {formatFireTime(post.timePosted)}
            {post.editedAt ? " (edited)" : ""}
          </Text>
        </Group>
      </Flex>

      <Box px={14} pb={16}>
        {isSystem ? (
          <BossAnnouncement post={post} />
        ) : (
          <>
            {/* character strips: capped height, horizontal scroll on overflow */}
            {!!post.characters?.length && (
              <ScrollArea type="auto" offsetScrollbars mt={10} style={{ maxHeight: 96 }}>
                <Flex gap={10} wrap="nowrap">
                  {post.characters.map((character) => (
                    <CharacterStrip key={character.id} character={character} />
                  ))}
                </Flex>
              </ScrollArea>
            )}
            {!post.characters?.length && post.character && (
              <Text fz={13} c="dimmed" mt={10}>
                [ {post.character} ]
              </Text>
            )}

            <GameBlocks post={post} />

            <Text
              fz={13}
              c="gray.2"
              mt={12}
              style={{ width: "100%", overflowWrap: "break-word" }}
              className="forum-post-body"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.text) }}
            />

            {/* Gaia-style signature: snapshotted at publish, below a divider. */}
            {post.signature && post.signature.replace(/<[^>]*>/g, "").trim().length > 0 && (
              <Box mt={16} pt={10} style={{ borderTop: "1px solid #3C3A3C" }}>
                <Text
                  fz={12}
                  c="gray.5"
                  style={{ width: "100%", overflowWrap: "break-word" }}
                  className="forum-post-body"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.signature) }}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}
