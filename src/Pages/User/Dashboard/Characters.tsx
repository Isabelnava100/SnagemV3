import {
  Avatar,
  Flex,
  Image,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import DefaultCharacterImage from "../../../assets/images/character-default.jpg";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { Character, characterTypes } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Upload } from "../../../icons";
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
  return (
    <Stack align="end">
      {data.map((character) => (
        <SingleCharacter key={character.id} {...character} />
      ))}
      <CreateNewCharacter />
    </Stack>
  );
}

function CreateNewCharacter() {
  return <GradientButtonSecondary>Create a new Character</GradientButtonSecondary>;
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
    <Paper w="100%" bg="#525151" py={3} px={5} radius={8}>
      <Flex align="center">
        <Text w={65} lineClamp={1}>
          {title}:
        </Text>
        {!isEditing ? (
          <Text py={7} lineClamp={1} color="white" px={2}>
            {form.values[name as keyof FormFields]}
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
  characterType?: Character["type"];
}) {
  const { title, isEditing, isMoveSet = false, characterType, form, name } = props;

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
            ? value
            : "This option is only available to Hybrids and Channelers."
          : value}
      </Text>
    </Stack>
  );
}

function SingleCharacter(props: Character) {
  const [isEditing, setEditing] = useState(false);
  const form = useForm<FormFields>({
    initialValues: { ...props },
  });
  const { isOverSm } = useMediaQuery();
  const handleSaveChanges = async () => {
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
            src={props.imageURL || DefaultCharacterImage}
            h={150}
            sx={{ objectFit: "cover" }}
          />
          {isEditing && (
            <GradientButtonPrimary rightIcon={<Image src={Upload} />}>Upload</GradientButtonPrimary>
          )}
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
                <GradientButtonPrimary fullWidth={!isOverSm} onClick={() => setEditing(true)}>
                  Edit
                </GradientButtonPrimary>
              ) : (
                <GradientButtonSecondary fullWidth={!isOverSm} onClick={handleSaveChanges}>
                  Save Your Changes
                </GradientButtonSecondary>
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
            </Stack>
            <Stack spacing={8} sx={{ flex: 1 }}>
              <TextareaWrapper
                name="moveset"
                isMoveSet
                characterType={props.type}
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
              <GradientButtonPrimary fullWidth={!isOverSm} onClick={() => setEditing(true)}>
                Edit
              </GradientButtonPrimary>
            ) : (
              <GradientButtonSecondary fullWidth={!isOverSm} onClick={handleSaveChanges}>
                Save Your Changes
              </GradientButtonSecondary>
            ))}
        </Stack>
      </Flex>
    </Stack>
  );
}
