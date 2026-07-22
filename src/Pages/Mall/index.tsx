import {
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  Image,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconLock, IconRefresh, IconShoppingBag, IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { Link } from "react-router-dom";
import { ItemHoverCard } from "../../components/common/ItemHoverCard";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { isMaster } from "../../lib/permissions";
import { itemData } from "../../data/item";
import { getItemImageURL } from "../../helpers";
import { clickable } from "../../lib/a11y";
import { getCurrencies, getItems, getOwnedPokemons } from "../../queries/dashboard";
import {
  buyShopItem,
  convertCandyToScent,
  craftItem,
  evoService,
  getRecipes,
  getShops,
  Recipe,
  recycleItems,
  rollTour,
  ScentKey,
  Shop,
} from "../../queries/mall";

/**
 * The Snag Mall. A single component that renders both the arcade landing (a grid
 * of storefront cards) and, when a shop is entered, that shop's storefront. The
 * view is switched entirely by internal state (activeShopId), so no routing is
 * touched. Every vendor action goes through a server wrapper in queries/mall.ts;
 * we only show the result and refresh the cached balances.
 */

const CURRENCY_LABEL: Record<Shop["currency"], string> = {
  pokecoin: "Snag Coins",
  gengarcoin: "Gengar Tokens",
  snagemblem: "Snag Emblems",
};

// A rotating set of building accent colors so each storefront reads distinct.
const ACCENTS = ["#8c5bd6", "#3f8ad6", "#2f9e78", "#d68a3f", "#c94f7c", "#5b6dd6"];
const accentFor = (index: number) => ACCENTS[index % ACCENTS.length];

/** Resolve a shop item's display name + icon from the shared catalog. */
function resolveItem(itemId: string) {
  const match = itemData.find((i) => i.id === itemId);
  return {
    name: match?.name ?? itemId,
    filePath: match?.filePath,
  };
}

// Recycle rules mirrored from functions/src/index.ts (keep the two in sync).
const RECYCLE_EXCLUDED_CATEGORIES = new Set(["medicine"]);
const RECYCLE_HALF_CATEGORIES = new Set([
  "berry",
  "battle-item",
  "flute",
  "mulch",
  "incense",
  "exp-candy",
  "av-candy",
  "poke-candy",
  "curry-ingredient",
  "mint",
  "petal",
  "roto",
]);
/** Payout units for one item of a category: 0 = not recyclable, 0.5 = consumable. */
function recycleUnits(category: string | undefined): number {
  const c = category ?? "other-item";
  if (RECYCLE_EXCLUDED_CATEGORIES.has(c)) return 0;
  return RECYCLE_HALF_CATEGORIES.has(c) ? 0.5 : 1;
}

/** Recycle payout preview (an estimate, the server is authoritative). */
function estimateRecyclePayout(units: number): number {
  return Math.floor(Math.max(0, units) * 1.2);
}

const RECYCLE_RATES: Array<[string, string]> = [
  ["1 item", "1 coin"],
  ["3 items", "3 coins"],
  ["5 items", "6 coins"],
  ["10 items", "12 coins"],
  ["20 items", "24 coins"],
  ["Berries, battle items", "half value"],
  ["Medicine", "not recyclable"],
];

const SCENT_RATES: Array<[string, string]> = [
  ["4 Evo Points", "1 Joy Scent"],
  ["6 Evo Points", "1 Excite Scent"],
  ["8 Evo Points", "1 Vivid Scent"],
];

/** Reference rate card (label -> value rows). */
function RatePanel(props: { title: string; rows: Array<[string, string]>; note: string; valueColor: string }) {
  return (
    <Box p="lg" style={{ flex: "1 1 0%", minWidth: 0, borderRadius: 16, background: "#141019", border: "1px solid #232028" }}>
      <Text fz={14} fw={800} c="dimmed" tt="uppercase" mb="md" style={{ letterSpacing: 2 }}>
        {props.title}
      </Text>
      <Stack gap={0}>
        {props.rows.map(([label, value], i) => (
          <Group key={label} justify="space-between" wrap="nowrap" py={10} style={{ borderTop: i ? "1px solid #232028" : undefined }}>
            <Text fz={16} c="gray.3">
              {label}
            </Text>
            <Text fz={16} fw={800} c={props.valueColor}>
              {value}
            </Text>
          </Group>
        ))}
      </Stack>
      <Text fz={14} c="dimmed" mt="md" pt="md" style={{ borderTop: "1px solid #232028" }}>
        {props.note}
      </Text>
    </Box>
  );
}

function StatusMessage(props: { children: React.ReactNode; color?: string }) {
  if (!props.children) return null;
  return (
    <Text
      role="status"
      aria-live="polite"
      fz={14}
      c={props.color ?? "green"}
      mt={4}
    >
      {props.children}
    </Text>
  );
}

/* ------------------------------- Arcade ---------------------------------- */

function ShopCard(props: { shop: Shop; index: number; onEnter: () => void }) {
  const { shop, index } = props;
  const accent = accentFor(index);

  const itemCount =
    shop.sections?.reduce((sum, s) => sum + (s.items?.length ?? 0), 0) ?? 0;
  const rareCount = shop.rare_section?.pool?.length ?? 0;

  let stats: string;
  switch (shop.kind) {
    case "recycle":
      stats = "1/2 on consumables / +20 max bundle";
      break;
    case "tour":
      stats = "5 biomes / 2 coins per roll";
      break;
    case "evo":
      stats = "3 services / emblem-priced";
      break;
    default:
      stats = `${itemCount} items / ${rareCount} rare today`;
  }

  const displayFont = "var(--font-display, 'Quantico', sans-serif)";
  // Gold awning takes dark text on its label; others read on white.
  const darkText = accent === "#FFD074" || accent === "#d68a3f";
  return (
    <Box
      className="dc-card"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* Striped awning */}
      <Box
        h={12}
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${accent}, ${accent} 10px, rgba(255,255,255,0.85) 10px, rgba(255,255,255,0.85) 20px)`,
        }}
      />
      {/* Marquee header: per-shop accent gradient + kind kicker + name */}
      <Box
        px={16}
        py={14}
        style={{
          background: `linear-gradient(120deg, ${accent}, rgba(10,9,13,0.55))`,
          borderBottom: "1px solid #2a2637",
        }}
      >
        <Text
          fz={11}
          fw={700}
          tt="uppercase"
          c={darkText ? "rgba(26,27,30,0.85)" : "rgba(255,255,255,0.85)"}
          style={{ fontFamily: displayFont, letterSpacing: "0.18em" }}
        >
          {shop.type}
        </Text>
        <Text
          fz={20}
          fw={700}
          lineClamp={1}
          c={darkText ? "#1A1B1E" : "#fff"}
          style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}
        >
          {shop.name}
        </Text>
      </Box>
      {/* Keeper panel (existing npc art) */}
      <Box
        h={96}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          backgroundImage: shop.npc_image
            ? `linear-gradient(rgba(10,9,13,0.25), rgba(10,9,13,0.7)), url(${shop.npc_image})`
            : `linear-gradient(135deg, ${accent}, rgba(10,9,13,0.6))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {shop.npc_name && (
          <Text fz={14} fw={700} c="white" ta="center" px={8} pb={6} lineClamp={1}>
            {shop.npc_name}
          </Text>
        )}
      </Box>
      {/* Stats + enter */}
      <Stack gap={12} p={16} style={{ flex: 1 }}>
        <Text
          fz={12}
          c="#b6b1bc"
          ta="center"
          px={10}
          py={6}
          style={{ background: "#141318", border: "1px solid #232028" }}
        >
          {stats}
        </Text>
        <button
          type="button"
          onClick={props.onEnter}
          aria-label={`Enter ${shop.name}`}
          style={{
            marginTop: "auto",
            border: 0,
            cursor: "pointer",
            padding: "12px 18px",
            color: darkText ? "#1A1B1E" : "#fff",
            background: `linear-gradient(90deg, ${accent}, rgba(10,9,13,0.35))`,
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
          }}
        >
          Enter {shop.name} →
        </button>
      </Stack>
    </Box>
  );
}

