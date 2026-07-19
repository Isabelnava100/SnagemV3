import { Badge, Box, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { STAR_FLEE_CHANCE, STAR_POSTS_TO_BEAT, maxHpForLevel } from "../../lib/encounterStars";
import { ALL_TYPES, typeEffectiveness } from "../../lib/typeChart";
import { DEFAULT_BATTLE_CONFIG, getBattleConfig } from "../../queries/game";
import { useAuth } from "../../context/AuthContext";

/**
 * Library wing: how posting and battling works. One page that explains the
 * whole battle loop members play through the forum: stars, posts-to-beat,
 * damage, HP, healing, run-away, type effectiveness, team lock, and what
 * happens on a team wipe. Tables read the LIVE admin config where one exists
 * (Battle Costs), so this page never drifts from the real numbers.
 */

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Title order={3} c="white" size={22} fw={600}>
        {props.title}
      </Title>
      <Box c="rgba(255,255,255,0.75)" fz={16} style={{ lineHeight: 1.7 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

const STARS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function BattleGuideTab() {
  const { user } = useAuth();
  // Live numbers when signed in; the shipped defaults for visitors.
  const { data } = useQuery({
    queryKey: ["battle-config"],
    queryFn: getBattleConfig,
    enabled: !!user,
  });
  const cfg = data ?? DEFAULT_BATTLE_CONFIG;

  return (
    <Stack gap={20}>
      <Section title="How battling works">
        <Text>
          Battles play out through your posts. When you roll or choose an
          encounter, each qualifying post you write wears its health bar down by
          one hit (scaled by type effectiveness, below). Your pokemon always
          strikes first: if your post finishes the enemy off, it never hits you
          back. Otherwise the enemy strikes your chosen fighter, dealing flat
          damage based on its star rating. When the enemy's bar is empty it is
          beaten; you can then throw a ball to catch it, or move on.
        </Text>
      </Section>

      <Section title="Stars: posts to beat, run-away, damage">
        <Text mb={8}>
          Every species has a star rating from 1 to 7 (shown in the Pokedex wing):
          6 star is the pseudo-legendary class, 7 star is legendaries and
          mythicals. The star sets everything about fighting it. Bosses cannot be
          fled, and neither can a trainer's Pokemon (those also cannot be caught;
          beat them to end the battle).
        </Text>
        <ScrollArea type="auto">
          <Table withTableBorder withColumnBorders fz={14} miw={480}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Star</Table.Th>
                <Table.Th>Posts to beat</Table.Th>
                <Table.Th>Run-away success</Table.Th>
                <Table.Th>Attack damage per post</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {STARS.map((s) => (
                <Table.Tr key={s}>
                  <Table.Td>{"★".repeat(s)}</Table.Td>
                  <Table.Td>{STAR_POSTS_TO_BEAT[s]}</Table.Td>
                  <Table.Td>{STAR_FLEE_CHANCE[s]}%</Table.Td>
                  <Table.Td>{cfg.starDamage[String(s)]}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Text mt={8} fz={14} c="dimmed">
          A boss deals its species&apos; star damage unless the host set a custom
          value for that battle. A failed run-away wastes your turn: you land no
          damage and the enemy still hits you.
        </Text>
      </Section>

      <Section title="Your pokemon's health">
        <Text>
          Max HP is level-based: {cfg.hp.base} HP at level 1, +{cfg.hp.low} per
          level up to level {cfg.hp.split}, then +{cfg.hp.high} per level after
          that (level 100 = {maxHpForLevel(100, cfg.hp)} HP). Damage sticks for
          the whole thread; at zero HP the pokemon faints and cannot fight again
          in that thread. Your fighter&apos;s health bar draws with as many
          segments as its own star&apos;s posts-to-beat.
        </Text>
        <Text mt={6}>
          Healing items work mid-battle and apply before the enemy&apos;s hit:
          Potion +20, Super Potion +40, Hyper Potion +60, Max Potion and Full
          Restore heal fully. Revive restores a fainted pokemon to half HP, Max
          Revive to full. Potions go to your fighter; revives go to your first
          fainted pokemon.
        </Text>
      </Section>

      <Section title="Type effectiveness">
        <Text mb={8}>
          Matchups use pokemon TYPES, not moves. Your posts&apos; damage against
          the enemy and the enemy&apos;s hits on your fighter are both scaled by
          the attacker-vs-defender matchup, capped between x0.5 and x2 (a Fire
          pokemon attacking a Water one works at x0.5; Water attacking Fire hits
          at x2). For dual types the multipliers combine; your fighter leads with
          its best matchup. The composer shows both multipliers before you post.
        </Text>
        <ScrollArea type="auto">
          <Table withTableBorder withColumnBorders fz={14} miw={720}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Atk \ Def</Table.Th>
                {ALL_TYPES.map((t) => (
                  <Table.Th key={t}>{t.slice(0, 3)}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ALL_TYPES.map((atk) => (
                <Table.Tr key={atk}>
                  <Table.Td fw={700}>{atk.slice(0, 3)}</Table.Td>
                  {ALL_TYPES.map((def) => {
                    const m = typeEffectiveness([atk], [def]);
                    return (
                      <Table.Td
                        key={def}
                        ta="center"
                        c={m > 1 ? "green.0" : m < 1 ? "pink.0" : "dimmed"}
                        fw={m !== 1 ? 700 : 400}
                      >
                        {m === 1 ? "" : m}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Group gap={8} mt={6}>
          <Badge color="cyan" variant="light" size="sm">
            2 = super effective
          </Badge>
          <Badge color="pink" variant="light" size="sm">
            0.5 = not very effective (immunities count as 0.5 here)
          </Badge>
        </Group>
      </Section>

      <Section title="STAB, critical hits, and natures">
        <Text>
          Attacking with your own typing always earns the same-type attack bonus:
          every strike is boosted x{cfg.mechanics.stab}. Both sides can land a
          critical hit ({cfg.mechanics.critChance}% chance) for x
          {cfg.mechanics.critMult} damage. Every pokemon also has one of 25
          natures, assigned when it is caught or hatched: an attack nature adds{" "}
          {cfg.mechanics.natureEffect}% to your strikes, a defense nature shaves{" "}
          {cfg.mechanics.natureEffect}% off incoming hits, and a speed nature adds{" "}
          {cfg.mechanics.natureEffect}% to run-away rolls. Neutral natures do
          nothing. All of these numbers are staff-tunable.
        </Text>
      </Section>

      <Section title="Status conditions">
        <Text>
          A surviving enemy&apos;s hit has a {cfg.mechanics.statusChance}% chance
          to inflict a status flavored by its typing: burn (Fire types), poison
          (Poison and Bug), or paralysis (Electric). Burn and poison deal{" "}
          {cfg.mechanics.statusTick} extra damage to your fighter each battle
          post; paralysis scales your attack progress by x
          {cfg.mechanics.paralysisMult}. Cures work in-post from
          Use Items: Burn Heal, Antidote, Paralyze Heal, or a Full Heal / Full
          Restore for anything. A status also clears when the pokemon faints or
          the thread ends.
        </Text>
      </Section>

      <Section title="Weather">
        <Text>
          Hosts can set the weather when creating a thread: sun, rain, sandstorm,
          or snow. Favored types (for example Fire in sun, Water in rain) attack
          at x{cfg.mechanics.weatherBoost}; disfavored types are weakened by the
          same amount. Weather lasts the whole thread.
        </Text>
      </Section>

      <Section title="Catching: ball odds">
        <Text>
          Throwing a ball at a beaten wild pokemon is a percentage roll based on
          the ball&apos;s tier, plus a +{cfg.mechanics.ballWornBonus}% worn-down
          bonus for fully beating it first (capped at 95%; a Master Ball never
          fails). A miss spends the ball but the pokemon stays beaten, so you can
          throw again next post.
        </Text>
      </Section>

      <Section title="The Pokemon Center">
        <Text>
          Mid-thread you can visit the Pokemon Center from the composer&apos;s
          Battle panel: for {cfg.mechanics.centerCost} Snag Coins the nurse fully
          heals your whole team on that thread and cures every status. Fainted
          pokemon wake up too.
        </Text>
      </Section>

      <Section title="The Daycare and the Trading Station">
        <Text>
          The Daycare (main nav) takes one pair at a time: two pokemon that share
          a type, share a species, or include a Ditto. Their egg is ready after{" "}
          {cfg.mechanics.hatchDays} days or {cfg.mechanics.hatchPosts} qualifying
          posts, whichever comes first, and hatches into the base form of the
          non-Ditto parent&apos;s line. The Trading Station handles the only way
          a pokemon changes trainers: a pokemon-for-pokemon swap, proposed and
          accepted by both sides.
        </Text>
      </Section>

      <Section title="Team lock">
        <Text>
          On normal roleplay threads you are locked to the team you bring in your
          first post: later posts show that team read-only, everyone earns XP on
          it, and it is the pool your fighters come from. Hosts can allow team
          changes for a thread, but only when creating it. If your whole locked
          team faints and other members are in the thread, your lock lifts so you
          can bring a fresh team (you re-lock to it).
        </Text>
      </Section>

      <Section title="Team wipes and paused threads">
        <Text>
          If your whole team faints on a thread where you are playing alone, the
          thread pauses: no new posts until a staff member decides how it
          continues. They can revive your team and resume, resume with the damage
          kept (so you recover with potions and revives), or close the thread as
          a loss, where the reward review decides what, if anything, is earned.
        </Text>
      </Section>

      <Section title="Missions and required targets">
        <Text>
          Mission threads list their set foes in a pinned Mission Targets
          checklist. Beat (or catch) each one; the thread cannot be closed for
          grading until every target is down. Everything you use along the way
          (balls, potions, berries) is tallied for the reviewer.
        </Text>
      </Section>
    </Stack>
  );
}
