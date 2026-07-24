import { Box, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../../components/editor/Editor";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { getDb } from "../../../../context/firebase";

const getSignature = async (uid: string): Promise<string> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid))).data();
  return String(data?.signature ?? "");
};

/**
 * Gaia-style post signature. Stored on the user doc (owner/staff-only now; the
 * world-safe publicProfiles mirror also carries it) and snapshotted onto each
 * post at publish time when the composer's "Attach Signature" box is checked.
 * Sanitized before saving and again at render.
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
      const db = await getDb();
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
    <SimpleSectionWrapper>
      <Stack w="100%" maw={640} gap={12}>
        <Title
          order={2}
          c="white"
          fz={17}
          fw={700}
          tt="uppercase"
          style={{
            fontFamily: "var(--font-display, 'Quantico', sans-serif)",
            letterSpacing: "0.08em",
          }}
        >
          Post Signature
        </Title>
        <Text fz={14} c="#b6b1bc">
          Shown under your forum posts when &quot;Attach Signature&quot; is checked in the
          composer. Keep it tasteful; hosts can ask you to change it.
        </Text>
        <Box sx={{ border: "1px solid #2a2637", overflow: "hidden" }}>
          <Editor editor={editor} />
        </Box>

        {/* Live preview, rendered the same way posts render it (mockup box). */}
        {html.replace(/<[^>]*>/g, "").trim().length > 0 && (
          <Box p="16px 20px" bg="#141318" sx={{ border: "1px solid #2a2637" }}>
            <Text
              fz={14}
              c="#b6b1bc"
              tt="uppercase"
              fw={700}
              pb={8}
              mb={10}
              sx={{
                fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                letterSpacing: "0.16em",
                borderBottom: "1px solid #2a2637",
              }}
            >
              Preview
            </Text>
            <Text
              fz={14}
              c="gray.4"
              className="forum-post-body"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
            />
          </Box>
        )}

        <Text fz={14} c="green.0" role="status" aria-live="polite">
          {saved ? "Signature saved." : ""}
        </Text>
        <GradientButtonPrimary
          w="fit-content"
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutateAsync()}
          styles={{ root: { paddingLeft: 30, paddingRight: 30 } }}
        >
          Save Signature
        </GradientButtonPrimary>
      </Stack>
    </SimpleSectionWrapper>
  );
}
