import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  Image,
  MultiSelect,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import { Conditional } from "../../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { AdminPokemonList } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { pokemonData } from "../../../../data/pokemon";
import { getPokemonImageURL } from "../../../../helpers";
import useMediaQuery from "../../../../hooks/useMediaQuery";
import { DocumentCopyIcon, Edit2, Polygon5Icon } from "../../../../icons";
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
              creator: user?.username,
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
  const { isOverXs } = useMediaQuery();

  const handleCreateNewList = async () => {
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
    } catch (err) {
      //
    }
  };
  return (
    <GradientButtonSecondary
      size={isOverXs ? "sm" : "xs"}
      loading={isLoading}
      onClick={handleCreateNewList}
      radius="lg"
    >
      Create New List
    </GradientButtonSecondary>
  );
}

export default function AdjustLists() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  const { isOverXs } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { formattedData } = data;

  if (!formattedData.length)
    return (
      <EmptyMessage
        title="Empty lists"
        description="You currently have no lists created"
        action={<CreateList />}
      />
    );

  return (
    <Stack>
      <Flex gap="md" justify="space-between" align="center">
        <Title color="white" order={2} size={isOverXs ? 24 : 18} weight={400}>
          Groups of Pokemon Encounter Limits
        </Title>
        <CreateList />
      </Flex>
      <ScrollArea>
        <div className="grid grid-cols-4 py-2 w-full min-w-[800px]">
          <span className="text-start text-white uppercase font-[700] text-sm">Name</span>
          <span className="text-start text-white uppercase font-[700] text-sm">Created by</span>
          <span className="text-start text-white uppercase font-[700] text-sm">
            List of Pokemon
          </span>
        </div>
        <div className="flex flex-col gap-2 w-full">
          {formattedData.map((list) => (
            <SingleListItem list={list} key={list.id} />
          ))}
        </div>
      </ScrollArea>
    </Stack>
  );
}

interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
  image: string;
  label: string;
}

const CustomSelectItem = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ image, label, ...others }: ItemProps, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <Avatar size="lg" src={image} />
        <div>
          <Text size="lg" color="white">
            {label}
          </Text>
        </div>
      </Group>
    </div>
  )
);

function PokemonList(props: { pokemons: string[] }) {
  const { pokemons } = props;
  return (
    <Flex wrap="wrap" gap={8}>
      {pokemons.map((pokemonSlug) => (
        <Avatar key={pokemonSlug} src={getPokemonImageURL(pokemonSlug)} size="lg" />
      ))}
    </Flex>
  );
}

type EditListForm = Omit<AdminPokemonList, "id">;