function ArcadeView(props: { shops: Shop[]; onEnter: (id: string) => void }) {
  if (!props.shops.length) {
    return (
      <Card withBorder radius="md" p={40} bg="#17151c">
        <Text c="dimmed" ta="center">
          The mall is being stocked, check back soon.
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap={20}>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        {props.shops.map((shop, index) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            index={index}
            onEnter={() => props.onEnter(shop.id)}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/* ------------------------------ Storefronts ------------------------------ */

/** kind "store": buy items section by section. */
function StoreBody(props: { shop: Shop; balance: number }) {
  const { shop, balance } = props;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const buy = async (itemId: string, price: number) => {
    setPendingId(itemId);
    setMessage("");
    setError("");
    try {
      await buyShopItem(shop.id, itemId, 1);
      setMessage("Purchase complete, the item is in your bag.");
      queryClient.invalidateQueries({ queryKey: ["currencies", user?.uid] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the purchase.");
    } finally {
      setPendingId(null);
    }
  };

  const allSections = shop.sections ?? [];
  const allRare = shop.rare_section?.pool ?? [];

  // Section tabs + name search so long catalogs stay browsable.
  const RARE_TAB = "__rare__";
  const [activeSection, setActiveSection] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const q = search.trim().toLowerCase();
  const matchesSearch = (item: { itemId: string; description?: string }) => {
    if (!q) return true;
    const resolved = resolveItem(item.itemId);
    return (
      resolved.name.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
    );
  };
  const sections = allSections
    .filter((s) => activeSection === "all" || activeSection === s.title)
    .map((s) => ({ ...s, items: (s.items ?? []).filter(matchesSearch) }))
    .filter((s) => s.items.length > 0);
  const rare =
    activeSection === "all" || activeSection === RARE_TAB ? allRare.filter(matchesSearch) : [];
  const sectionTabs =
    allSections.length > 1
      ? [
          { value: "all", label: "All" },
          ...allSections.map((s) => ({ value: s.title, label: s.title })),
          ...(allRare.length ? [{ value: RARE_TAB, label: "Rare Wares" }] : []),
        ]
      : [];

  const ItemCard = (item: { itemId: string; price: number; description?: string }, rareCard = false) => {
    const resolved = resolveItem(item.itemId);
    const tooPoor = balance < item.price;
    const busy = pendingId === item.itemId;
    return (
      <Box
        key={item.itemId}
        p="md"
        style={{
          borderRadius: 14,
          background: rareCard ? "linear-gradient(160deg, #241d0e, #17151c)" : "#141019",
          border: `1px solid ${rareCard ? "#5a4a2a" : "#232028"}`,
        }}
      >
        <Group gap={12} wrap="nowrap" align="flex-start" mb={10}>
          <Box
            style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#0e0c14",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ItemHoverCard item={{ id: item.itemId, name: resolved.name }}>
              <Image
                src={resolved.filePath ? getItemImageURL(resolved.filePath) : undefined}
                alt={resolved.name}
                w={30}
                h={30}
                fit="contain"
              />
            </ItemHoverCard>
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text fz={16} fw={700} c="white" lineClamp={1}>
              {resolved.name}
            </Text>
            <PriceBadge currency={shop.currency} value={item.price} />
          </Box>
        </Group>
        {item.description && (
          <Text fz={14} c="dimmed" mb={12} lineClamp={2}>
            {item.description}
          </Text>
        )}
        <Button
          fullWidth
          radius="md"
          variant="gradient"
          gradient={{ from: "grape", to: "indigo", deg: 90 }}
          loading={busy}
          disabled={busy || tooPoor}
          onClick={() => buy(item.itemId, item.price)}
          aria-label={`Buy ${resolved.name} for ${item.price} ${CURRENCY_LABEL[shop.currency]}`}
        >
          {tooPoor ? "Not enough" : "Buy"}
        </Button>
      </Box>
    );
  };

  return (
    <Stack gap="xl">
      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}

      {(allSections.length > 0 || allRare.length > 0) && (
        <Flex gap="md" wrap="wrap" align="center">
          <TextInput
            aria-label={`Search ${shop.name} wares`}
            placeholder="Search the shelves"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius="xl"
            maw={280}
            w="100%"
            styles={{ root: { flex: "1 1 200px" } }}
          />
          {sectionTabs.length > 0 && (
            <Group gap={6} wrap="wrap" role="tablist" aria-label="Shop sections">
              {sectionTabs.map((tab) => (
                <Button
                  key={tab.value}
                  size="xs"
                  radius="xl"
                  variant={activeSection === tab.value ? "gradient" : "default"}
                  gradient={{ from: "grape", to: "indigo", deg: 90 }}
                  onClick={() => setActiveSection(tab.value)}
                  aria-pressed={activeSection === tab.value}
                >
                  {tab.label}
                </Button>
              ))}
            </Group>
          )}
        </Flex>
      )}

      {!allSections.length && !allRare.length && (
        <Text c="dimmed">This vendor has nothing on the shelves right now.</Text>
      )}
      {(allSections.length > 0 || allRare.length > 0) && !sections.length && !rare.length && (
        <Text c="dimmed">Nothing on the shelves matches that search.</Text>
      )}

      {sections.map((section) => (
        <Box key={section.title}>
          <Text fz={14} fw={800} c="dimmed" tt="uppercase" mb="md" style={{ letterSpacing: 2 }}>
            {section.title}
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 5 }} spacing="md">
            {section.items.map((item) => ItemCard(item))}
          </SimpleGrid>
        </Box>
      ))}

      {rare.length > 0 && (
        <Box>
          <Group justify="space-between" align="center" mb="md" wrap="wrap">
            <Group gap={8}>
              <IconSparkles size={16} color="#F5C842" />
              <Text fz={14} fw={800} c="#F5C842" tt="uppercase" style={{ letterSpacing: 2 }}>
                Today's Rare Wares
              </Text>
            </Group>
            <Text fz={14} c="dimmed">
              Refreshes in {rareRefreshLabel()}
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 5 }} spacing="md">
            {rare.map((item) => ItemCard(item, true))}
          </SimpleGrid>
        </Box>
      )}
    </Stack>
  );
}

/** Time until the next daily rare-wares rotation (local midnight). */
function rareRefreshLabel(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** kind "recycle": select bag items, see an estimate, recycle them for coins. */
function RecycleBody() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const { data: items, isPending } = useQuery({
    queryKey: ["bag-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user?.uid,
  });

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectedUnits = React.useMemo(
    () =>
      selected.reduce((sum, id) => {
        const it = (items ?? []).find((b) => b.id === id);
        return sum + recycleUnits(it?.category);
      }, 0),
    [selected, items]
  );
  const payout = estimateRecyclePayout(selectedUnits);

  const recycle = async () => {
    if (!selected.length) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const res = await recycleItems(selected);
      setMessage(`Recycled for ${res.coins} Snag Coins.`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["currencies", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["bag-items", user?.uid] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not recycle those items.");
    } finally {
      setPending(false);
    }
  };

  if (isPending) return <SectionLoader />;

  const bag = items ?? [];

  // Two clearly tabbed services so the candy trade is not buried under a long
  // item list: recycle items on one tab, candy-to-scent on the other.
  return (
    <Tabs defaultValue="items" variant="pills" color="grape" keepMounted={false}>
      <Tabs.List mb="lg">
        <Tabs.Tab value="items">Recycle Items</Tabs.Tab>
        <Tabs.Tab value="candy">Trade Candy for Scents</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="items">
        <RecycleItemsTab
          bag={bag}
          selected={selected}
          toggle={toggle}
          payout={payout}
          pending={pending}
          message={message}
          error={error}
          onRecycle={recycle}
        />
      </Tabs.Panel>

      <Tabs.Panel value="candy">
        <Stack gap="xl">
          <RatePanel
            title="Candy → Scents"
            rows={SCENT_RATES}
            note="Spends Evolution Points from your Pokemon to brew Scents."
            valueColor="#3bc9db"
          />
          <CandyToScentPanel />
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}

/** The recycle-items side of the Trash Shack (rate card + bag list + action). */
function RecycleItemsTab(props: {
  bag: Array<{ id: string; name: string; category?: string; quantity: number; filePath?: string }>;
  selected: string[];
  toggle: (id: string) => void;
  payout: number;
  pending: boolean;
  message: string;
  error: string;
  onRecycle: () => void;
}) {
  const { bag, selected, toggle, payout, pending, message, error, onRecycle } = props;
  return (
    <Stack gap="xl">
      {/* Rate reference table (informational; the server is authoritative) */}
      <RatePanel title="Items → Snag Coins" rows={RECYCLE_RATES} note="Consumables pay half (rounded down). Medicines excluded. Items bought for 1 coin can't be recycled." valueColor="#F5C842" />

      <Divider color="#232028" label="Bring your junk" labelPosition="center" />

      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}

      {!bag.length ? (
        <Text c="dimmed">Your bag has nothing to recycle right now.</Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, xs: 4, sm: 6, lg: 8 }} spacing={20}>
            {bag.map((item) => {
              const units = recycleUnits(item.category);
              const recyclable = units > 0;
              const hint = !recyclable ? "not recyclable" : units === 0.5 ? "half value" : null;
              const picked = recyclable && selected.includes(item.id);
              return (
                <Card
                  key={item.id}
                  withBorder
                  radius="md"
                  p={12}
                  bg={picked ? "#332b3d" : "#17151c"}
                  {...(recyclable
                    ? {
                        ...clickable(() => toggle(item.id)),
                        "aria-label": `Toggle ${item.name} for recycling`,
                      }
                    : { "aria-label": `${item.name} cannot be recycled` })}
                  style={{
                    cursor: recyclable ? "pointer" : "not-allowed",
                    opacity: recyclable ? 1 : 0.5,
                    borderColor: picked ? "#772976" : undefined,
                  }}
                >
                  <Stack gap={6} align="center">
                    <ItemHoverCard
                      item={{
                        id: item.id,
                        name: item.name,
                        category: item.category,
                        quantity: item.quantity,
                      }}
                    >
                      <Image
                        src={item.filePath ? getItemImageURL(item.filePath) : undefined}
                        alt={item.name}
                        w={44}
                        h={44}
                        fit="contain"
                      />
                    </ItemHoverCard>
                    <Text fz={20} c="white" ta="center" lineClamp={1}>
                      {item.name}
                    </Text>
                    <Text fz={16} c="dimmed" ta="center" tt="capitalize" lineClamp={1}>
                      x{item.quantity}
                      {hint ? ` · ${hint}` : ""}
                    </Text>
                    <Checkbox
                      checked={picked}
                      readOnly
                      disabled={!recyclable}
                      tabIndex={-1}
                      aria-hidden
                    />
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <Card withBorder radius="md" p={12} bg="#141318">
            <Group justify="space-between">
              <Text fz={14} c="dimmed">
                {selected.length} selected (estimate)
              </Text>
              <Text fz={16} fw={700} c="white">
                ~ {payout} Snag Coins
              </Text>
            </Group>
          </Card>

          <Button
            radius="md"
            loading={pending}
            disabled={pending || !selected.length}
            onClick={onRecycle}
            aria-label="Recycle selected items"
          >
            Recycle selected
          </Button>
        </>
      )}
    </Stack>
  );
}

const SCENT_OPTIONS: { value: ScentKey; label: string; cost: number }[] = [
  { value: "joy", label: "Joy Scent", cost: 4 },
  { value: "excite", label: "Excite Scent", cost: 6 },
  { value: "vivid", label: "Vivid Scent", cost: 8 },
];

/** Trash Shack: spend a Pokemon's Evo Points (experience) for aroma Scents. */
function CandyToScentPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pokemonId, setPokemonId] = React.useState<string | null>(null);
  const [scent, setScent] = React.useState<ScentKey>("joy");
  const [qty, setQty] = React.useState<number>(1);
  const [status, setStatus] = React.useState<{ color: string; text: string } | null>(null);

  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user?.uid,
  });

  const pokemons = owned?.sortedData ?? [];
  const selectData = pokemons.map((p) => ({
    value: p.id,
    label: `${p.name} (${Math.floor(Number(p.experience ?? 0))} Evo Pts)`,
  }));
  const selected = pokemons.find((p) => p.id === pokemonId);
  const cost = (SCENT_OPTIONS.find((s) => s.value === scent)?.cost ?? 0) * qty;
  const have = Math.floor(Number(selected?.experience ?? 0));
  const canConvert = !!pokemonId && qty >= 1 && have >= cost;

  const mutation = useMutation({
    mutationFn: () => convertCandyToScent(pokemonId!, scent, qty),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["bag-items", user?.uid] });
      setStatus({
        color: "teal",
        text: `Made ${res.qty} ${scent} scent${res.qty > 1 ? "s" : ""}. ${res.remaining} Evo Points left on that Pokemon.`,
      });
    },
    onError: (err: unknown) => {
      setStatus({ color: "red", text: err instanceof Error ? err.message : "Conversion failed." });
    },
  });

  return (
    <Stack gap={10}>
      <Box>
        <Text fz={16} c="white" fw={600}>
          Candy to Scent
        </Text>
        <Text fz={14} c="dimmed">
          Spend a Pokemon's Evo Points for an aroma Scent (Joy 4, Excite 6, Vivid 8 each).
        </Text>
      </Box>
      <Select
        label="Pokemon"
        placeholder={pokemons.length ? "Choose a Pokemon" : "No Pokemon yet"}
        data={selectData}
        value={pokemonId}
        onChange={setPokemonId}
        searchable
        maw={360}
        w="100%"
        disabled={!pokemons.length}
      />
      <Group gap={10} wrap="wrap" align="flex-end">
        <Select
          label="Scent"
          data={SCENT_OPTIONS.map((s) => ({ value: s.value, label: `${s.label} (${s.cost})` }))}
          value={scent}
          onChange={(v) => v && setScent(v as ScentKey)}
          allowDeselect={false}
          w={180}
        />
        <NumberInput
          label="Qty"
          value={qty}
          onChange={(v) => setQty(typeof v === "number" ? v : 1)}
          min={1}
          max={20}
          w={90}
        />
      </Group>
      <Text fz={14} c="dimmed">
        Cost: {cost} Evo Points{selected ? ` · this Pokemon has ${have}` : ""}
      </Text>
      <Button
        radius="md"
        color="grape"
        variant="light"
        loading={mutation.isPending}
        disabled={mutation.isPending || !canConvert}
        onClick={() => {
          setStatus(null);
          mutation.mutate();
        }}
        maw={220}
        w="100%"
        aria-label="Convert Evo Points to a scent"
      >
        Convert
      </Button>
      {status && <StatusMessage color={status.color}>{status.text}</StatusMessage>}
    </Stack>
  );
}

