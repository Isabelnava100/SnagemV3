import {
  Avatar,
  Box,
  Flex,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { clickable } from "../../../lib/a11y";
import { isEvolutionItem } from "../../../lib/evolution";
import { EvolveItemModal } from "../../../components/pokemon/EvolveItemModal";
import { getItemImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getItems, getOwnedPokemons } from "../../../queries/dashboard";
import { callApplyMint, getMysteryBoxes } from "../../../queries/game";
import { describeSources, useItemSources } from "../../../lib/itemSources";
import { rarityForItem, RARITY_COLORS, RARITY_LABELS } from "../../../lib/itemRarity";
import { NATURE_GROUPS, NATURE_GROUP_LABEL, NatureGroup } from "../../../lib/natures";
import { toastError, toastSuccess } from "../../../lib/toast";

/**
 * Items tab (moved off the dashboard top block). Categories stack vertically
 * on mobile and lay out in a responsive grid on desktop, no more sideways
 * scrolling. Mystery-box items open the reveal pop-up.
 */
export default function Items() {
  const { user } = useAuth();
  const { isOverLg } = useMediaQuery();
  const { data, isPending: isLoading } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user?.uid as string),
  });
  const { data: boxConfigs } = useQuery({
    queryKey: ["mystery-boxes"],
    queryFn: getMysteryBoxes,
  });
  const [mysteryItem, setMysteryItem] = React.useState<{ id: string; name: string } | null>(null);
  const [evolveItem, setEvolveItem] = React.useState<{ id: string; name: string } | null>(null);
  const [mintItem, setMintItem] = React.useState<{ id: string; name: string } | null>(null);
  // "Get more" line per item, built from the live shops + recipes.
  const sources = useItemSources();

  const isMysteryBox = (itemId: string, name: string, category: string) =>
    !!boxConfigs?.[itemId] || /mystery|box/i.test(name) || /mystery|box/i.test(category);

  if (isLoading) return <SectionLoader />;

  const categories = [...new Set((data ?? []).map((item) => item.category))].sort();

  if (!categories.length) {
    return (
      <EmptyMessage
        title="No items yet"
        description="Earn items by participating in the Forums, completing Missions, buying at the Marketplace or playing Activities. Legacy user? Ask an admin to import your old items."
      />
    );
  }

  return (
    <Stack gap={14}>
      <Title order={2} c="white" size={isOverLg ? 24 : 20} fw={400}>
        Your Items
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing={16}>
        {categories.map((categoryName) => (
          <Box key={categoryName} className="dc-card" p={{ base: 16, sm: 22 }}>
            <Box className="dc-subkicker" mb={16}>
              {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
            </Box>
            <ScrollArea.Autosize mah={320}>
              <SimpleGrid cols={2} spacing={12}>
                {(data ?? [])
                  .filter((item) => item.category === categoryName)
                  .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                  .map((item) => {
                    const box = isMysteryBox(item.id, item.name, item.category);
                    const isMint = !box && item.category === "mint";
                    const evoStone = !box && !isMint && isEvolutionItem(item.name);
                    const interactive = box || evoStone || isMint;
                    // Show the admin's custom box name to players when set.
                    const displayName = boxConfigs?.[item.id]?.name || item.name;
                    const onUse = box
                      ? () => setMysteryItem({ id: item.id, name: displayName })
                      : isMint
                      ? () => setMintItem({ id: item.id, name: item.name })
                      : () => setEvolveItem({ id: item.id, name: item.name });
                    const more = describeSources(sources.get(item.id));
                    return (
                      <Box
                        key={item.id}
                        className="dc-card-tile"
                        p={14}
                        {...(interactive
                          ? {
                              ...clickable(onUse),
                              "aria-label": box ? `Open ${displayName}` : `Use ${item.name}`,
                            }
                          : {})}
                        style={{ cursor: interactive ? "pointer" : undefined }}
                      >
                        <Stack gap={10}>
                          {/* Icon well, per the mockup. */}
                          <Flex
                            align="center"
                            justify="center"
                            h={64}
                            style={{ background: "#0e0d11", border: "1px solid #232028" }}
                          >
                            <Avatar
                              src={getItemImageURL(item.filePath)}
                              alt={displayName}
                              size={40}
                              radius={0}
                            />
                          </Flex>
                          <Flex align="center" justify="space-between" gap={8}>
                            <Text c="white" fz={14} fw={700} lineClamp={1} style={{ minWidth: 0 }}>
                              {displayName}
                            </Text>
                            <Text c="#FFD074" fz={14} fw={700} style={{ flexShrink: 0 }}>
                              ×{item.quantity}
                            </Text>
                          </Flex>
                          {(() => {
                            const r = rarityForItem(item.id);
                            return (
                              <Text
                                fz={10}
                                fw={700}
                                tt="uppercase"
                                c={RARITY_COLORS[r]}
                                style={{ letterSpacing: "0.1em" }}
                                title={RARITY_LABELS[r]}
                              >
                                {r === 0 ? RARITY_LABELS[0] : `${"★".repeat(r)} ${RARITY_LABELS[r]}`}
                              </Text>
                            );
                          })()}
                          {more && (
                            <Text fz={11} c="dimmed" lineClamp={1}>
                              Get more: {more}
                            </Text>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
              </SimpleGrid>
            </ScrollArea.Autosize>
          </Box>
        ))}
      </SimpleGrid>

      <MysteryBoxModal
        item={mysteryItem}
        openable={!!mysteryItem && !!boxConfigs?.[mysteryItem.id]}
        onClose={() => setMysteryItem(null)}
      />
      <EvolveItemModal item={evolveItem} onClose={() => setEvolveItem(null)} />
      <MintModal item={mintItem} onClose={() => setMintItem(null)} />
    </Stack>
  );
}

function MysteryBoxModal(props: {
  item: { id: string; name: string } | null;
  openable: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");

  const openMutation = useMutation({
    mutationFn: async () => {
      const { callOpenMysteryBox } = await import("../../forum/functionsClient");
      return callOpenMysteryBox(props.item!.id);
    },
    onSuccess: ({ reward }) => {
      setResult(`The box pops open... you got ${reward.qty}x ${reward.name}!`);
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-currencies", user?.uid] });
    },
    onError: async (err) => {
      const { callableMessage } = await import("../../forum/functionsClient");
      setError(callableMessage(err, "The box would not open. Try again."));
    },
  });

  const close = () => {
    setResult("");
    setError("");
    props.onClose();
  };

  return (
    <Modal
      opened={!!props.item}
      onClose={close}
      title={<Text fw={700}>{props.item?.name}</Text>}
      centered
      radius={12}
    >
      {result ? (
        <Text fz={16} c="green.0">
          {result}
        </Text>
      ) : (
        <Stack gap={10}>
          <Text fz={16}>Something is rattling inside...</Text>
          {props.openable ? (
            <GradientButtonPrimary
              radius="xl"
              loading={openMutation.isPending}
              onClick={() => openMutation.mutateAsync()}
            >
              Open the Box
            </GradientButtonPrimary>
          ) : (
            <Text fz={14} c="dimmed">
              This box cannot be opened yet. An admin still needs to fill it.
            </Text>
          )}
          {error && (
            <Text fz={14} c="#E54156">
              {error}
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}

/** Derive the nature kind a mint targets from its name. */
function mintKind(name: string): NatureGroup {
  const n = name.toLowerCase();
  if (n.includes("defense")) return "defense";
  if (n.includes("attack") || n.includes("special")) return "attack";
  if (n.includes("speed")) return "speed";
  return "neutral";
}

/** Use a Mint: pick a boxed pokemon and a nature of the mint's kind. */
function MintModal(props: { item: { id: string; name: string } | null; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pokemonId, setPokemonId] = React.useState<string | null>(null);
  const [nature, setNature] = React.useState<string | null>(null);

  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user && !!props.item,
  });

  const kind = props.item ? mintKind(props.item.name) : "neutral";
  const natures = React.useMemo(
    () => Object.entries(NATURE_GROUPS).filter(([, k]) => k === kind).map(([nm]) => nm),
    [kind]
  );
  React.useEffect(() => {
    if (props.item) setNature(natures[0] ?? null);
    else {
      setPokemonId(null);
      setNature(null);
    }
  }, [props.item, natures]);

  const mutation = useMutation({
    mutationFn: () => callApplyMint(pokemonId!, props.item!.id, nature!),
    onSuccess: () => {
      toastSuccess("Nature changed.");
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      props.onClose();
    },
    onError: (e) => toastError(e, "Could not apply the mint."),
  });

  const pokeOptions = (owned?.sortedData ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.gender})`,
  }));

  return (
    <Modal
      opened={!!props.item}
      onClose={props.onClose}
      title={<Text fw={700}>{props.item?.name}</Text>}
      centered
      radius={0}
    >
      <Stack gap={12}>
        <Text fz={14} c="dimmed">
          Pick a pokemon to change its nature. This mint makes it {NATURE_GROUP_LABEL[kind]}.
        </Text>
        <Select
          label="Pokemon"
          placeholder="Pick one"
          searchable
          data={pokeOptions}
          value={pokemonId}
          onChange={setPokemonId}
        />
        <Select
          label="New nature"
          data={natures}
          value={nature}
          onChange={setNature}
        />
        <GradientButtonPrimary
          radius="xl"
          disabled={!pokemonId || !nature}
          loading={mutation.isPending}
          onClick={() => mutation.mutateAsync()}
        >
          Apply Mint
        </GradientButtonPrimary>
      </Stack>
    </Modal>
  );
}
