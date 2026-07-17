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
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
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
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { pokemonData } from "../../../../data/pokemon";
import { getPokemonImageURL } from "../../../../helpers";
import useMediaQuery from "../../../../hooks/useMediaQuery";
import { DocumentCopyIcon, Edit2 } from "../../../../icons";
import { getPokemonLists } from "../../../../queries/admin";
import { toastError, toastSuccess } from "../../../../lib/toast";

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
      await logAuditEvent({
        action: "lists.edit",
        ...actorFrom(user),
        targetPath: "admin/pokemon_lists",
        details: { list: values?.name, pokemon: values?.pokemons?.length },
      });
    },
  });
  return mutation;
}

function CreateList() {
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();
  const { isOverXs } = useMediaQuery();

  const handleCreateNewList = async () => {
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
      toastSuccess("New list created.");
    } catch (err) {
      toastError(err, "Could not create the list.");
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
  const { data, isPending: isLoading, isError } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  const { isOverXs } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError)
    return (
      <Text c="red.4" role="status" aria-live="polite">
        Could not load the encounter lists. Refresh the page to try again.
      </Text>
    );

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
        <Title c="white" order={2} size={isOverXs ? 24 : 18} fw={400}>
          Groups of Pokemon Encounter Limits
        </Title>
        <CreateList />
      </Flex>
      <Text fz={13} c="dimmed">
        Reusable encounter pools a host can attach to a roleplay. Set the rule to <b>Only</b> to
        limit a thread to just the pokemon you pick, or <b>All Except</b> to allow everything but
        them. <b>Public</b> lists show up in the Library&apos;s Field Registers for every host to
        use; private lists are yours only.
      </Text>
      {/* Header row is desktop-only; mobile cards are self-labeled. */}
      <div className="hidden lg:grid grid-cols-4 py-2 w-full">
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
      <Group wrap="nowrap">
        <Avatar size="lg" src={image} alt={label} />
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
        <Avatar key={pokemonSlug} src={getPokemonImageURL(pokemonSlug)} alt={`${pokemonSlug} sprite`} size="lg" />
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
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument(list.id);
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
      toastSuccess("List saved.");
    } catch (err) {
      toastError(err, "Could not save the list.");
    }
  };

  return (
    <Stack gap={25} className="bg-[#1E1D2080] p-3 rounded-[8px] w-full text-white">
      <Group justify="space-between">
        <TextInput
          className="flex-1"
          styles={{ input: { background: "#2E2D2E" } }}
          {...form.getInputProps("name")}
        />
        <Group gap={5}>
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
            renderOption={({ option }) => (
              <CustomSelectItem image={(option as any).image} label={option.label} />
            )}
            rightSection={<></>}
            nothingFoundMessage="No pokemon found"
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
      <Stack gap={6}>
        <Title fw={700} order={3} c="white" size={14} tt="uppercase">
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

  const { mutateAsync, isPending: isLoading } = useMutation({
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
      toastSuccess("List deleted.");
    } catch (err) {
      toastError(err, "Could not delete the list.");
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
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();
  const handleDuplicateListItem = async () => {
    try {
      await mutateAsync({ values: { ...values, name: `${values.name} [DUPLICATE]` } });
      await queryClient.invalidateQueries({ queryKey: ["get-admin-pokemon-lists"] });
      toastSuccess("List duplicated.");
    } catch (err) {
      toastError(err, "Could not duplicate the list.");
    }
  };
  return (
    <GradientButtonPrimary
      loading={isLoading}
      onClick={handleDuplicateListItem}
      size="xs"
      rightSection={<Image src={DocumentCopyIcon} alt="Duplicate" />}
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
    <div className="bg-[#1E1D2080] p-3 rounded-[8px] flex flex-col gap-3 lg:grid lg:grid-cols-4 lg:gap-0 lg:items-start w-full text-white">
      {/* Name + duplicate */}
      <Stack align="start" gap={8}>
        <Text fz={16} fw={600}>
          {list.name || "Untitled"}
        </Text>
        <DuplicateListItem listItem={list} />
      </Stack>

      {/* Created by + visibility */}
      <Group gap={8} align="center">
        <Text fz={13} c="dimmed" className="lg:hidden">
          Created by
        </Text>
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
      </Group>

      {/* Rule + pokemon list */}
      <Stack w="100%" gap={4}>
        <Text fz={13} c="dimmed">
          {list.rule === "only" ? "Only these pokemon" : "All except these pokemon"}
        </Text>
        <PokemonList pokemons={list.pokemons} />
      </Stack>

      {/* Actions */}
      <Group gap={8} justify="flex-start" className="lg:justify-end">
        <DeleteSingleListItem itemId={list.id} />
        <GradientButtonPrimary
          onClick={() => setEditing(true)}
          size="xs"
          radius="lg"
          rightSection={
            <span style={{ width: 14, height: 14, display: "inline-flex" }}>
              <Image src={Edit2} alt="Edit" w="100%" h="100%" fit="contain" />
            </span>
          }
        >
          Edit
        </GradientButtonPrimary>
      </Group>
    </div>
  );
}
