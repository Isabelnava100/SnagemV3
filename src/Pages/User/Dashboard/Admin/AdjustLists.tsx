import { Badge, Flex, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuid } from "uuid";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { AdminPokemonList } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { getPokemonLists } from "../../../../queries/admin";

function useUpdateOrAddDocument(documentId?: string) {
  const { user } = useAuth();
  const mutation = useMutation({
    mutationKey: ["updates-admin-pokemon-lists"],
    mutationFn: async ({ values }: { values?: Omit<AdminPokemonList, "id"> }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");

      const docRef = doc(db, "admin", "pokemon_lists");
      await setDoc(
        docRef,
        {
          [documentId || uuid()]:
            values ||
            ({
              creator: user?.displayName,
              pokemons: [],
              public: false,
              rule: "only",
              name: "Untitled",
            } as Omit<AdminPokemonList, "id">),
        },
        { merge: true }
      );
    },
  });
  return mutation;
}

function CreateList() {
  const { mutateAsync, isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();

  const handleCreateNewList = async () => {
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
    } catch (err) {
      //
    }
  };
  return (
    <GradientButtonSecondary loading={isLoading} onClick={handleCreateNewList} radius="lg">
      Create New List
    </GradientButtonSecondary>
  );
}

export default function AdjustLists() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
  });

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { formattedData } = data;

  if (!formattedData.length)
    return <EmptyMessage title="Empty lists" description="You currently have no lists created" />;

  return (
    <Stack>
      <Flex justify="space-between" align="center">
        <Title color="white" order={2} size={24} weight={400}>
          Groups of Pokemon Encounter Limits
        </Title>
        <CreateList />
      </Flex>
      <div>
        <div className="grid grid-cols-3 py-2">
          <span className="text-start text-white uppercase font-[700] text-sm">Name</span>
          <span className="text-start text-white uppercase font-[700] text-sm">Created by</span>
          <span className="text-start text-white uppercase font-[700] text-sm">
            List of Pokemon
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {formattedData.map((list) => (
            <div className="bg-[#57525B80] p-3 rounded-[8px] grid grid-cols-3 w-full">
              <Stack align="start">
                <Text>{list.name || "Untitled"}</Text>
                <GradientButtonPrimary>Duplicate</GradientButtonPrimary>
              </Stack>
              <Stack align="start">
                <Text>{list.creator}</Text>
                <Badge>{list.public ? "Public list" : "Private list"}</Badge>
              </Stack>
              <Stack>
                <Text>{list.rule}</Text>
              </Stack>
            </div>
          ))}
        </div>
      </div>
    </Stack>
  );
}
