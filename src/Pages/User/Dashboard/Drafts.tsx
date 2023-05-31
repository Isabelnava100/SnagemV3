import { Flex, Image, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
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
  const { isOverLg } = useMediaQuery();
  return (
    <Paper bg="#3E3D3D" radius={15} py={0} sx={{ overflow: "hidden" }}>
      <Flex justify="space-between" align="start">
        <Stack py={10} px={18}>
          <Title order={3} size={20} color="white">
            {props.title_thread}
          </Title>
        </Stack>
        <Stack
          bg={props.color}
          sx={{ borderTopLeftRadius: 100 }}
          align="end"
          px={isOverLg ? 20 : 10}
          py={10}
        >
          <Image src={Edit} alt="Draft icon" width={45} />
          <Text align="end" color="white">
            Draft saved at
            <br />
            {formatter.format(new Date(props.date_saved.seconds))}
          </Text>
        </Stack>
      </Flex>
    </Paper>
  );
}