function EditSingleListItem(props: {
  list: AdminPokemonList;
  form: UseFormReturnType<EditListForm>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { form, setEditing, list } = props;
  const { mutateAsync, isLoading } = useUpdateOrAddDocument(list.id);
  const queryClient = useQueryClient();

  const cancelEditing = () => {
    const confirmed = window.confirm("Are you sure you want to quite editing?");
    if (confirmed) {
      form.reset();
      setEditing(false);
    }
  };

  const handleSaveEdits = async () => {
    try {
      await mutateAsync({ values: form.values });
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
      setEditing(false);
    } catch (err) {
      //
    }
  };

  return (
    <Stack spacing={25} className="bg-[#57525B80] p-3 rounded-[8px] w-full text-white">
      <Group position="apart">
        <TextInput
          className="flex-1"
          styles={{ input: { background: "#2E2D2E" } }}
          {...form.getInputProps("name")}
        />
        <Group spacing={5}>
          <Button color="gray" variant="subtle" onClick={cancelEditing}>
            Cancel
          </Button>
          <GradientButtonSecondary loading={isLoading} onClick={handleSaveEdits} size="xs">
            Save Edits
          </GradientButtonSecondary>
        </Group>
      </Group>
      <Group align="start">
        <Select
          {...form.getInputProps("rule")}
          placeholder="Select"
          rightSection={<Image width={15} src={Polygon5Icon} />}
          data={[
            { value: "only", label: "Only" },
            { value: "except", label: "All Except" },
          ]}
          label="Rule"
          styles={{ input: { background: "#2E2D2E" } }}
        />
        <React.Suspense fallback={<></>}>
          <MultiSelect
            {...form.getInputProps("pokemons")}
            data={pokemonData.map((pokemon) => ({
              label: pokemon.name,
              value: pokemon.slug,
              image: getPokemonImageURL(pokemon.slug),
            }))}
            itemComponent={CustomSelectItem}
            rightSection={<></>}
            nothingFound="No pokemon found"
            maxDropdownHeight={400}
            limit={20}
            searchable
            placeholder="Search to add a pokemon to the list"
            className="flex-1"
            styles={{ input: { background: "#2E2D2E" } }}
            label="Search and add"
          />
        </React.Suspense>
        <Checkbox
          pt={25}
          {...form.getInputProps("public")}
          checked={form.values.public}
          size="lg"
          styles={{ input: { background: "#2E2D2E" } }}
          w={100}
          label="Public"
          color="green.0"
        />
      </Group>
      <Stack spacing={6}>
        <Title weight={700} order={3} color="white" size={14} transform="uppercase">
          LIST OF POKEMON
        </Title>
        <Box p={20} sx={{ borderRadius: 22 }} w="100%" bg="#5A545F">
          <Conditional
            condition={!!form.values.pokemons.length}
            component={<PokemonList pokemons={form.values.pokemons} />}
            fallback={
              <EmptyMessage
                title="Empty list"
                description="You currently have no pokemons added in this list"
              />
            }
          />
        </Box>
      </Stack>
    </Stack>
  );
}

function DeleteSingleListItem(props: { itemId: string }) {
  const { itemId } = props;
  const [opened, { open, close }] = useDisclosure();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: async ({ itemIdInput }: { itemIdInput: string }) => {
      const { setDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");

      const docRef = doc(db, "admin", "pokemon_lists");
      const {
        data: { [itemIdInput]: documentToBeDeleted, ...rest },
      } = await getPokemonLists();

      await setDoc(docRef, {
        ...rest,
      });
    },
  });

  const handleDelete = async () => {
    if (user?.otherinfo?.permissions !== "Admin") return;
    try {
      await mutateAsync({ itemIdInput: itemId });
      close();
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
    } catch (err) {
      //
    }
  };

  return (
    <Popover withArrow opened={opened} onClose={close}>
      <Popover.Target>
        <ActionIcon onClick={open} color="red" variant="transparent">
          <IconTrash size={20} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Text>Are you sure, you want to delete this list?</Text>
          <Group>
            <Button loading={isLoading} onClick={handleDelete}>
              Yes
            </Button>
            <Button onClick={close} loading={isLoading} color="gray">
              No
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function DuplicateListItem(props: { listItem: AdminPokemonList }) {
  const {
    listItem: { id, ...values },
  } = props;
  const { mutateAsync, isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();
  const handleDuplicateListItem = async () => {
    try {
      await mutateAsync({ values: { ...values, name: `${values.name} [DUPLICATE]` } });
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
    } catch (err) {
      //
    }
  };
  return (
    <GradientButtonPrimary
      loading={isLoading}
      onClick={handleDuplicateListItem}
      size="xs"
      rightIcon={<Image src={DocumentCopyIcon} />}
    >
      Duplicate
    </GradientButtonPrimary>
  );
}

function SingleListItem(props: { list: AdminPokemonList }) {
  const { list } = props;
  const form = useForm<EditListForm>({
    initialValues: list,
  });
  const [isEditing, setEditing] = React.useState(false);

  if (isEditing) return <EditSingleListItem list={list} form={form} setEditing={setEditing} />;

  return (
    <div className="bg-[#57525B80] p-3 rounded-[8px] grid grid-cols-4 w-full text-white">
      <Stack align="start" spacing={10}>
        <Text size={16}>{list.name || "Untitled"}</Text>
        <DuplicateListItem listItem={list} />
      </Stack>
      <Stack spacing={6} align="start">
        <Text>{list.creator}</Text>
        {list.public ? (
          <Badge color="green.0" variant="filled">
            Public List
          </Badge>
        ) : (
          <Badge color="pink.3" variant="filled">
            Private List
          </Badge>
        )}
      </Stack>
      <Stack w="100%" spacing={3}>
        <Conditional
          condition={list.rule === "only"}
          component={<Text>Only</Text>}
          fallback={<Text>All Except</Text>}
        />
        <PokemonList pokemons={list.pokemons} />
      </Stack>
      <Stack align="end">
        <Group>
          <DeleteSingleListItem itemId={list.id} />
          <GradientButtonPrimary
            onClick={() => setEditing(true)}
            size="xs"
            radius="lg"
            rightIcon={<Image src={Edit2} />}
          >
            Edit
          </GradientButtonPrimary>
        </Group>
      </Stack>
    </div>
  );
}
