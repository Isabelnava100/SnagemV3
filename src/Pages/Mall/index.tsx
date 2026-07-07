import {
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconShoppingBag } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { itemData } from "../../data/item";
import { getItemImageURL } from "../../helpers";
import { clickable } from "../../lib/a11y";
import { getCurrencies, getItems } from "../../queries/dashboard";
import {
  buyShopItem,
  evoService,
  getShops,
  recycleItems,
  rollTour,
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

/** Simple recycle payout preview (an estimate, the server is authoritative). */
function estimateRecyclePayout(count: number): number {
  if (count <= 0) return 0;
  if (count >= 10) return 12;
  if (count >= 5) return 6;
  if (count >= 3) return 3;
  return count; // 1 -> 1, 2 -> 2 linear fallback
}

function StatusMessage(props: { children: React.ReactNode; color?: string }) {
  if (!props.children) return null;
  return (
    <Text
      role="status"
      aria-live="polite"
      fz={13}
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

  return (
    <Card
      p={0}
      radius="md"
      withBorder
      style={{ overflow: "hidden", background: "#26252a" }}
    >
      {/* Awning */}
      <Box
        h={14}
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${accent}, ${accent} 10px, rgba(255,255,255,0.85) 10px, rgba(255,255,255,0.85) 20px)`,
        }}
      />
      {/* Signboard */}
      <Box px={12} py={10} style={{ background: "#181719" }}>
        <Text fz={15} fw={700} c="white" lineClamp={1}>
          {shop.name}
        </Text>
        <Text fz={10} c="dimmed" tt="uppercase" fw={600}>
          {shop.type}
        </Text>
      </Box>
      {/* NPC panel */}
      <Box
        h={96}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: shop.npc_image
            ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${shop.npc_image})`
            : `linear-gradient(135deg, ${accent}, rgba(0,0,0,0.4))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {shop.npc_name && (
          <Text fz={14} fw={700} c="white" ta="center" px={8}>
            {shop.npc_name}
          </Text>
        )}
      </Box>
      {/* Stats + enter */}
      <Stack gap={10} p={12}>
        <Text fz={11} c="dimmed" ta="center">
          {stats}
        </Text>
        <Button
          fullWidth
          radius="md"
          onClick={props.onEnter}
          aria-label={`Enter ${shop.name}`}
          styles={{ root: { backgroundColor: accent } }}
        >
          Enter
        </Button>
      </Stack>
    </Card>
  );
}

function ArcadeView(props: { shops: Shop[]; onEnter: (id: string) => void }) {
  if (!props.shops.length) {
    return (
      <Card withBorder radius="md" p={40} bg="#26252a">
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
      <Text fz={12} c="dimmed" ta="center">
        stroll the arcade
      </Text>
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

  const sections = shop.sections ?? [];

  return (
    <Stack gap={20}>
      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}

      {!sections.length && (
        <Text c="dimmed">This vendor has nothing on the shelves right now.</Text>
      )}

      {sections.map((section) => (
        <Stack key={section.title} gap={10}>
          <Title order={3} c="white" fz={18}>
            {section.title}
          </Title>
          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
            {section.items.map((item) => {
              const resolved = resolveItem(item.itemId);
              const tooPoor = balance < item.price;
              const busy = pendingId === item.itemId;
              return (
                <Card
                  key={item.itemId}
                  withBorder
                  radius="md"
                  p={12}
                  bg="#26252a"
                >
                  <Stack gap={8} align="center">
                    <Image
                      src={resolved.filePath ? getItemImageURL(resolved.filePath) : undefined}
                      alt={resolved.name}
                      w={40}
                      h={40}
                      fit="contain"
                    />
                    <Text fz={13} c="white" ta="center" lineClamp={2}>
                      {resolved.name}
                    </Text>
                    {item.description && (
                      <Text fz={11} c="dimmed" ta="center" lineClamp={3}>
                        {item.description}
                      </Text>
                    )}
                    <Text fz={13} fw={700} c="white">
                      {item.price} {CURRENCY_LABEL[shop.currency]}
                    </Text>
                    <Button
                      size="xs"
                      fullWidth
                      radius="md"
                      loading={busy}
                      disabled={busy || tooPoor}
                      onClick={() => buy(item.itemId, item.price)}
                      aria-label={`Buy ${resolved.name} for ${item.price} ${CURRENCY_LABEL[shop.currency]}`}
                    >
                      {tooPoor ? "Not enough" : "Buy"}
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
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

  const payout = estimateRecyclePayout(selected.length);

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

  return (
    <Stack gap={16}>
      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage color="red">{error}</StatusMessage>}

      {!bag.length ? (
        <Text c="dimmed">Your bag has nothing to recycle right now.</Text>
      ) : (
        <>
          <Stack gap={6}>
            {bag.map((item) => (
              <Card
                key={item.id}
                withBorder
                radius="md"
                p={10}
                bg="#26252a"
                {...clickable(() => toggle(item.id))}
                aria-label={`Toggle ${item.name} for recycling`}
                style={{ cursor: "pointer" }}
              >
                <Group gap={10} wrap="nowrap">
                  <Checkbox
                    checked={selected.includes(item.id)}
                    readOnly
                    tabIndex={-1}
                    aria-hidden
                  />
                  <Image
                    src={item.filePath ? getItemImageURL(item.filePath) : undefined}
                    alt={item.name}
                    w={30}
                    h={30}
                    fit="contain"
                  />
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fz={13} c="white" lineClamp={1}>
                      {item.name}
                    </Text>
                    <Text fz={10} c="dimmed" tt="capitalize">
                      {item.category} x{item.quantity}
                    </Text>
                  </Box>
                </Group>
              </Card>
            ))}
          </Stack>

          <Card withBorder radius="md" p={12} bg="#181719">
            <Group justify="space-between">
              <Text fz={13} c="dimmed">
                {selected.length} selected (estimate)
              </Text>
              <Text fz={15} fw={700} c="white">
                ~ {payout} Snag Coins
              </Text>
            </Group>
          </Card>

          <Button
            radius="md"
            loading={pending}
            disabled={pending || !selected.length}
            onClick={recycle}
            aria-label="Recycle selected items"
          >
            Recycle selected
          </Button>
        </>
      )}
    </Stack>
  );
}

/** kind "tour": pick a biome, roll for an item. */
const TOUR_AREAS = [
  "Cool Canyon",
  "Beautiful Meadow",
  "Cute Forest",
  "Clever Swamp",
  "Tough Peak",
];

function TourBody() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [area, setArea] = React.useState<string>(TOUR_AREAS[0]);
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
    <Stack gap={16}>
      <Text c="dimmed" fz={13}>
        Pick a biome, then roll. Every fourth roll is free.
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 5 }} spacing="sm">
        {TOUR_AREAS.map((a) => {
          const active = a === area;
          return (
            <Button
              key={a}
              variant={active ? "filled" : "light"}
              color="grape"
              radius="md"
              onClick={() => setArea(a)}
              aria-label={`Choose biome ${a}`}
              aria-pressed={active}
            >
              {a}
            </Button>
          );
        })}
      </SimpleGrid>

      <Button
        radius="md"
        loading={pending}
        disabled={pending}
        onClick={roll}
        aria-label="Roll the tour for 2 Snag Coins"
        maw={240}
      >
        Roll (2 Snag Coins)
      </Button>

      {error && <StatusMessage color="red">{error}</StatusMessage>}

      {result && (
        <Card withBorder radius="md" p={14} bg="#26252a" role="status" aria-live="polite">
          <Group gap={12}>
            <Image
              src={result.item.filePath ? getItemImageURL(result.item.filePath) : undefined}
              alt={result.item.name}
              w={44}
              h={44}
              fit="contain"
            />
            <Box>
              <Text fz={15} fw={700} c="white">
                You found {result.item.name}
              </Text>
              {result.bonusRareCandy && (
                <Text fz={12} c="yellow">
                  Rare Candy bonus!
                </Text>
              )}
              {result.free && (
                <Text fz={12} c="green">
                  free roll
                </Text>
              )}
            </Box>
          </Group>
        </Card>
      )}
    </Stack>
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
    price: string;
    payWith?: "pokecoin" | "snagemblem";
  }> = [
    { key: "unlock_restraints", title: "Unlock Restraints", price: "1 Snag Emblem" },
    { key: "unlock_potential", title: "Unlock Potential", price: "2 Snag Emblems" },
    {
      key: "new_adaptations",
      title: "New Adaptations",
      price: "25 Snag Coins or 2 Snag Emblems",
      payWith: "snagemblem",
    },
  ];

  return (
    <Stack gap={16}>
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

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
        {services.map((svc) => (
          <Card key={svc.key} withBorder radius="md" p={14} bg="#26252a">
            <Stack gap={10}>
              <Text fz={15} fw={700} c="white">
                {svc.title}
              </Text>
              <Text fz={12} c="dimmed">
                {svc.price}
              </Text>
              <Button
                radius="md"
                loading={pending === svc.key}
                disabled={pending === svc.key}
                onClick={() => run(svc.key, svc.payWith)}
                aria-label={`${svc.title} for ${svc.price}`}
              >
                Purchase
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function StorefrontView(props: {
  shop: Shop;
  balance: number;
  onBack: () => void;
}) {
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
    default:
      body = <StoreBody shop={shop} balance={props.balance} />;
  }

  return (
    <Stack gap={18}>
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        onClick={props.onBack}
        aria-label="Back to arcade"
        maw={180}
      >
        Back to arcade
      </Button>

      <Stack gap={6}>
        <Title order={1} c="white" fz={{ base: 24, sm: 30 }} fw={700}>
          {shop.name}
        </Title>
        {shop.flavor_intro && (
          <Box
            c="dimmed"
            style={{ fontSize: 14, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(shop.flavor_intro),
            }}
          />
        )}
      </Stack>

      {body}
    </Stack>
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
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        {props.badge}
      </Box>
      <Box>
        <Text fz={9} c="rgba(255,255,255,0.7)" tt="uppercase" fw={600} lh={1}>
          {props.label}
        </Text>
        <Text fz={14} fw={700} c="white" lh={1.1}>
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

  const shopList = shops ?? [];
  const activeShop = activeShopId
    ? shopList.find((s) => s.id === activeShopId) ?? null
    : null;

  // The user's balance in the active shop's currency (server strings -> number).
  const balance = activeShop
    ? Number(currencies?.[activeShop.currency] ?? 0) || 0
    : 0;

  const snagCoins = currencies?.pokecoin ?? "0";
  const snagEmblems = currencies?.snagemblem ?? "0";

  return (
    <Box>
      {/* Header band */}
      <Box
        px={{ base: 16, sm: 24 }}
        py={{ base: 20, sm: 28 }}
        style={{
          backgroundImage:
            "linear-gradient(135deg, #4a2585, #7b3fb0 60%, #a259c9)",
        }}
      >
        <Container size="lg" px={0}>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap={16}>
            <Stack gap={4}>
              <Group gap={8}>
                <IconShoppingBag size={26} color="white" />
                <Title order={1} c="white" fz={{ base: 24, sm: 30 }} fw={800}>
                  The Snag Mall
                </Title>
              </Group>
              <Text fz={13} c="rgba(255,255,255,0.85)">
                Stroll the arcade, step through any storefront to shop.
              </Text>
            </Stack>
            <Group gap={10} wrap="wrap">
              <CurrencyChip badge="C" label="Snag Coins" value={String(snagCoins)} />
              <CurrencyChip badge="S" label="Snag Emblems" value={String(snagEmblems)} />
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Body */}
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        {shopsPending ? (
          <SectionLoader />
        ) : activeShop ? (
          <StorefrontView
            shop={activeShop}
            balance={balance}
            onBack={() => setActiveShopId(null)}
          />
        ) : (
          <ArcadeView shops={shopList} onEnter={(id) => setActiveShopId(id)} />
        )}
      </Container>
    </Box>
  );
}
