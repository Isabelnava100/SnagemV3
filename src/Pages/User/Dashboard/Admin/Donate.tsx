import { Box, Flex, Image, MultiSelect, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import { Conditional } from "../../../../components/common/Conditional";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { itemData } from "../../../../data/item";
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

  const [toUserIds, setToUserIds] = React.useState<string[]>([]);
  const toUsers = React.useMemo(() => {
    return users?.filter((user) => toUserIds.includes(user.id));
  }, [toUserIds]);

  const [itemsToSendIds, setItemsToSendIds] = React.useState<string[]>([]);
  const [itemsToSendQtys, setItemsToSendQtys] = React.useState<Record<string, number>>({});
  const itemsToSendWithQty = React.useMemo(() => {
    return itemData
      .map((item) => ({ ...item, quantity: itemsToSendQtys[item.id] || 1 }))
      .filter((item) => itemsToSendIds.includes(item.id));
  }, [itemsToSendIds, itemsToSendQtys]);

  return (
    <Stack spacing={24}>
      <Flex gap={10}>
        <Stack w="100%">
          <Stack sx={{ flex: 1 }} spacing={7}>
            <TopHeader>Items to send</TopHeader>
            <MultiSelect
              radius="md"
              value={itemsToSendIds}
              onChange={(value) => setItemsToSendIds(value)}
              data={itemData.map((item) => ({ label: item.name, value: item.id }))}
              searchable
              limit={20}
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
                        <Text size={16} weight={400} color="white">
                          {item.name}
                        </Text>
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
        <Stack w="100%" sx={{ flexShrink: 0 }} maw={250} spacing={7}>
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

      <GradientButtonSecondary sx={{ alignSelf: "end" }} radius="lg">
        Send Items
      </GradientButtonSecondary>

      {/* Confirmation */}
      {false && (
        <Stack spacing={24}>
          <Title order={2} color="white" size={24} weight={400}>
            Confirm that you&apos;ll be sending these items to these users...
          </Title>
          <Flex gap={10}>
            <Stack bg="#4C474F" sx={{ flex: 1, borderRadius: 8 }} spacing={0}>
              <TopHeader>Items to send</TopHeader>
              <Box p={8}>
                <h1>Content</h1>
              </Box>
            </Stack>
            <Stack
              w="100%"
              maw={250}
              sx={{ borderRadius: 8, flexShrink: 0 }}
              bg="#4C474F"
              spacing={0}
            >
              <TopHeader>To users</TopHeader>
              <Box p={8}>
                <Stack spacing="xs">
                  {toUsers?.map((user) => (
                    <Text color="white" size={16} weight={400} key={user.id}>
                      {user.username}
                    </Text>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Flex>
          <GradientButtonSecondary sx={{ alignSelf: "end" }} radius="lg">
            Confirm
          </GradientButtonSecondary>
        </Stack>
      )}
    </Stack>
  );
}
