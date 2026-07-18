import {
  ActionIcon,
  Avatar,
  Button,
  Flex,
  Group,
  Image,
  Paper,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import DefaultCharacterImage from "../../../assets/images/character-default.jpg";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { EmptyMessage } from "../../../components/common/Message";
import { UploadAndCropImage } from "../../../components/crop-image/UploadAndCropImage";
import { SectionLoader } from "../../../components/navigation/loading";
import { Character, characterTypes } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { isMaster } from "../../../lib/permissions";
import { STORAGE_FOLDERS, storagePath } from "../../../lib/storage";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit2, Upload } from "../../../icons";
import { getCharacters } from "../../../queries/dashboard";

export default function Characters() {
  const { user } = useAuth();
  const { isPending: isLoading, data, isError } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user?.uid as string),
    enabled: !!user,
  });

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  const { sortedData } = data;
  if (!sortedData.length)
    return (
      <EmptyMessage
        title="No characters"
        description="You currently have no characters created. Click the button below to create one."
        action={<CreateNewCharacter />}
      />
    );
  return (
    <Stack align="end">
      {sortedData.map((character) => (
        <SingleCharacter key={character.id} {...character} />
      ))}
      <CreateNewCharacter />
    </Stack>
  );
}

function useUpdateOrAddDocument(documentId?: string) {
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: async ({ values }: { values?: Omit<Character, "id"> }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "characters");
      await setDoc(
        docRef,
        {
          [documentId || uuid()]: values || {
            age: "",
            birthday: "",
            height: "",
            moveset: "",
            name: "No name",
            short_description: "",
            // Non-masters get the default species and can't change it.
            species: "Human",
            pronouns: "",
            type: "None",
            imageURL: "",
            createdAt: new Date(),
          },
        },
        { merge: true }
      );
    },
  });
  return mutation;
}

function CreateNewCharacter() {
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const handleClick = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      // A name is required up front; species defaults to "Human".
      await mutateAsync({
        values: {
          age: "",
          birthday: "",
          height: "",
          moveset: "",
          name: trimmed,
          short_description: "",
          species: "Human",
          pronouns: "",
          type: "None",
          imageURL: "",
          createdAt: new Date(),
        } as unknown as Omit<Character, "id">,
      });
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
    } catch (err) {
      //
    }
  };

  return (
    <Group gap={8} align="flex-end" wrap="nowrap">
      <TextInput
        label="Character name"
        placeholder="Name your character"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        styles={{ label: { color: "white" } }}
      />
      <GradientButtonSecondary
        id="create-character-button"
        onClick={handleClick}
        loading={isLoading}
        disabled={!name.trim()}
      >
        Create a new Character
      </GradientButtonSecondary>
    </Group>
  );
}

type FormFields = Omit<Character, "id">;

function InputWrapper(props: {
  title: string;
  name: keyof FormFields;
  isEditing: boolean;
  inputType?: "select" | "input";
  options?: string[];
  form: UseFormReturnType<FormFields>;
  /** When true the field is read-only even in edit mode (e.g. master-only). */
  locked?: boolean;
}) {
  const { title, isEditing, inputType = "input", options, name, form, locked = false } = props;
  const editable = isEditing && !locked;
  return (
    <Paper w="100%" bg="#525151" py={3} px={7} radius={8}>
      <Flex align="center">
        <Text w={65} fz={16} lineClamp={1}>
          {title}:
        </Text>
        {!editable ? (
          <Group gap={6} justify="space-between" wrap="nowrap" sx={{ flex: 1 }}>
            <Text lineClamp={1} fz={22} color="white" px={2}>
              {form.values[name as keyof FormFields]?.toString()}
            </Text>
            {isEditing && locked && (
              <Text fz={14} c="dimmed" style={{ whiteSpace: "nowrap" }}>
                Masters only
              </Text>
            )}
          </Group>
        ) : // Input for editing. It can also be a select input
        inputType === "input" ? (
          <TextInput sx={{ flex: 1 }} radius={8} {...form.getInputProps(name)} />
        ) : (
          <Select
            sx={{ flex: 1 }}
            radius={8}
            data={options?.map((option) => ({ label: option, value: option })) || []}
            {...form.getInputProps(name)}
          />
        )}
      </Flex>
    </Paper>
  );
}

