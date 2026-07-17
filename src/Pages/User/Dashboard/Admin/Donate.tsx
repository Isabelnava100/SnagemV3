import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  Image,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { Conditional } from "../../../../components/common/Conditional";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { itemData } from "../../../../data/item";
import { pokemonData } from "../../../../data/pokemon";
import { getItemImageURL, getPokemonImageURL } from "../../../../helpers";
import useMediaQuery from "../../../../hooks/useMediaQuery";
import { ItemIcon } from "../../../../icons";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { hasCapability } from "../../../../lib/permissions";
import { toastError, toastSuccess } from "../../../../lib/toast";
import { getUsers } from "../../../../queries/admin";

// The catalog is ordered balls-first; sort alphabetically so the dropdown
// surfaces the whole catalog (not just balls) when browsing.
const ITEM_SELECT_OPTIONS = itemData
  .map((item) => ({ value: item.id, label: item.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

// Show the item's sprite next to its (complete) name in the dropdown.
function renderItemOption({ option }: { option: { value: string; label: string } }) {
  const item = itemData.find((i) => i.id === option.value);
  return (
    <Group gap={8} wrap="nowrap">
      {item && <Avatar src={getItemImageURL(item.filePath)} alt={item.name} size={26} />}
      <Text fz={14} c="white">
        {option.label}
      </Text>
    </Group>
  );
}

function TopHeader(props: { children: React.ReactNode }) {
  return (
    <Box
      px={15}
      sx={{ background: "linear-gradient(90deg, #742D78 0%, #239DAD 100%)", borderRadius: 8 }}
      py={10}
    >
      <Title c="white" tt="uppercase" order={3} fz={14} fw={700}>
        {props.children}
      </Title>
    </Box>
  );
}

export default function Donate() {
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ["get-all-users"],
    queryFn: getUsers,
  });

  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isSending, setSending] = React.useState(false);

  const [toUserIds, setToUserIds] = React.useState<string[]>([]);
  const toUsers = React.useMemo(() => {
    return users?.filter((user) => toUserIds.includes(user.id)) || [];
  }, [toUserIds]);

  const [itemsToSendIds, setItemsToSendIds] = React.useState<string[]>([]);
  const [itemsToSendQtys, setItemsToSendQtys] = React.useState<Record<string, number>>({});
  const itemsToSendWithQty = React.useMemo(() => {
    return itemData
      .map((item) => ({ ...item, quantity: itemsToSendQtys[item.id] || 1 }))
      .filter((item) => itemsToSendIds.includes(item.id));
  }, [itemsToSendIds, itemsToSendQtys]);

  const uniqueCategoriesSelectedToSend = React.useMemo(() => {
    const uniqueGroupsSet = new Set<string>();

    itemsToSendWithQty.forEach((item) => {
      uniqueGroupsSet.add(item.category);
    });

    return Array.from(uniqueGroupsSet) || [];
  }, [itemsToSendWithQty]);

  const queryClient = useQueryClient();
  const { isOverXl } = useMediaQuery();
  const { user } = useAuth();
  // Admins have this implicitly; Directors need the GiveItems grant. The parent
  // route is still Admin-only until the Director capability checklist ships.
  const canGiveItems = hasCapability(user, Capability.GiveItems);

  const handleShowConfirmation = () => {
    if (itemsToSendWithQty.length > 0 && toUsers?.length > 0) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmAndSendItemsToUsers = async () => {
    if (!canGiveItems) return;
    try {
      setSending(true);
      const { doc, setDoc, increment } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");

      for (const recipient of toUsers) {
        const docRef = doc(db, "users", recipient.id, "bag", "items");
        for (const { id: itemId, ...item } of itemsToSendWithQty) {
          await setDoc(
            docRef,
            { [itemId]: { ...item, quantity: increment(item.quantity) } },
            { merge: true }
          );
        }
        await logAuditEvent({
          action: "items.grant",
          ...actorFrom(user),
          targetPath: `users/${recipient.id}`,
          details: {
            items: itemsToSendWithQty.map((i) => ({ id: i.id, quantity: i.quantity })),
          },
        });
      }

      setItemsToSendIds([]);
      setItemsToSendQtys({});
      setToUserIds([]);
      setShowConfirmation(false);

      await queryClient.invalidateQueries({ queryKey: ["get-items"] });
      toastSuccess("Items sent.");
    } catch (err) {
      toastError(err, "Could not send the items.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack gap={24}>
      <Text fz={13} c="dimmed">
        Send items, currency or pokemon straight to a member. Grants apply immediately, are recorded
        in the activity log, and notify the recipient. There is no undo, so double-check the
        recipient and amounts before sending.
      </Text>
      <Flex direction={isOverXl ? "row" : "column"} gap={10}>
        <Stack w="100%">
          <Stack sx={{ flex: 1 }} gap={7}>
            <TopHeader>Items to send</TopHeader>
            <MultiSelect
              radius="md"
              value={itemsToSendIds}
              onChange={(value) => setItemsToSendIds(value)}
              data={ITEM_SELECT_OPTIONS}
              renderOption={renderItemOption}
              searchable
              limit={100}
              maxDropdownHeight={320}
              placeholder="Search to add an item"
            />
          </Stack>
          <Stack gap={10}>
            <div className="grid grid-cols-2">
              <div className="flex gap-1 items-center justify-start uppercase text-white font-[700]">
                {/* Fixed box + fit=contain: Mantine 9 Image ignores numeric
                    width/height, so constrain the box to size the icon. */}
                <Box w={24} h={24} style={{ flexShrink: 0 }}>
                  <Image src={ItemIcon} alt="Donate items" w="100%" h="100%" fit="contain" />
                </Box>
                <span>Items</span>
              </div>
              <div className="uppercase text-end text-white font-[700]">Qty to give</div>
            </div>
            <SimpleSectionWrapper borderRadius={8} bg="#1E1D20">
              <Conditional
                condition={!itemsToSendWithQty.length}
                component={
                  <EmptyMessage
                    title="No items selected"
                    description="No items were selected for sending"
                  />
                }
                fallback={
                  <Stack>
                    {itemsToSendWithQty.map((item) => (
                      <div key={item.id} className="grid grid-cols-2 border-b-2 border-[#D9D9D9]">
                        <Group gap={5}>
                          <Box w={30} h={30} style={{ flexShrink: 0 }}>
                            <Image
                              w="100%"
                              h="100%"
                              fit="contain"
                              src={getItemImageURL(item.filePath)}
                              alt={item.name}
                            />
                          </Box>
                          <Text fz={16} fw={400} c="white">
                            {item.name}
                          </Text>
                        </Group>
                        <div className="flex justify-end">
                          <input
                            type="number"
                            aria-label={`Quantity of ${item.name} to send`}
                            onChange={(e) =>
                              setItemsToSendQtys((pre) => ({
                                ...pre,
                                [item.id]: parseInt(e.target.value),
                              }))
                            }
                            className="w-[50px] text-center border-none outline-none rounded-[12px] px-[10px] py-[5px]"
                            defaultValue={1}
                            min={1}
                          />
                        </div>
                      </div>
                    ))}
                  </Stack>
                }
              />
            </SimpleSectionWrapper>
          </Stack>
        </Stack>
        <Stack w="100%" sx={{ flexShrink: 0 }} maw={isOverXl ? 250 : undefined} gap={7}>
          <TopHeader>To users</TopHeader>
          <MultiSelect
            disabled={isUsersLoading}
            radius="md"
            searchable
            data={users?.map((user) => ({ label: user.username, value: user.id })) || []}
            value={toUserIds}
            onChange={(value) => setToUserIds(value)}
            placeholder="Search to add users"
            limit={20}
          />
        </Stack>
      </Flex>

      <Conditional
        condition={!showConfirmation}
        fallback={<></>}
        component={
          <GradientButtonSecondary
            onClick={handleShowConfirmation}
            sx={{ alignSelf: "end" }}
            radius="lg"
          >
            Send Items
          </GradientButtonSecondary>
        }
      />

      {/* Confirmation */}
      {showConfirmation && (
        <Stack gap={24}>
          <Title order={2} c="white" size={24} fw={400}>
            Confirm that you&apos;ll be sending these items to these users...
          </Title>
          <Flex direction={isOverXl ? "row" : "column"} gap={10}>
            <Stack bg="#4C474F" sx={{ flex: 1, borderRadius: 8 }} gap={0}>
              <TopHeader>Items to send</TopHeader>
              <Stack p={8} gap={16}>
                {uniqueCategoriesSelectedToSend.map((categoryName) => (
                  <Stack gap={7} key={categoryName}>
                    <Text
                      px={14}
                      py={7}
                      w="100%"
                      bg="rgba(96, 42, 90, 0.50)"
                      className="rounded-[22px]"
                      color="white"
                      fw={400}
                      fz={14}
                    >
                      Category: {categoryName}
                    </Text>
                    <Stack>
                      {itemsToSendWithQty
                        .filter((item) => item.category === categoryName)
                        .map((item) => (
                          <Box key={item.id}>
                            <Group gap={8}>
                              <Box w={30} h={30} style={{ flexShrink: 0 }}>
                                <Image
                                  w="100%"
                                  h="100%"
                                  fit="contain"
                                  src={getItemImageURL(item.filePath)}
                                  alt={item.name}
                                />
                              </Box>
                              <Group>
                                <Text fz={16} c="white" fw={400}>
                                  {item.quantity}
                                </Text>
                                <Text fz={16} c="white" fw={400}>
                                  {item.name}
                                </Text>
                              </Group>
                            </Group>
                          </Box>
                        ))}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Stack>
            <Stack
              w="100%"
              maw={isOverXl ? 250 : undefined}
              sx={{ borderRadius: 8, flexShrink: 0 }}
              bg="#4C474F"
              gap={0}
            >
              <TopHeader>To users</TopHeader>
              <Box p={8}>
                <Stack gap="xs">
                  {toUsers?.map((user) => (
                    <Group key={user.id} gap={6}>
                      <Avatar alt={`${user.username ?? "User"} avatar`} sx={{ borderRadius: "100%" }} />
                      <Text c="white" fz={16} fw={400} key={user.id}>
                        {user.username}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Flex>
          <Group w="100%" sx={{ justifyContent: "end" }}>
            <Button
              disabled={isSending}
              onClick={() => setShowConfirmation(false)}
              color="gray"
              variant="light"
            >
              Cancel
            </Button>
            <GradientButtonSecondary
              loading={isSending}
              onClick={handleConfirmAndSendItemsToUsers}
              sx={{ alignSelf: "end" }}
              radius="lg"
            >
              Confirm
            </GradientButtonSecondary>
          </Group>
        </Stack>
      )}

      <GiveCurrencySection />
      <GivePokemonSection />
    </Stack>
  );
}

/**
 * Grant a Pokemon (optionally shiny) directly to users. Admins / GiveItems
 * directors. Runs through the grantPokemon Cloud Function.
 */
function GivePokemonSection() {
  const { data: users } = useQuery({ queryKey: ["get-users"], queryFn: getUsers });
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [shiny, setShiny] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const { callGrantPokemon } = await import("../../../forum/functionsClient");
      await callGrantPokemon(userIds, slug!, shiny);
    },
    onSuccess: () => {
      setUserIds([]);
      setSlug(null);
      setShiny(false);
      setMessage("Pokemon sent!");
    },
    onError: async (err) => {
      const { callableMessage } = await import("../../../forum/functionsClient");
      setMessage(callableMessage(err, "Sending failed. Try again."));
    },
  });

  return (
    <Stack gap={10} mt={20}>
      <Title order={2} c="white" size={24} fw={400}>
        Give Pokemon to Users
      </Title>
      <Flex gap={10} wrap="wrap" align="center">
        <MultiSelect
          radius="md"
          searchable
          data={users?.map((u) => ({ label: u.username, value: u.id })) || []}
          value={userIds}
          onChange={setUserIds}
          placeholder="Search to add users"
          limit={20}
          w={260}
        />
        <Select
          radius="md"
          searchable
          data={pokemonData.map((p) => ({ value: p.slug, label: p.name }))}
          value={slug}
          onChange={setSlug}
          placeholder="Search a Pokemon"
          limit={20}
          w={220}
        />
        {slug && (
          <Avatar src={getPokemonImageURL(slug, shiny)} alt={slug} size={40} radius="xl" />
        )}
        <Checkbox
          label="Shiny"
          color="green.0"
          checked={shiny}
          onChange={(e) => setShiny(e.currentTarget.checked)}
        />
        <GradientButtonSecondary
          radius="lg"
          disabled={!userIds.length || !slug}
          loading={isPending}
          onClick={() => {
            if (
              !window.confirm(
                `Send ${shiny ? "a shiny " : "a "}${slug} to ${userIds.length} ${
                  userIds.length === 1 ? "user" : "users"
                }? This grant is immediate and cannot be undone.`
              )
            )
              return;
            setMessage("");
            mutateAsync();
          }}
        >
          Send Pokemon
        </GradientButtonSecondary>
      </Flex>
      {message && (
        <Text
          fz={13}
          c={message === "Pokemon sent!" ? "green.0" : "#E35C65"}
          role="status"
          aria-live="polite"
        >
          {message}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Direct currency grants (Q1): admins / GiveItems directors add money to
 * users. Runs through the grantCurrency Cloud Function (string-safe math,
 * audit log, in-app notification to recipients).
 */
function GiveCurrencySection() {
  const { data: users } = useQuery({ queryKey: ["get-users"], queryFn: getUsers });
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const [currency, setCurrency] = React.useState<string>("pokecoin");
  const [amount, setAmount] = React.useState<number>(1);
  const [confirming, setConfirming] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const { callGrantCurrency } = await import("../../../forum/functionsClient");
      await callGrantCurrency(userIds, currency, amount);
    },
    onSuccess: () => {
      setConfirming(false);
      setUserIds([]);
      setMessage("Currency sent!");
    },
    onError: async (err) => {
      const { callableMessage } = await import("../../../forum/functionsClient");
      setConfirming(false);
      setMessage(callableMessage(err, "Sending failed. Try again."));
    },
  });

  const currencyLabel =
    currency === "pokecoin" ? "Poke Coins" : currency === "gengarcoin" ? "Gengar Coins" : "Snag Emblems";

  return (
    <Stack gap={10} mt={20}>
      <Title order={2} c="white" size={24} fw={400}>
        Give Currency to Users
      </Title>
      <Flex gap={10} wrap="wrap" align="center">
        <MultiSelect
          radius="md"
          searchable
          data={users?.map((u) => ({ label: u.username, value: u.id })) || []}
          value={userIds}
          onChange={setUserIds}
          placeholder="Search to add users"
          limit={20}
          w={260}
        />
        <Select
          data={[
            { value: "pokecoin", label: "Poke Coin" },
            { value: "gengarcoin", label: "Gengar Coin" },
            { value: "snagemblem", label: "Snag Emblems" },
          ]}
          value={currency}
          onChange={(v) => setCurrency(v ?? "pokecoin")}
          w={150}
        />
        <NumberInput
          value={amount}
          onChange={(v) => setAmount(Math.max(1, Number(v) || 1))}
          min={1}
          w={100}
        />
        {confirming ? (
          <Group gap={6}>
            <Text fz={13} c="white">
              Send {amount} {currencyLabel} to {userIds.length} user
              {userIds.length === 1 ? "" : "s"}?
            </Text>
            <Button size="xs" color="gray" variant="light" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <GradientButtonSecondary
              size="xs"
              radius="lg"
              loading={isPending}
              onClick={() => mutateAsync()}
            >
              Confirm
            </GradientButtonSecondary>
          </Group>
        ) : (
          <GradientButtonSecondary
            radius="lg"
            disabled={!userIds.length}
            onClick={() => {
              setMessage("");
              setConfirming(true);
            }}
          >
            Send Currency
          </GradientButtonSecondary>
        )}
      </Flex>
      {message && (
        <Text fz={13} c={message === "Currency sent!" ? "green.0" : "#E35C65"}>
          {message}
        </Text>
      )}
    </Stack>
  );
}