/** kind "tour": pick a biome, roll for an item. */
const TOUR_AREAS = [
  { name: "Cool Canyon", emoji: "🏜️" },
  { name: "Beautiful Meadow", emoji: "🌼" },
  { name: "Cute Forest", emoji: "🌲" },
  { name: "Clever Swamp", emoji: "🐊" },
  { name: "Tough Peak", emoji: "⛰️" },
];

function TourBody() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [area, setArea] = React.useState<string>(TOUR_AREAS[0].name);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    item: { name: string; filePath?: string };
    bonusRareCandy: boolean;
    free: boolean;
  } | null>(null);

  const roll = async () => {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const res = await rollTour(area);
      setResult({
        item: res.item,
        bonusRareCandy: res.bonusRareCandy,
        free: res.free,
      });
      queryClient.invalidateQueries({ queryKey: ["currencies", user?.uid] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The tour could not roll right now.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Box>
      <Text fz={14} fw={800} c="dimmed" tt="uppercase" mb="md" style={{ letterSpacing: 2 }}>
        Pick a biome &middot; 2 Snag Coins per roll
      </Text>
      <Flex gap="lg" direction={{ base: "column", md: "row" }} align="stretch">
        <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
            {TOUR_AREAS.map((a) => {
              const active = a.name === area;
              return (
                <Box
                  key={a.name}
                  {...clickable(() => setArea(a.name))}
                  aria-label={`Choose biome ${a.name}`}
                  aria-pressed={active}
                  p="md"
                  style={{
                    borderRadius: 14,
                    cursor: "pointer",
                    textAlign: "center",
                    background: active ? "linear-gradient(160deg, #1a8a9e, #16788a)" : "#141019",
                    border: `1px solid ${active ? "#3bc9db" : "#232028"}`,
                  }}
                >
                  <Text fz={34} mb={6}>
                    {a.emoji}
                  </Text>
                  <Text fz={16} fw={700} c="white">
                    {a.name}
                  </Text>
                </Box>
              );
            })}
          </SimpleGrid>
          <Text fz={14} c="dimmed" mt="md">
            Every 4th roll is free &middot; roll a 7 for a bonus Rare Candy &middot; Apricorn picking: 6
            coins per mature tree.
          </Text>
          {error && <StatusMessage color="red">{error}</StatusMessage>}
        </Box>

        <Box
          p="lg"
          style={{ flex: "1 1 0%", minWidth: 0, maxWidth: 360, borderRadius: 16, background: "#141019", border: "1px solid #232028", textAlign: "center" }}
        >
          <Text fz={14} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: 1 }}>
            Selected biome
          </Text>
          <Text fz={26} fw={800} c="white" mb="md">
            {area}
          </Text>
          <Box
            style={{
              width: 120, height: 120, margin: "0 auto 20px", borderRadius: 16,
              background: "#0e0c14", border: "1px solid #232028",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}
            role="status"
            aria-live="polite"
          >
            {result ? (
              <ItemHoverCard
                item={{
                  id: itemData.find((i) => i.name === result.item.name)?.id ?? result.item.name,
                  name: result.item.name,
                }}
              >
                <Image
                  src={result.item.filePath ? getItemImageURL(result.item.filePath) : undefined}
                  alt={result.item.name}
                  w={72}
                  h={72}
                  fit="contain"
                />
              </ItemHoverCard>
            ) : (
              <Text fz={44} c="dimmed">
                ?
              </Text>
            )}
          </Box>
          {result && (
            <Box mb="md">
              <Text fz={16} fw={700} c="white">
                {result.item.name}
              </Text>
              {result.bonusRareCandy && (
                <Text fz={14} c="gold.1">
                  Rare Candy bonus!
                </Text>
              )}
              {result.free && (
                <Text fz={14} c="green">
                  free roll
                </Text>
              )}
            </Box>
          )}
          <Button
            fullWidth
            radius="xl"
            variant="gradient"
            gradient={{ from: "grape", to: "cyan", deg: 90 }}
            loading={pending}
            disabled={pending}
            onClick={roll}
            aria-label="Roll the tour for 2 Snag Coins"
          >
            Roll &mdash; 2 Coins
          </Button>
        </Box>
      </Flex>
    </Box>
  );
}