function TextareaWrapper(props: {
  title: string;
  form: UseFormReturnType<FormFields>;
  name: keyof FormFields;
  isEditing: boolean;
  isMoveSet?: boolean;
  /** When true the field is read-only even in edit mode (e.g. master-only). */
  locked?: boolean;
}) {
  const { title, isEditing, isMoveSet = false, form, name, locked = false } = props;
  const characterType = form.values.type;
  const editable = isEditing && !locked;

  if (editable) {
    if (isMoveSet) {
      if (characterType === "Channeler" || characterType === "Hybrid") {
        return <Textarea minRows={3} radius={8} label={title} {...form.getInputProps(name)} />;
      } else {
        return <></>;
      }
    } else {
      return <Textarea minRows={3} radius={8} label={title} {...form.getInputProps(name)} />;
    }
  }

  const value = form.values[name];

  return (
    <Stack h="100%" p={8} sx={{ borderRadius: 8 }} bg="#525151" gap={8}>
      <Group gap={6} justify="space-between" wrap="nowrap">
        <Title order={3} size={16}>
          {title}
        </Title>
        {isEditing && locked && (
          <Text fz={14} c="dimmed" style={{ whiteSpace: "nowrap" }}>
            Masters only
          </Text>
        )}
      </Group>
      <Text color="white">
        {isMoveSet
          ? characterType === "Channeler" || characterType === "Hybrid"
            ? value.toString()
            : "This option is only available to Hybrids and Channelers."
          : value.toString()}
      </Text>
    </Stack>
  );
}

function DeleteCharacter(props: { characterId: string }) {
  const { characterId } = props;
  const [opened, { close, open }] = useDisclosure(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: isLoading } = useMutation({
    mutationFn: async ({ characterIdInput }: { characterIdInput: string }) => {
      const { updateDoc, deleteField, doc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "characters");
      await updateDoc(docRef, { [characterIdInput]: deleteField() });
    },
  });

  const handleDelete = async () => {
    try {
      await mutateAsync({ characterIdInput: characterId });
      close();
      await queryClient.invalidateQueries({ queryKey: ["get-characters", user?.uid] });
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
          <Text>Are you sure, you want to delete this character?</Text>
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

function UploadAvatar(props: Character & { form: UseFormReturnType<FormFields> }) {
  const { id, form, ...character } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fileBlob, setFileBlob] = useState<Blob>();
  const [isProcessing, setProcessing] = useState(false);

  const handleAvatarUpload = async () => {
    if (!fileBlob || !user) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;
      // Foldered + nested by uid so character media is easy to find/clean up.
      const storageRef = ref(
        storage,
        storagePath(STORAGE_FOLDERS.characterAvatars, user.uid, fileName)
      );

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      form.setFieldValue("imageURL", imagePublicURL);

      // Persist right away so the image updates without needing a full edit +
      // save (the upload button is always visible below the avatar).
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");
      await setDoc(
        doc(db, "users", user.uid, "bag", "characters"),
        { [id]: { imageURL: imagePublicURL } },
        { merge: true }
      );
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });

      setFileBlob(undefined);
    } catch (err) {
      //
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (fileBlob) {
      handleAvatarUpload();
    }
    return () => {
      setFileBlob(undefined);
    };
  }, [fileBlob]);
  return (
    <UploadAndCropImage
      setStateAction={setFileBlob}
      target={
        <GradientButtonPrimary
          size="xs"
          radius="xl"
          loading={isProcessing}
          rightSection={<Image src={Upload} alt="Upload" />}
        >
          Change Image
        </GradientButtonPrimary>
      }
    />
  );
}

