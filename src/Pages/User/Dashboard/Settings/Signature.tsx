import { Box, Divider, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../../components/editor/Editor";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../context/firebase";

const getSignature = async (uid: string): Promise<string> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid))).data();
  return String(data?.signature ?? "");
};

/**
 * Gaia-style post signature. Stored on the user doc (readable by everyone so
 * posts can render it); snapshotted onto each post at publish time when the
 * composer's "Attach Signature" box is checked. Sanitized before saving and
 * again at render.
 */
export default function Signature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: signature, isPending } = useQuery({
    queryKey: ["signature", user?.uid],
    queryFn: () => getSignature(user!.uid),
    enabled: !!user,
  });

  const [html, setHtml] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const editor = useRichTextEditor({
    onUpdate: ({ editor: e }) => {
      setSaved(false);
      setHtml(e.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor || loaded || signature === undefined) return;
    editor.commands.setContent(signature || "");
    setHtml(signature || "");
    setLoaded(true);
  }, [editor, signature, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const clean = DOMPurify.sanitize(html).slice(0, 10_000);
      await updateDoc(doc(db, "users", user!.uid), { signature: clean });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["signature", user?.uid] });
    },
  });

  if (isPending) return <SectionLoader />;

  return (
    <Stack w="100%" maw={640} gap={12}>
      <Title order={2} c="white" size={28} fw={400}>
        Post Signature
      </Title>
      <Text fz={14} c="dimmed">
        Shown under your forum posts when &quot;Attach Signature&quot; is checked in the
        composer. Keep it tasteful; hosts can ask you to change it.
      </Text>
      <Box sx={{ borderRadius: 0, overflow: "hidden" }}>
        <Editor editor={editor} />
      </Box>

      {/* Live preview, rendered the same way posts render it */}
      {html.replace(/<[^>]*>/g, "").trim().length > 0 && (
        <Box p={12} bg="#141318" sx={{ borderRadius: 0 }}>
          <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
            Preview
          </Text>
          <Divider color="#4a464a" my={6} />
          <Text
            fz={14}
            c="gray.4"
            className="forum-post-body"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
          />
        </Box>
      )}

      {saved && (
        <Text fz={14} c="green.0">
          Signature saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save Signature
      </GradientButtonPrimary>
    </Stack>
  );
}
