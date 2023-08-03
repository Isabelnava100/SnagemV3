import {
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  Image,
  MultiSelect,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { Conditional } from "../../../../components/common/Conditional";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { itemData } from "../../../../data/item";
import { getItemImageURL } from "../../../../helpers";
import useMediaQuery from "../../../../hooks/useMediaQuery";
import { ItemIcon } from "../../../../icons";
import { getUsers } from "../../../../queries/admin";

function TopHeader(props: { children: React.ReactNode }) {
  return (
    <Box
      px={15}
      sx={{ background: "linear-gradient(90deg, #742D78 0%, #239DAD 100%)", borderRadius: 8 }}
      py={10}
    >
      <Title color="white" transform="uppercase" order={3} size={14} weight={700}>
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

  const handleShowConfirmation = () => {
    if (itemsToSendWithQty.length > 0 && toUsers?.length > 0) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmAndSendItemsToUsers = async () => {
    try {
      setSending(true);
      const { doc, setDoc, increment } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");

      for (const user of toUsers) {
        const docRef = doc(db, "users", user.id, "bag", "items");
        for (const { id: itemId, ...item } of itemsToSendWithQty) {
          await setDoc(
            docRef,
            { [itemId]: { ...item, quantity: increment(item.quantity) } },
            { merge: true }
          );
        }
      }

      setItemsToSendIds([]);
      setItemsToSendQtys({});
      setToUserIds([]);
      setShowConfirmation(false);

      await queryClient.invalidateQueries({ queryKey: ["get-items"] });
    } catch (err) {
      //
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack spacing={24}>
      <Flex direction={isOverXl ? "row" : "column"} gap={10}>
        <Stack w="100%">
          <Stack sx={{ flex: 1 }} spacing={7}>
            <TopHeader>Items to send</TopHeader>
            <MultiSelect
              radius="md"
              value={itemsToSendIds}
              onChange={(value) => setItemsToSendIds(value)}
              data={itemData.map((item) => ({ label: item.name, value: item.id }))}
              searchable
              limit={50}
              placeholder="Search to add an item"
            />
          </Stack>
          <Stack spacing={10}>
            <div className="grid grid-cols-2">
              <div className="flex gap-1 items-center justify-start uppercase text-white font-[700]">
                <Image
                  src={ItemIcon}
                  alt="Donate items"
                  width={24}
                  height={24}
                  className="object-cover"
                />
                <span>Items</span>
              </div>
              <div className="uppercase text-end text-white font-[700]">Qty to give</div>
            </div>
            <SimpleSectionWrapper borderRadius={8} bg="#57525B">
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
                        <Group spacing={5}>
                          <Image
                            width={30}
                            className="object-cover"
                            src={getItemImageURL(item.filePath)}
                            alt={item.name}
                          />
                          <Text size={16} weight={400} color="white">
                            {item.name}
                          </Text>
                        </Group>
                        <div className="flex justify-end">
                          <input
                            type="number"
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
        <Stack w="100%" sx={{ flexShrink: 0 }} maw={isOverXl ? 250 : undefined} spacing={7}>
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
        <Stack spacing={24}>
          <Title order={2} color="white" size={24} weight={400}>
            Confirm that you&apos;ll be sending these items to these users...
          </Title>
          <Flex direction={isOverXl ? "row" : "column"} gap={10}>
            <Stack bg="#4C474F" sx={{ flex: 1, borderRadius: 8 }} spacing={0}>
              <TopHeader>Items to send</TopHeader>
              <Stack p={8} spacing={16}>
                {uniqueCategoriesSelectedToSend.map((categoryName) => (
                  <Stack spacing={7} key={categoryName}>
                    <Text
                      px={14}
                      py={7}
                      w="100%"
                      bg="rgba(96, 42, 90, 0.50)"
                      className="rounded-[22px]"
                      color="white"
                      weight={400}
                      size={14}
                    >
                      Category: {categoryName}
                    </Text>
                    <Stack>
                      {itemsToSendWithQty
                        .filter((item) => item.category === categoryName)
                        .map((item) => (
                          <Box key={item.id}>
                            <Group spacing={8}>
                              <Image
                                width={30}
                                className="object-cover"
                                src={getItemImageURL(item.filePath)}
                                alt={item.name}
                              />
                              <Group>
                                <Text size={16} color="white" weight={400}>
                                  {item.quantity}
                                </Text>
                                <Text size={16} color="white" weight={400}>
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
              spacing={0}
            >
              <TopHeader>To users</TopHeader>
              <Box p={8}>
                <Stack spacing="xs">
                  {toUsers?.map((user) => (
                    <Group key={user.id} spacing={6}>
                      <Avatar sx={{ borderRadius: "100%" }} />
                      <Text color="white" size={16} weight={400} key={user.id}>
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
    </Stack>
  );
}