/** kind "evo": three services keyed to a character id the user types in. */
function EvoBody() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [characterId, setCharacterId] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  // New Adaptations is payable either way; the member picks.
  const [adaptPay, setAdaptPay] = React.useState<"snagemblem" | "pokecoin">("snagemblem");

  const run = async (
    action: "unlock_restraints" | "unlock_potential" | "new_adaptations",
    payWith?: "pokecoin" | "snagemblem"
  ) => {
    if (!characterId.trim()) {
      setError("Enter a character id first.");
      setMessage("");
      return;
    }
    setPending(action);
    setMessage("");
    setError("");
    try {
      await evoService(action, characterId.trim(), payWith ? { payWith } : undefined);
      setMessage("Service applied.");
      queryClient.invalidateQueries({ queryKey: ["currencies", user?.uid] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The service could not be applied.");
    } finally {
      setPending(null);
    }
  };

  const services: Array<{
    key: "unlock_restraints" | "unlock_potential" | "new_adaptations";
    title: string;
    desc: string;
    price: string;
    icon: React.ReactNode;
    payWith?: "pokecoin" | "snagemblem";
  }> = [
    {
      key: "unlock_restraints",
      title: "Unlock Restraints",
      desc: "Adds a new move / ability slot to your character.",
      price: "1 Snag Emblem",
      icon: <IconLock size={20} color="#c4b5fd" />,
    },
    {
      key: "unlock_potential",
      title: "Unlock Potential",
      desc: "Learn an approved move or ability (needs an open slot).",
      price: "2 Snag Emblems",
      icon: <IconSparkles size={20} color="#c4b5fd" />,
    },
    {
      key: "new_adaptations",
      title: "New Adaptations",
      desc: "Swap out an existing ability for another.",
      price: "2 Emblems / 25 Coins",
      icon: <IconRefresh size={20} color="#c4b5fd" />,
      payWith: "snagemblem",
    },
  ];

  const master = isMaster(user);

  return (
    <Stack gap={16}>
      <Box
        p="md"
        style={{ borderRadius: 12, background: "rgba(160,120,220,0.12)", border: "1px solid #3a3550" }}
      >
        <Text fz={14} c="rgba(255,255,255,0.85)">
          <Text span fw={800} c="grape.3">
            Eligibility:{" "}
          </Text>
          Hybrids and Channelers who have completed their first Master Mission. E.V.O. services are
          limited to members with the Master role.
        </Text>
      </Box>

      {!master ? (
        <Box p="md" style={{ borderRadius: 12, background: "#161319", border: "1px solid #232028" }}>
          <Text fz={16} c="dimmed">
            You need the Master role to use E.V.O. Clear your first Master Mission and a director will
            promote you, then come back to loosen your restraints.
          </Text>
        </Box>
      ) : (
        <>
          <TextInput
            label="Character id"
            placeholder="Enter the character id to apply this to"
            value={characterId}
            onChange={(e) => setCharacterId(e.currentTarget.value)}
            aria-label="Character id"
            maw={320}
            w="100%"
          />

      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}

      <Stack gap={12}>
        {services.map((svc) => (
          <Group
            key={svc.key}
            justify="space-between"
            wrap="nowrap"
            gap="md"
            p="md"
            style={{ borderRadius: 14, background: "#141019", border: "1px solid #232028" }}
          >
            <Group gap={14} wrap="nowrap" style={{ minWidth: 0 }}>
              <Box
                style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: "#1a1530",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {svc.icon}
              </Box>
              <Box style={{ minWidth: 0 }}>
                <Text fz={20} fw={800} c="white">
                  {svc.title}
                </Text>
                <Text fz={14} c="dimmed" lineClamp={2}>
                  {svc.desc}
                </Text>
              </Box>
            </Group>
            <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
              {svc.key === "new_adaptations" ? (
                <Select
                  aria-label="Pay New Adaptations with"
                  data={[
                    { value: "snagemblem", label: "2 Emblems" },
                    { value: "pokecoin", label: "25 Coins" },
                  ]}
                  value={adaptPay}
                  onChange={(v) => setAdaptPay(v === "pokecoin" ? "pokecoin" : "snagemblem")}
                  allowDeselect={false}
                  size="xs"
                  w={120}
                />
              ) : (
                <Text fz={16} fw={800} c="#F5C842" ta="right" style={{ whiteSpace: "nowrap" }}>
                  {svc.price}
                </Text>
              )}
              <Button
                radius="xl"
                variant="gradient"
                gradient={{ from: "grape", to: "indigo", deg: 90 }}
                loading={pending === svc.key}
                disabled={pending === svc.key}
                onClick={() => run(svc.key, svc.key === "new_adaptations" ? adaptPay : svc.payWith)}
                aria-label={`${svc.title} for ${svc.price}`}
              >
                Purchase
              </Button>
            </Group>
          </Group>
        ))}
      </Stack>
        </>
      )}
    </Stack>
  );
}

