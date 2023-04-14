import {
  Divider,
  FileInput,
  FileInputProps,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { RichTextEditor } from "@mantine/tiptap";
import { IconPictureInPictureOn } from "@tabler/icons";
import { Editor } from "@tiptap/react";
import React from "react";
import { z } from "zod";
import { Conditional } from "../common/Conditional";
import CropImg from "./CropImage";

type CropImageModalProps = {
  editor: Editor | null;
};

export function UploadAndCropImage(props: CropImageModalProps) {
  const { editor } = props;
  const [opened, { close, open }] = useDisclosure(false);
  const [imgSrc, setImgSrc] = React.useState("");
  const [imgURLInput, setImgURLInput] = React.useState("");
  const [debouncedImgURL] = useDebouncedValue(imgURLInput, 500);

  const handleFileSelect: FileInputProps["onChange"] = (payload) => {
    const file = payload;
    if (file) {
      setImgSrc("");
      const reader = new FileReader();
      reader.addEventListener("load", () => setImgSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(file);
    }
  };

  const handleURLInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setImgURLInput(value);
  };

  React.useEffect(() => {
    // Only if it's a valid URL
    if (z.string().url().safeParse(debouncedImgURL).success) {
      setImgSrc(debouncedImgURL);
    }
  }, [debouncedImgURL]);

  React.useEffect(() => {
    if (!opened) {
      setImgSrc("");
      setImgURLInput("");
    }
  }, [opened]);

  return (
    <React.Fragment>
      <RichTextEditor.Control onClick={open} aria-label="Insert image" title="Insert image">
        <IconPictureInPictureOn stroke={1.5} size={16} />
      </RichTextEditor.Control>
      <Modal
        overflow="inside"
        opened={opened}
        onClose={close}
        withCloseButton={false}
        centered
        size={500}
      >
        <Conditional
          condition={!Boolean(imgSrc)}
          component={
            <Stack spacing={30}>
              <Stack align="center" spacing="sm">
                <Title order={2}>Upload Image</Title>
                <Stack spacing={1} align="center">
                  <Text>Max width/height: 800px</Text>
                  <Text>Formats: GIF, PNG, JPG</Text>
                </Stack>
              </Stack>
              <Stack spacing="sm">
                <FileInput
                  onChange={handleFileSelect}
                  placeholder="Choose a file"
                  accept=".png, .jpg, .gif"
                />
                <Divider label="Or" labelPosition="center" />
                <TextInput
                  onChange={handleURLInputChange}
                  placeholder="Paste your image URL"
                  w="100%"
                  classNames={{ input: "auto-width" }}
                />
              </Stack>
            </Stack>
          }
          fallback={<CropImg editor={editor} src={imgSrc} close={close} />}
        />
      </Modal>
    </React.Fragment>
  );
}
