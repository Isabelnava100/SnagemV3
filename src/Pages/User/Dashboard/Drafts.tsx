import { ActionIcon, Flex, Image, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { SectionLoader } from "../../../components/navigation/loading";
import { Draft } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit } from "../../../icons";
import { getDrafts } from "../../../queries/dashboard";
import formatter from "../../../utils/date";

export default function Drafts() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-drafts"],
    queryFn: () => getDrafts(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  return (
    <SimpleGrid cols={isOverLg ? 2 : 1}>
      {data.map((draft) => (
        <SingleDraft key={draft.id} {...draft} />
      ))}
    </SimpleGrid>
  );
}

function SingleDraft(props: Draft) {
  const { isOverSm } = useMediaQuery();
  return (
    <Paper bg="#3E3D3D" radius={15} py={0} sx={{ overflow: "hidden" }}>
      <Flex
        justify="space-between"
        sx={{ flexDirection: isOverSm ? "row" : "column" }}
        align="start"
      >
        <Stack py={10} px={18}>
          <Title order={3} size={20} color="white">
            {props.title_thread}
          </Title>
        </Stack>
        <Stack
          bg={props.color}
          sx={{
            borderTopLeftRadius: isOverSm ? 100 : undefined,
            borderRadius: isOverSm ? undefined : 15,
          }}
          align={isOverSm ? "end" : undefined}
          px={isOverSm ? 20 : undefined}
          py={isOverSm ? 10 : undefined}
          miw={200}
          w={isOverSm ? undefined : "100%"}
        >
          <Flex
            justify="center"
            sx={{ flexDirection: isOverSm ? "column" : "row-reverse" }}
            align={isOverSm ? "end" : "center"}
            px={7}
            py={8}
            gap={isOverSm ? 10 : 15}
          >
            <ActionIcon variant="transparent" size="xl">
              <Image src={Edit} alt="Draft icon" width={45} />
            </ActionIcon>
            <Text align="end" color="white">
              Draft saved at:
              <br />
              {formatter.format(new Date(props.date_saved.seconds))}
            </Text>
          </Flex>
        </Stack>
      </Flex>
    </Paper>
  );
}