/* --------------------------- Storefront chrome --------------------------- */

const STRIPES =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 12px, transparent 12px, transparent 24px)";

const KIND_STYLE: Record<string, { grad: string; accent: string }> = {
  store: { grad: "linear-gradient(120deg, #3a2c14, #4a3a1a 60%, #241d0e)", accent: "#e0b000" },
  recycle: { grad: "linear-gradient(120deg, #16301a, #1c3a22 60%, #0f2412)", accent: "#63e6be" },
  tour: { grad: "linear-gradient(120deg, #0f2a30, #123a3a 60%, #0a2024)", accent: "#3bc9db" },
  evo: { grad: "linear-gradient(120deg, #2a1545, #3a1d63 60%, #1c1030)", accent: "#b197fc" },
};
const kindStyle = (kind?: string) => KIND_STYLE[kind ?? "store"] ?? KIND_STYLE.store;

const CURRENCY_BADGE: Record<Shop["currency"], { letter: string; color: string }> = {
  pokecoin: { letter: "C", color: "#7c5cff" },
  gengarcoin: { letter: "G", color: "#9775fa" },
  snagemblem: { letter: "S", color: "#f06595" },
};

/** Small coin/price pill, e.g. "C 5". */
function PriceBadge(props: { currency: Shop["currency"]; value: number | string }) {
  const b = CURRENCY_BADGE[props.currency];
  return (
    <Group gap={6} wrap="nowrap">
      <Box
        style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: b.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Text fz={14} fw={800} c="#fff">
          {b.letter}
        </Text>
      </Box>
      <Text fz={16} fw={800} c="#F5C842">
        {props.value}
      </Text>
    </Group>
  );
}

