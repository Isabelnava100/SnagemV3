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
import { Editor as EditorType, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import { lazyImport } from "../../utils/lazyImport";
import EmojiModal from "./EmojiModal";
import suggestion from "./Suggestion";
import "./style.css";
import BreakIcon from "/src/assets/icons/break_icon.png";
import InlineIcon from "/src/assets/icons/inline_icon.png";
import WrapIcon from "/src/assets/icons/wrap_icon.png";
const { UploadAndCropImage } = lazyImport(
  () => import("../crop-image/UploadAndCropImage"),
  "UploadAndCropImage"
);

const CustomImage = Image.extend({
  name: "CustomImage",
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: "inline-image",
        parseHTML: (element) => ({
          class: element.getAttribute("alignment"),
        }),
        renderHTML: (attributes) => {
          if (!attributes.alignment) {
            return {};
          }

          return {
            class: attributes.alignment,
          };
        },
      },
    };
  },
});

export function useRichTextEditor(options?: Partial<Omit<EditorType["options"], "extensions">>) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      CustomImage,
      Color,
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
    ...(options || {}),
  });

  React.useEffect(() => {
    if (editor) {
      if (options?.content) {
        editor.commands.setContent(options.content);
      }
    }
  }, [options?.content]);

  return editor;
}

export default function Editor(props: { editor: EditorType | null }) {
  const { editor } = props;
  const [opened, { open, close }] = useDisclosure(false);

  if (!editor) return <></>;

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
    <RichTextEditor h="100%" editor={editor}>
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
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Control
            aria-label="Inline image"
            title="Inline image"
            onClick={() => {
              editor.chain().updateAttributes("CustomImage", { alignment: "inline-image" }).run();
            }}
          >
            <img src={InlineIcon} alt="inline icon" />
          </RichTextEditor.Control>
          <RichTextEditor.Control
            aria-label="Wrap text"
            title="Wrap text"
            onClick={() => {
              editor
                .chain()
                .updateAttributes("CustomImage", { alignment: "wrap-text-image" })
                .run();
            }}
          >
            <img src={WrapIcon} alt="wrap icon" />
          </RichTextEditor.Control>
          <RichTextEditor.Control
            aria-label="Break text"
            title="Break text"
            onClick={() => {
              editor
                .chain()
                .updateAttributes("CustomImage", { alignment: "break-text-image" })
                .run();
            }}
          >
            <img src={BreakIcon} alt="break icon" />
          </RichTextEditor.Control>
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <EmojiModal opened={opened} close={close} insertEmoji={insertEmoji} />
      <RichTextEditor.Content h="100%" />
    </RichTextEditor>
  );
}
