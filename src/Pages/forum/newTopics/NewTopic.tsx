import { Container, Group, Paper, Select, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { IconColorPicker } from "@tabler/icons";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import SubScript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmojiModal from "../../../components/editor/EmojiModal";
import suggestion from "../../../components/editor/Suggestion";
import { NewForumInfo } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { lazyImport } from "../../../utils/lazyImport";
import { ButtonProgress } from "../reusable-components/LoadingButton";
import { filteredData } from "../reusable-components/checkPermsForum";
import { handleSubmit } from "./components/handleSubmitTopic";
const { UploadAndCropImage } = lazyImport(
  () => import("../../../components/crop-image/UploadAndCropImage"),
  "UploadAndCropImage"
);

import "../../../components/editor/style.css";
import "/src/assets/styles/newTopics.css";

export function NewTopic() {
  const [opened, { open, close }] = useDisclosure(false);
  const { forum } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      title: "",
      forum2: forum ? NewForumInfo.find((info) => info.link === forum) : "2",
      postas: "",
      firstpost: "",
    },
    validate: {
      title: (value) => (value.length < 2 ? "Title must have at least 2 letters" : null),
      postas: (value) => (value.length < 2 ? "Name must have at least 2 letters" : null),
      firstpost: (value) => (value.length < 2 ? "Post must have at least 2 letters" : null),
    },
  });
  const formTheCheck = form.isValid();

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image,
      Underline,
      Placeholder.configure({ placeholder: "This is placeholder" }),
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion,
      }),
    ],
    onUpdate: (props) => {
      form.setFieldValue("firstpost", props.editor.getHTML());
    },
  });

  const handleSubmitForm = async (values: {
    title: any;
    forum2: any;
    postas: any;
    firstpost: any;
  }) => {
    try {
      const success = await handleSubmit(
        values.title,
        values.forum2,
        values.postas,
        values.firstpost,
        user
      );

      if (success) {
        navigate("/Forum/" + NewForumInfo.find((info) => info.value === values.forum2)?.link);
      } else {
        navigate("/Forum/Main-Forum");
      }
    } catch (err) {
      console.error(err);
    } finally {
      return Promise.resolve();
    } //add to all promises
  };

  // INSERT EMOJI
  const insertEmoji = (emoji: { emoji: string }) => {
    if (emoji) {
      editor?.chain().focus().insertContent(emoji?.emoji).insertContent(" ").run();
    }
    close();
  };

  // MENTION USER
  const handleMention = () => {
    editor?.chain().focus().insertContent("@").run();
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <form
        onSubmit={form.onSubmit(async (values) => {
          try {
            await handleSubmitForm(values);
          } catch (err) {
            console.error(err);
          } finally {
            return Promise.resolve();
          }
        })}
      >
        <Paper shadow="md" radius="lg">
          <div className="wrapperNewTopic">
            <div className="contactNewTopics">
              <Text size="lg" weight={700} className="title2NewTopic" sx={{ color: "#fff" }}>
                Topic Information
              </Text>

              <TextInput
                label="Title"
                className="mb-4"
                {...form.getInputProps("title")}
                placeholder="Title of the Topic"
                required
              />

              <Select
                data={filteredData(user)}
                mb="md"
                label="Forum"
                {...form.getInputProps("forum2")}
                placeholder="Choose location of the topic"
                required
              />

              <TextInput
                label="Post As"
                {...form.getInputProps("postas")}
                placeholder="Write the Name of your Character"
                required
              />
            </div>

            <div className="formNewTopic">
              <Text size="lg" weight={700} className="titleNewTopic">
                First Post <sup className="text-red-600">*</sup>
              </Text>

              <React.Suspense fallback={<></>}>
                <RichTextEditor editor={editor}>
                  <RichTextEditor.Toolbar>
                    <RichTextEditor.ColorPicker
                      colors={[
                        "#25262b",
                        "#868e96",
                        "#fa5252",
                        "#e64980",
                        "#be4bdb",
                        "#7950f2",
                        "#4c6ef5",
                        "#228be6",
                        "#15aabf",
                        "#12b886",
                        "#40c057",
                        "#82c91e",
                        "#fab005",
                        "#fd7e14",
                      ]}
                    />

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Control interactive={false}>
                        <IconColorPicker size={16} stroke={1.5} />
                      </RichTextEditor.Control>
                      <RichTextEditor.Color color="#F03E3E" />
                      <RichTextEditor.Color color="#7048E8" />
                      <RichTextEditor.Color color="#1098AD" />
                      <RichTextEditor.Color color="#37B24D" />
                      <RichTextEditor.Color color="#F59F00" />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.H1 />
                      <RichTextEditor.H2 />
                      <RichTextEditor.H3 />
                      <RichTextEditor.H4 />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Bold />
                      <RichTextEditor.Italic />
                      <RichTextEditor.Underline />
                      <RichTextEditor.Strikethrough />
                      <RichTextEditor.ClearFormatting />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Blockquote />
                      <RichTextEditor.Hr />
                      <RichTextEditor.BulletList />
                      <RichTextEditor.OrderedList />
                      <RichTextEditor.Subscript />
                      <RichTextEditor.Superscript />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Link />
                      <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.AlignLeft />
                      <RichTextEditor.AlignCenter />
                      <RichTextEditor.AlignJustify />
                      <RichTextEditor.AlignRight />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <UploadAndCropImage editor={editor} />
                      <RichTextEditor.Control
                        onClick={() => open()}
                        aria-label="Insert emoji"
                        title="Insert emoji"
                      >
                        😘
                      </RichTextEditor.Control>
                      <RichTextEditor.Control
                        aria-label="Mention someone"
                        title="Mention someone"
                        onClick={handleMention}
                      >
                        @
                      </RichTextEditor.Control>
                    </RichTextEditor.ControlsGroup>
                  </RichTextEditor.Toolbar>

                  <EmojiModal opened={opened} close={close} insertEmoji={insertEmoji} />
                  <RichTextEditor.Content />
                </RichTextEditor>
                <Group position="right" mt="md">
                  <ButtonProgress formCheck={!formTheCheck} />
                </Group>
              </React.Suspense>
            </div>
          </div>
        </Paper>
      </form>
    </Container>
  );
}
