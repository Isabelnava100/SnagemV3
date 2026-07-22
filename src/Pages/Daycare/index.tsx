import { Box, Container, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { OwnedPokemon } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { SnagIcon } from "../../icons/SnagIcon";
import { clickable } from "../../lib/a11y";
import { canBreed, eggGroupsForDex } from "../../lib/eggGroups";
import useMediaQuery from "../../hooks/useMediaQuery";
import { getOwnedPokemons } from "../../queries/dashboard";
import {
  DEFAULT_BATTLE_MECHANICS,
  callBreedPokemon,
  callHatchEgg,
  getBattleConfig,
  getDaycare,
} from "../../queries/game";

const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const CYAN = "#12B7B6";
const RED = "#E54156";
const GOLD = "#FFD074";
const MUTE = "#6f6a78";

const genderColor = (g?: string) => (g === "M" ? "#4dabf7" : g === "F" ? RED : "#b6b1bc");
const nameOf = (p?: OwnedPokemon | null) => (p ? p.species || p.name : "");
const isDitto = (p?: OwnedPokemon | null) =>
  !!p && (String(p.pokedex) === "132" || (p.species || "").toLowerCase() === "ditto");

type Verdict = { ok: boolean; title: string; body: string };

/**
 * The Daycare (breeding station). Leave one pair; if they get along an egg is
 * ready after mechanics.hatchPosts qualifying posts OR mechanics.hatchDays
 * days, whichever comes first (both admin-editable). Parents are compatible
 * when they are male + female sharing a non-Undiscovered egg group, or when
 * one is a Ditto (the universal partner); the hatchling is the base form of
 * the mother's (or non-Ditto parent's) line.
 */
export default function Daycare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOverSm } = useMediaQuery();
  const [leftId, setLeftId] = React.useState<string | null>(null);
  const [rightId, setRightId] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState<"left" | "right" | null>("left");
  const [message, setMessage] = React.useState("");

  const { data: owned, isPending } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: daycare } = useQuery({
    queryKey: ["daycare", user?.uid],
    queryFn: () => getDaycare(user!.uid),
    enabled: !!user,
  });
  const { data: cfg } = useQuery({ queryKey: ["battle-config"], queryFn: getBattleConfig, enabled: !!user });
  const mech = cfg?.mechanics ?? DEFAULT_BATTLE_MECHANICS;
  const hatchDays = mech.hatchDays ?? 15;
  const hatchPosts = mech.hatchPosts;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["daycare", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
  };
  const breed = useMutation({
    mutationFn: () => callBreedPokemon(leftId!, rightId!),
    onSuccess: () => {
      setMessage("The pair settled in. Come back when the egg is ready!");
      setLeftId(null);
      setRightId(null);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "They did not get along."),
  });
  const hatch = useMutation({
    mutationFn: callHatchEgg,
    onSuccess: (name) => {
      setMessage(`The egg hatched into ${name}!`);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "The egg is not ready yet."),
  });

  if (!user) return null;
  if (isPending) return <SectionLoader />;
  const box = owned?.sortedData ?? [];
  const pokeOf = (id: string | null | undefined) => box.find((p) => p.id === id);

  const running = !!daycare?.active;
  const leftPoke = running ? pokeOf(daycare?.leftId) : pokeOf(leftId);
  const rightPoke = running ? pokeOf(daycare?.rightId) : pokeOf(rightId);
  const leftName = leftPoke ? nameOf(leftPoke) : daycare?.leftName;
  const rightName = rightPoke ? nameOf(rightPoke) : daycare?.rightName;

  // Verdict engine: reject cannot-breed (legendary / no egg group) and, for two
  // ordinary parents, reject same-gender or a missing shared egg group. A Ditto
  // is the universal partner and always accepts. Advisory in the UI; the server
  // stays the final authority when START THE CLOCK fires callBreedPokemon.
  const verdict = (l?: OwnedPokemon | null, r?: OwnedPokemon | null): Verdict | null => {
    if (!l || !r) return null;
    const lDitto = isDitto(l);
    const rDitto = isDitto(r);
    if (!canBreed(l.pokedex) && !lDitto)
      return {
        ok: false,
        title: "PAIR REJECTED · CANNOT BREED",
        body: `${nameOf(l)} has no egg group, so it can never breed. Swap it out for something with an egg group.`,
      };
    if (!canBreed(r.pokedex) && !rDitto)
      return {
        ok: false,
        title: "PAIR REJECTED · CANNOT BREED",
        body: `${nameOf(r)} has no egg group, so it can never breed. Swap it out for something with an egg group.`,
      };
    if (lDitto || rDitto)
      return {
        ok: true,
        title: "PAIR ACCEPTED",
        body: `Ditto is the universal partner. Start the clock and the Egg appears in ${hatchDays} days or ${hatchPosts} posts.`,
      };
    if (l.gender === r.gender)
      return {
        ok: false,
        title: "PAIR REJECTED · SAME GENDER",
        body: "You need a male and a female (or a Ditto). These two will just sit there trading stories.",
      };
    const lg = eggGroupsForDex(l.pokedex);
    const rg = eggGroupsForDex(r.pokedex);
    const shared = lg.find((g) => rg.includes(g));
    if (!shared)
      return {
        ok: false,
        title: "PAIR REJECTED · EGG GROUPS",
        body: `${nameOf(l)} (${lg.join(" / ")}) and ${nameOf(r)} (${rg.join(" / ")}) don't share an egg group.`,
      };
    return {
      ok: true,
      title: "PAIR ACCEPTED",
      body: `${nameOf(l)} and ${nameOf(r)} share the ${shared} egg group. Start the clock and the Egg appears in ${hatchDays} days or ${hatchPosts} posts.`,
    };
  };

  const v = running ? null : verdict(leftPoke, rightPoke);
  const positive = running || (!!v && v.ok);
  const pairAccent = positive ? CYAN : v ? RED : MUTE;
  const pairText = running ? "CLOCK RUNNING" : v ? (v.ok ? "PAIR READY" : "NOT COMPATIBLE") : "PICK A PAIR";
  const showVerdict = running || !!v;

  /** One dashed parent slot (empty or filled). */
  const parentSlot = (side: "left" | "right", poke?: OwnedPokemon | null, name?: string) => {
    const active = picking === side && !running;
    const filled = !!poke || !!name;
    const open = () => !running && setPicking(side);
    return (
      <Box
        {...(running ? {} : clickable(open))}
        aria-label={filled ? `Change the ${side} parent` : `Choose the ${side} parent`}
        style={{
          minHeight: 218,
          padding: "34px 24px",
          background: active ? "#17151c" : "#141318",
          border: `2px dashed ${active ? "#7E2C75" : "#3a3550"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          textAlign: "center",
          cursor: running ? "default" : "pointer",
        }}
      >
        <Text fz={12} fw={700} c={MUTE} tt="uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.3em" }}>
          Parent · {side}
        </Text>
        {filled ? (
          <>
            {poke && (
              <img
                src={getPokemonImageURL(poke.image_slug, poke.shiny)}
                alt={`${nameOf(poke)} sprite`}
                width={72}
                height={72}
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <Text fz={20} fw={700} c="white" style={{ fontFamily: DISPLAY, letterSpacing: "0.03em" }}>
              {poke ? nameOf(poke) : name}{" "}
              {poke && (
                <Text span c={genderColor(poke.gender)}>
                  {poke.gender}
                </Text>
              )}
            </Text>
            {poke && (
              <Text fz={12} fw={700} c="#c79bd6" tt="uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.2em" }}>
                Egg group · {eggGroupsForDex(poke.pokedex).join(" / ")}
              </Text>
            )}
            {!running && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (side === "left") setLeftId(null);
                  else setRightId(null);
                  setPicking(side);
                }}
                style={{
                  marginTop: 4,
                  background: "none",
                  border: "1px solid #3a3550",
                  color: "#b6b1bc",
                  fontFamily: DISPLAY,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "7px 16px",
                  cursor: "pointer",
                  clipPath: "polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)",
                }}
              >
                REMOVE
              </button>
            )}
          </>
        ) : (
          <>
            <SnagIcon name="pokeball" size={44} cut="#141318" title="Empty slot" style={{ opacity: 0.7 }} />
            <Text fz={20} fw={700} c="white" style={{ fontFamily: DISPLAY, letterSpacing: "0.03em" }}>
              Leave a Pokemon
            </Text>
            <Text fz={14} c={MUTE}>
              Pick from your box
            </Text>
          </>
        )}
      </Box>
    );
  };

  const centerPill = (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        alignSelf: "center",
        justifySelf: "center",
      }}
    >
      <Text
        fz={13}
        fw={700}
        tt="uppercase"
        c={pairAccent}
        style={{
          fontFamily: DISPLAY,
          letterSpacing: "0.18em",
          padding: "10px 22px",
          border: `1px solid ${positive ? "#1f6f7a" : v ? RED : "#3a3550"}`,
          background: positive ? "rgba(18,183,182,.08)" : v ? "rgba(229,65,86,.08)" : "#141318",
          clipPath: "polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          whiteSpace: "nowrap",
        }}
      >
        {pairText}
      </Text>
      {running && (
        <Group gap={6} align="center">
          <SnagIcon name="egg" size={22} cut="#141318" title="Egg incubating" />
          <Text fz={12} c={MUTE}>
            Egg incoming
          </Text>
        </Group>
      )}
    </Box>
  );

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title="The Daycare | Snagem Guild" />
      <PageHero
        eyebrow="Breeding · One pair at a time"
        eyebrowColor="pink.0"
        title="The Daycare"
        subtitle={`Drop one Pokemon in each slot: a male and a female sharing an egg group, or ANYTHING paired with a Ditto (species with no egg group breed only with Ditto). Only 7-star legendaries and mythicals can never breed. The Egg appears after ${hatchDays} days or ${hatchPosts} posts, whichever comes first.`}
        aside={
          <Box
            px={24}
            py={18}
            style={{
              background: "rgba(20,19,24,.6)",
              border: "1px solid #3a3550",
              clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)",
            }}
          >
            <Text fz={12} fw={700} c={MUTE} tt="uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.24em" }}>
              Egg timer
            </Text>
            <Text fz={22} fw={700} c={GOLD} mt={4} style={{ fontFamily: DISPLAY }}>
              {hatchDays} days or {hatchPosts} posts
            </Text>
            <Text fz={13} c="#b6b1bc" mt={2}>
              whichever comes first
            </Text>
          </Box>
        }
        mb={24}
      />

      {message && (
        <Text fz={14} c="gold.1" mb={16} role="status" aria-live="polite">
          {message}
        </Text>
      )}

      <Stack gap={20}>
        {/* Two dashed parent slots with the centre status pill. */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: isOverSm ? "1fr auto 1fr" : "1fr",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          {parentSlot("left", leftPoke, leftName)}
          {centerPill}
          {parentSlot("right", rightPoke, rightName)}
        </Box>

        {/* Colored verdict bar. */}
        {showVerdict && (
          <Box
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              padding: "20px 24px",
              background: positive ? "#14252a" : "#2a1a1e",
              border: `1px solid ${positive ? "#1f6f7a" : RED}`,
              clipPath: "polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)",
            }}
          >
            <Box style={{ flex: "1 1 260px", minWidth: 0 }}>
              <Text fz={14} fw={700} tt="uppercase" c={positive ? CYAN : RED} style={{ fontFamily: DISPLAY, letterSpacing: "0.16em" }}>
                {running ? "EGG INCUBATING" : v!.title}
              </Text>
              <Text fz={14} c="#b6b1bc" mt={4} lh={1.5}>
                {running
                  ? `The pair is settled in. Check back in ${hatchDays} days or after ${hatchPosts} posts, whichever comes first.`
                  : v!.body}
              </Text>
            </Box>
            {running ? (
              <button
                type="button"
                disabled={hatch.isPending}
                onClick={() => hatch.mutate()}
                style={ctaStyle(hatch.isPending)}
              >
                {hatch.isPending ? "CHECKING…" : "CHECK THE EGG →"}
              </button>
            ) : (
              v!.ok && (
                <button
                  type="button"
                  disabled={breed.isPending || !leftId || !rightId}
                  onClick={() => breed.mutate()}
                  style={ctaStyle(breed.isPending || !leftId || !rightId)}
                >
                  {breed.isPending ? "STARTING…" : "START THE CLOCK →"}
                </button>
              )
            )}
          </Box>
        )}

        {daycare?.lastHatched && !running && (
          <Text fz={13} c="dimmed">
            Last hatched here: {daycare.lastHatched}.
          </Text>
        )}

        {/* Box picker: pick the parent for the active slot. */}
        {picking && !running && (
          <Box
            style={{
              background: "#141318",
              border: "1px solid #2a2637",
              padding: "24px 24px",
              clipPath: "polygon(0 0,100% 0,100% 100%,22px 100%,0 calc(100% - 22px))",
            }}
          >
            <Group justify="space-between" mb={16} wrap="nowrap">
              <Text component="h2" fz={20} fw={700} c="white" style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}>
                Your box · choose the {picking} parent
              </Text>
              <button
                type="button"
                onClick={() => setPicking(null)}
                style={{
                  background: "none",
                  border: "1px solid #3a3550",
                  color: "#b6b1bc",
                  fontFamily: DISPLAY,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "8px 18px",
                  cursor: "pointer",
                  clipPath: "polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)",
                  flexShrink: 0,
                }}
              >
                CLOSE
              </button>
            </Group>
            {box.length === 0 ? (
              <Text fz={14} c="dimmed">
                Your box is empty. Catch a Pokemon in the forums first, then come back to breed a pair.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="sm">
                {box.map((p) => {
                  const used = p.id === leftId || p.id === rightId;
                  const cannot = !canBreed(p.pokedex) && !isDitto(p);
                  const tag = cannot ? "CANNOT BREED" : used ? "IN A SLOT" : "AVAILABLE";
                  const tagColor = cannot ? RED : used ? GOLD : CYAN;
                  const pick = () => {
                    if (used) return;
                    if (picking === "left") setLeftId(p.id);
                    else setRightId(p.id);
                    setPicking(picking === "left" ? "right" : null);
                    setMessage("");
                  };
                  return (
                    <Box
                      key={p.id}
                      {...clickable(pick)}
                      aria-label={`Pick ${nameOf(p)}`}
                      style={{
                        background: "#1b1a1e",
                        border: `1px solid ${used ? "#7E2C75" : "#2a2637"}`,
                        padding: "16px 12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        textAlign: "center",
                        cursor: used ? "default" : "pointer",
                        opacity: cannot ? 0.6 : 1,
                      }}
                    >
                      <img
                        src={getPokemonImageURL(p.image_slug, p.shiny)}
                        alt={`${nameOf(p)} sprite`}
                        width={56}
                        height={56}
                        style={{ imageRendering: "pixelated" }}
                      />
                      <Text fz={15} fw={700} c="white" lineClamp={1}>
                        {nameOf(p)}{" "}
                        <Text span c={genderColor(p.gender)}>
                          {p.gender ?? ""}
                        </Text>
                      </Text>
                      <Text fz={11} fw={700} c={MUTE} tt="uppercase" ta="center" style={{ fontFamily: DISPLAY, letterSpacing: "0.14em" }}>
                        {eggGroupsForDex(p.pokedex).join(" / ")}
                      </Text>
                      <Text fz={11} fw={700} c={tagColor} tt="uppercase" style={{ fontFamily: DISPLAY, letterSpacing: "0.14em" }}>
                        {tag}
                      </Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>
        )}
      </Stack>
    </Container>
  );
}

/** Angled gradient CTA (START THE CLOCK / CHECK THE EGG), disabled-dimmed. */
function ctaStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: "none",
    fontFamily: DISPLAY,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#fff",
    background: "linear-gradient(90deg,#7E2C75,#E54156)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    padding: "14px 26px",
    clipPath: "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)",
  };
}