/** Full-bleed per-shop header band, colored by shop kind. */
function ShopHeader(props: { shop: Shop; balance: number; onBack: () => void }) {
  const { shop } = props;
  const ks = kindStyle(shop.kind);
  const cb = CURRENCY_BADGE[shop.currency];
  return (
    <Box px={{ base: 16, sm: 40 }} pt={{ base: 16, sm: 20 }} pb={{ base: 20, sm: 28 }} style={{ background: `${STRIPES}, ${ks.grad}` }}>
      <Container size="lg" px={0}>
        <Button
          radius="xl"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={props.onBack}
          styles={{ root: { background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" } }}
          mb="lg"
        >
          The Snag Mall
        </Button>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
            <Box
              style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                background: shop.npc_image
                  ? `center / cover no-repeat url(${shop.npc_image})`
                  : `${STRIPES}, ${ks.accent}33`,
                border: `1px solid ${ks.accent}55`,
              }}
            />
            <Box style={{ minWidth: 0 }}>
              <Group gap={10} align="center" wrap="wrap">
                <Text component="h1" c="white" fw={700} fz={{ base: 30, sm: 44 }} style={{ lineHeight: 1, margin: 0, fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.02em" }}>
                  {shop.name}
                </Text>
                {shop.type && (
                  <Text fz={14} fw={700} c="rgba(255,255,255,0.8)" px={10} py={4} style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)" }}>
                    {shop.type}
                  </Text>
                )}
              </Group>
              {shop.npc_name && (
                <Text fz={16} c="rgba(255,255,255,0.7)" mt={6}>
                  Kept by {shop.npc_name}
                </Text>
              )}
            </Box>
          </Group>
          <Group gap={12} px={16} py={10} style={{ borderRadius: 14, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Box
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: cb.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Text fz={20} fw={800} c="#fff">
                {cb.letter}
              </Text>
            </Box>
            <Box>
              <Text fz={26} fw={800} c="white" lh={1}>
                {props.balance}
              </Text>
              <Text fz={14} c="rgba(255,255,255,0.7)" tt="uppercase" mt={2}>
                your {CURRENCY_LABEL[shop.currency]}
              </Text>
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

/** Italic flavor intro panel (sanitized shop copy). */
function FlavorCard(props: { html: string }) {
  return (
    <Box p="lg" style={{ borderRadius: 16, background: "#161319", border: "1px solid #232028" }}>
      <Box
        c="gray.4"
        style={{ fontSize: 16, lineHeight: 1.6, fontStyle: "italic" }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(props.html) }}
      />
    </Box>
  );
}

/* --------------------------- Ambrosial Alchemy ---------------------------- */

const itemNameOf = (itemId: string, fallback?: string) =>
  itemData.find((i) => i.id === itemId)?.name ?? fallback ?? itemId;

function CraftRecipeRow(props: { recipe: Recipe; bag: Map<string, number>; onDone: () => void }) {
  const { recipe, bag } = props;
  const [batch, setBatch] = React.useState<number>(1);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const maxBatch = Math.max(1, recipe.max_batch ?? 1);
  const ingredients = recipe.ingredients ?? [];
  const costParts = [
    recipe.cost?.pokecoin ? `${recipe.cost.pokecoin * batch} Snag Coins` : "",
    recipe.cost?.snagemblem ? `${recipe.cost.snagemblem * batch} Emblems` : "",
  ].filter(Boolean);
  const missing = ingredients.some((ing) => (bag.get(ing.itemId) ?? 0) < ing.qty * batch);
  const rate = Math.min(100, Math.max(0, recipe.success_rate ?? 100));

  const craft = useMutation({
    mutationFn: () => craftItem(recipe.id, batch),
    onSuccess: (res) => {
      setError("");
      setMessage(
        res.failures
          ? `Crafted ${res.successes}, ${res.failures} failed. Ingredients are spent either way.`
          : `Crafted ${res.successes} ${itemNameOf(recipe.output_item_id, recipe.output_name)}!`
      );
      props.onDone();
    },
    onError: (e) => {
      setMessage("");
      setError(e instanceof Error ? e.message : "The craft failed. Try again.");
    },
  });

  return (
    <Box p="md" style={{ borderRadius: 14, background: "#141019", border: "1px solid #232028" }}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Box style={{ minWidth: 0, flex: "1 1 260px" }}>
          <Group gap={8} wrap="nowrap">
            <ItemHoverCard
              item={{
                id: recipe.output_item_id,
                name: itemNameOf(recipe.output_item_id, recipe.output_name),
              }}
            >
              <Image
                src={getItemImageURL(itemData.find((i) => i.id === recipe.output_item_id)?.filePath ?? "")}
                alt={`${itemNameOf(recipe.output_item_id, recipe.output_name)} sprite`}
                w={34}
                h={34}
                fit="contain"
                loading="lazy"
              />
            </ItemHoverCard>
            <Text fz={18} fw={800} c="white">
              {itemNameOf(recipe.output_item_id, recipe.output_name)}
              {(recipe.output_qty ?? 1) > 1 ? ` x${recipe.output_qty}` : ""}
            </Text>
          </Group>
          <Text fz={14} c="dimmed" mt={4}>
            Needs:{" "}
            {ingredients.length
              ? ingredients
                  .map(
                    (ing) =>
                      `${ing.qty * batch}x ${itemNameOf(ing.itemId)} (have ${bag.get(ing.itemId) ?? 0})`
                  )
                  .join(", ")
              : "no ingredients"}
            {costParts.length ? ` + ${costParts.join(" + ")}` : ""}
          </Text>
          <Text fz={13} c={rate < 100 ? "#F5C842" : "dimmed"}>
            Success rate {rate}%{rate < 100 ? "; ingredients are spent even on a failed craft." : "."}
          </Text>
        </Box>
        <Group gap={10} wrap="nowrap" style={{ flexShrink: 0 }}>
          {maxBatch > 1 && (
            <NumberInput
              aria-label="Craft batch size"
              value={batch}
              onChange={(v) => setBatch(Math.min(maxBatch, Math.max(1, typeof v === "number" ? v : 1)))}
              min={1}
              max={maxBatch}
              size="xs"
              w={70}
            />
          )}
          <Button
            radius="xl"
            variant="gradient"
            gradient={{ from: "grape", to: "indigo", deg: 90 }}
            loading={craft.isPending}
            disabled={craft.isPending || missing}
            onClick={() => craft.mutate()}
            aria-label={`Craft ${itemNameOf(recipe.output_item_id, recipe.output_name)}`}
          >
            Craft
          </Button>
        </Group>
      </Group>
      {missing && (
        <Text fz={13} c="dimmed" mt={4}>
          You are missing ingredients for this batch.
        </Text>
      )}
      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}
    </Box>
  );
}

function CraftBody() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const recipes = useQuery({ queryKey: ["craft-recipes"], queryFn: getRecipes });
  const bagItems = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });

  const bag = React.useMemo(() => {
    const m = new Map<string, number>();
    (bagItems.data ?? []).forEach((i) => m.set(i.id, Number(i.quantity) || 0));
    return m;
  }, [bagItems.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["currencies", user?.uid] });
  };

  if (recipes.isPending) return <SectionLoader />;
  const list = recipes.data ?? [];
  if (!list.length) {
    return (
      <Text fz={16} c="dimmed">
        The cauldron is cold: no recipes are on the books yet. Check back soon.
      </Text>
    );
  }

  const categories = [...new Set(list.map((r) => r.category ?? "Recipes"))];
  return (
    <Stack gap="xl">
      {categories.map((cat) => (
        <Box key={cat}>
          <Text fz={14} fw={800} c="dimmed" tt="uppercase" mb="sm" style={{ letterSpacing: 2 }}>
            {cat}
          </Text>
          <Stack gap={12}>
            {list
              .filter((r) => (r.category ?? "Recipes") === cat)
              .map((r) => (
                <CraftRecipeRow key={r.id} recipe={r} bag={bag} onDone={refresh} />
              ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function StorefrontView(props: { shop: Shop; balance: number; onBack: () => void }) {
  const { shop } = props;

  let body: React.ReactNode;
  switch (shop.kind) {
    case "recycle":
      body = <RecycleBody />;
      break;
    case "tour":
      body = <TourBody />;
      break;
    case "evo":
      body = <EvoBody />;
      break;
    case "craft":
      body = <CraftBody />;
      break;
    default:
      body = <StoreBody shop={shop} balance={props.balance} />;
  }

  return (
    <Box>
      <ShopHeader shop={shop} balance={props.balance} onBack={props.onBack} />
      <Container size="lg" py={{ base: 24, sm: 36 }} px={{ base: 16, sm: 24 }}>
        <Stack gap="xl">
          {shop.flavor_intro && <FlavorCard html={shop.flavor_intro} />}
          {body}
        </Stack>
      </Container>
    </Box>
  );
}

/* ------------------------------- Currency -------------------------------- */

function CurrencyChip(props: { badge: string; label: string; value: string }) {
  return (
    <Group
      gap={8}
      wrap="nowrap"
      px={12}
      py={6}
      style={{ background: "rgba(0,0,0,0.35)", borderRadius: 999 }}
    >
      <Box
        w={22}
        h={22}
        style={{
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          color: "#3a1d5c",
          fontWeight: 800,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        {props.badge}
      </Box>
      <Box>
        <Text fz={14} c="rgba(255,255,255,0.7)" tt="uppercase" fw={600} lh={1}>
          {props.label}
        </Text>
        <Text fz={16} fw={700} c="white" lh={1.1}>
          {props.value}
        </Text>
      </Box>
    </Group>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function Mall() {
  const { user } = useAuth();
  const [activeShopId, setActiveShopId] = React.useState<string | null>(null);

  const { data: shops, isPending: shopsPending } = useQuery({
    queryKey: ["shops"],
    queryFn: getShops,
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies", user?.uid],
    queryFn: () => getCurrencies(user!.uid),
    enabled: !!user?.uid,
  });

  // The E.V.O. wing is a Master-tier service: hide the storefront entirely
  // from everyone else (the server still gates the purchases).
  const shopList = (shops ?? []).filter((s) => s.kind !== "evo" || isMaster(user));
  const activeShop = activeShopId
    ? shopList.find((s) => s.id === activeShopId) ?? null
    : null;

  // The user's balance in the active shop's currency (server strings -> number).
  const balance = activeShop
    ? Number(currencies?.[activeShop.currency] ?? 0) || 0
    : 0;

  const snagCoins = currencies?.pokecoin ?? "0";
  const snagEmblems = currencies?.snagemblem ?? "0";

  // An entered shop renders its own full-bleed header; the mall header only
  // shows on the arcade landing.
  if (activeShop) {
    return (
      <StorefrontView shop={activeShop} balance={balance} onBack={() => setActiveShopId(null)} />
    );
  }

  return (
    <Box>
      <Seo page="/Shop" />
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        <PageHero
          eyebrow={
            <Group gap={8}>
              <IconShoppingBag size={16} color="var(--mantine-color-grape-3)" />
              <Text fz={14} fw={700} c="grape.3" tt="uppercase" style={{ letterSpacing: 3 }}>
                Snag Mall Storefronts &middot; Always Open
              </Text>
            </Group>
          }
          title="The Snag Mall"
          subtitle="Step through any storefront to shop."
          aside={
            <Group gap={10} wrap="wrap">
              <CurrencyChip badge="C" label="Snag Coins" value={String(snagCoins)} />
              <CurrencyChip badge="S" label="Snag Emblems" value={String(snagEmblems)} />
            </Group>
          }
        />

        {shopsPending ? (
          <SectionLoader />
        ) : (
          <ArcadeView shops={shopList} onEnter={(id) => setActiveShopId(id)} />
        )}

        {/* Off-mall services: exchange and breeding live on their own pages. */}
        <Group gap={12} mt={28} wrap="wrap" align="stretch">
          <Card
            component={Link}
            to="/Trading"
            radius={0}
            p={20}
            style={{
              flex: "1 1 280px",
              background: "#17151c",
              border: "1px solid #2a2637",
              borderLeft: "3px solid #12B7B6",
              textDecoration: "none",
            }}
          >
            <Title
              order={2}
              fz={13}
              fw={700}
              c="#12B7B6"
              tt="uppercase"
              style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.18em" }}
            >
              The Trading Post
            </Title>
            <Text fz={16} fw={700} c="white" mt={4}>
              Swap Pokemon with other members
            </Text>
            <Text fz={13} c="#b6b1bc" mt={2}>
              Put one on the board, browse listings, make an offer.
            </Text>
            <Text
              fz={12}
              fw={700}
              c="#12B7B6"
              mt={10}
              tt="uppercase"
              style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.12em" }}
            >
              Open the Board →
            </Text>
          </Card>
          <Card
            component={Link}
            to="/Daycare"
            radius={0}
            p={20}
            style={{
              flex: "1 1 280px",
              background: "#17151c",
              border: "1px solid #2a2637",
              borderLeft: "3px solid #772976",
              textDecoration: "none",
            }}
          >
            <Title
              order={2}
              fz={13}
              fw={700}
              c="#c79bd6"
              tt="uppercase"
              style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.18em" }}
            >
              The Daycare
            </Title>
            <Text fz={16} fw={700} c="white" mt={4}>
              Leave a pair, hatch an egg
            </Text>
            <Text fz={13} c="#b6b1bc" mt={2}>
              Shared egg group, one male + one female (or a Ditto).
            </Text>
            <Text
              fz={12}
              fw={700}
              c="#c79bd6"
              mt={10}
              tt="uppercase"
              style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.12em" }}
            >
              Open the Daycare →
            </Text>
          </Card>
        </Group>
      </Container>
    </Box>
  );
}