function SingleCharacter(props: Character) {
  const [isEditing, setEditing] = useState(false);
  const form = useForm<FormFields>({
    initialValues: { ...props },
  });
  const { user } = useAuth();
  const canEditType = isMaster(user);
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument(props.id);
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();

  const handleSaveChanges = async () => {
    await mutateAsync({ values: form.values });
    await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    form.reset();
    setEditing(false);
  };

  return (
    <Stack
      bg="#3E3D3D"
      p={20}
      align="end"
      w="100%"
      sx={{
        borderRadius: 15,
        overflow: "hidden",
      }}
    >
      <Flex sx={{ flexDirection: isOverSm ? "row" : "column" }} gap={40} w="100%" align="stretch">
        <Stack gap={19} align="center">
          <Avatar
            style={{ border: "4px solid #FFFFFF", borderRadius: "100%" }}
            w={150}
            src={form.values.imageURL || DefaultCharacterImage}
            alt={`${form.values.name ?? "Character"} avatar`}
            h={150}
            sx={{ objectFit: "cover" }}
          />
          {/* Always show the upload so it's clear the image can be changed;
              it saves immediately, no need to be in edit mode. */}
          <UploadAvatar form={form} {...props} />
        </Stack>
        <Stack gap={isOverSm ? 8 : 16} w="100%">
          <Flex
            sx={{ flexDirection: isOverSm ? "row" : "column" }}
            justify="space-between"
            align="center"
            gap={5}
          >
            {isEditing ? (
              <TextInput {...form.getInputProps("name")} />
            ) : (
              <Text fz={28} color="white" bg="#2E2D2E" px={20} py={5} sx={{ borderRadius: 8 }}>
                {form.values.name}
              </Text>
            )}
            {isOverSm &&
              (!isEditing ? (
                <Group>
                  <DeleteCharacter characterId={props.id} />
                  <GradientButtonPrimary
                    rightSection={<Image src={Edit2} alt="Edit icon" />}
                    fullWidth={!isOverSm}
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </GradientButtonPrimary>
                </Group>
              ) : (
                <Group>
                  <Button color="gray" variant="light" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <GradientButtonSecondary
                    loading={isLoading}
                    fullWidth={!isOverSm}
                    onClick={handleSaveChanges}
                  >
                    Save Your Changes
                  </GradientButtonSecondary>
                </Group>
              ))}
          </Flex>
          <Flex
            w="100%"
            sx={{ flexDirection: isOverSm ? "row" : "column" }}
            align="stretch"
            gap={8}
          >
            <Stack w={isOverSm ? 220 : "100%"} gap={8}>
              <InputWrapper
                form={form}
                name="species"
                isEditing={isEditing}
                locked={!canEditType}
                title="Species"
              />
              <InputWrapper
                form={form}
                name="type"
                inputType="select"
                options={characterTypes}
                isEditing={isEditing}
                locked={!canEditType}
                title="Type"
              />
              <InputWrapper form={form} name="height" isEditing={isEditing} title="Height" />
              <InputWrapper form={form} name="age" isEditing={isEditing} title="Age" />
              <InputWrapper form={form} name="birthday" isEditing={isEditing} title="Birthday" />
              <InputWrapper form={form} name="pronouns" isEditing={isEditing} title="Pronouns" />
            </Stack>
            <Stack gap={8} sx={{ flex: 1 }}>
              <TextareaWrapper
                name="moveset"
                isMoveSet
                form={form}
                isEditing={isEditing}
                locked={!canEditType}
                title="Moveset"
              />
              <TextareaWrapper
                name="short_description"
                form={form}
                isEditing={isEditing}
                title="Short description"
              />
            </Stack>
          </Flex>
          {!isOverSm &&
            (!isEditing ? (
              <Group grow>
                <DeleteCharacter characterId={props.id} />
                <GradientButtonPrimary fullWidth={!isOverSm} onClick={() => setEditing(true)}>
                  Edit
                </GradientButtonPrimary>
              </Group>
            ) : (
              <GradientButtonSecondary
                loading={isLoading}
                fullWidth={!isOverSm}
                onClick={handleSaveChanges}
              >
                Save Your Changes
              </GradientButtonSecondary>
            ))}
        </Stack>
      </Flex>
    </Stack>
  );
}
