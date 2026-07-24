import React from "react";
import Editor, { useRichTextEditor } from "../../components/editor/Editor";

/**
 * Rich text body editor for lore entries, lazy-loaded from lore.tsx so Tiptap
 * (and the @mantine/tiptap CSS, imported by Editor.tsx) stays out of the
 * reader-facing Library chunk. Mirrors the blog editor embedding
 * (src/Pages/Blog/Edit.tsx): the shared Editor toolbar, HTML in and out.
 *
 * `initialHtml` is the entry body as loaded from Firestore; it only changes
 * when a different entry is opened, never on keystrokes, so reloading it into
 * the editor cannot clobber in-progress typing. Existing entries written as
 * raw HTML load fine because Tiptap accepts HTML content. The latest HTML is
 * pushed to the parent through `onChange` on every update (the parent keeps
 * it for the sanitized preview and the save mutation).
 */
export default function LoreBodyEditor(props: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const { initialHtml, onChange } = props;
  const editor = useRichTextEditor();

  // Load the entry body into the editor whenever a different entry is opened.
  // setContent("") also covers the reset case (new entry after editing one),
  // which the content option of useRichTextEditor would skip as falsy.
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if ((initialHtml || "") !== editor.getHTML()) {
      editor.commands.setContent(initialHtml || "");
    }
  }, [editor, initialHtml]);

  React.useEffect(() => {
    if (!editor) return;
    const handler = () => onChange(editor.getHTML());
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  return <Editor editor={editor} />;
}
