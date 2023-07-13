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
import { IconTrash } from "@tabler/icons";
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
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit2, Upload } from "../../../icons";
import { getCharacters } from "../../../queries/dashboard";

export default function Characters() {
  const { user } = useAuth();
  const { isLoading, data, isError } = useQuery({
    queryKey: ["get-characters"],
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
            species: "",
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
  const { mutateAsync, isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
    } catch (err) {
      //
    }
  };

  return (
    <GradientButtonSecondary id="create-character-button" onClick={handleClick} loading={isLoading}>
      Create a new Character
    </GradientButtonSecondary>
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
}) {
  const { title, isEditing, inputType = "input", options, name, form } = props;
  return (
    <Paper w="100%" bg="#525151" py={3} px={7} radius={8}>
      <Flex align="center">
        <Text w={65} size={14} lineClamp={1}>
          {title}:
        </Text>
        {!isEditing ? (
          <Text lineClamp={1} size={18} color="white" px={2}>
            {form.values[name as keyof FormFields].toString()}
          </Text>
        ) : inputType === "input" ? (
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
}) {
  const { title, isEditing, isMoveSet = false, form, name } = props;
  const characterType = form.values.type;

  if (isEditing) {
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
    <Stack h="100%" p={8} sx={{ borderRadius: 8 }} bg="#525151" spacing={8}>
      <Title order={3} size={14}>
        {title}
      </Title>
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

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: async ({ characterIdInput }: { characterIdInput: string }) => {
      const { setDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "characters");
      const {
        rawData: { [characterIdInput]: documentToBeDeleted, ...rest },
      } = await getCharacters(user?.uid as string);

      await setDoc(docRef, {
        ...rest,
      });
    },
  });

  const handleDelete = async () => {
    try {
      await mutateAsync({ characterIdInput: characterId });
      close();
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
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
  const [fileBlob, setFileBlob] = useState<Blob>();
  const [isProcessing, setProcessing] = useState(false);

  const handleAvatarUpload = async () => {
    if (!fileBlob) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;
      const folder = "Avatars";

      const storageRef = ref(storage, `${folder}/${fileName}`);

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      form.setFieldValue("imageURL", imagePublicURL);

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
        <GradientButtonPrimary loading={isProcessing} rightIcon={<Image src={Upload} />}>
          Upload
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
  const { mutateAsync, isLoading } = useUpdateOrAddDocument(props.id);
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();

  const handleSaveChanges = async () => {
    await mutateAsync({ values: form.values });
    await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
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
        <Stack spacing={19} align="center">
          <Avatar
            style={{ border: "4px solid #FFFFFF", borderRadius: "100%" }}
            w={150}
            src={form.values.imageURL || DefaultCharacterImage}
            h={150}
            sx={{ objectFit: "cover" }}
          />
          {isEditing && <UploadAvatar form={form} {...props} />}
        </Stack>
        <Stack spacing={isOverSm ? 8 : 16} w="100%">
          <Flex
            sx={{ flexDirection: isOverSm ? "row" : "column" }}
            justify="space-between"
            align="center"
            gap={5}
          >
            {isEditing ? (
              <TextInput {...form.getInputProps("name")} />
            ) : (
              <Text size={24} color="white" bg="#2E2D2E" px={20} py={5} sx={{ borderRadius: 8 }}>
                {form.values.name}
              </Text>
            )}
            {isOverSm &&
              (!isEditing ? (
                <Group>
                  <DeleteCharacter characterId={props.id} />
                  <GradientButtonPrimary
                    rightIcon={<Image src={Edit2} alt="Edit icon" />}
                    fullWidth={!isOverSm}
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </GradientButtonPrimary>
                </Group>
              ) : (
                <Group>
                  <Button
                    color="gray"
                    variant="light"
                    onClick={() => {
                      form.reset();
                      setEditing(false);
                    }}
                  >
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
            <Stack w={isOverSm ? 220 : "100%"} spacing={8}>
              <InputWrapper form={form} name="species" isEditing={isEditing} title="Species" />
              <InputWrapper
                form={form}
                name="type"
                inputType="select"
                options={characterTypes}
                isEditing={isEditing}
                title="Type"
              />
              <InputWrapper form={form} name="height" isEditing={isEditing} title="Height" />
              <InputWrapper form={form} name="age" isEditing={isEditing} title="Age" />
              <InputWrapper form={form} name="birthday" isEditing={isEditing} title="Birthday" />
              <InputWrapper form={form} name="pronouns" isEditing={isEditing} title="Pronouns" />
            </Stack>
            <Stack spacing={8} sx={{ flex: 1 }}>
              <TextareaWrapper
                name="moveset"
                isMoveSet
                form={form}
                isEditing={isEditing}
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
