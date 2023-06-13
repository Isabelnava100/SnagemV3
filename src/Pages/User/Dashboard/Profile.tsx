import { Box, Flex, Stack, Text, Title, type StackProps } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getProfile } from "../../../queries/dashboard";

function useProfileQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["get-profile"],
    queryFn: () => getProfile(user?.uid as string),
  });
}

export default function Profile() {
  const { isOverLg } = useMediaQuery();
  const { isLoading, isError } = useProfileQuery();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  return (
    <Flex
      gap={10}
      sx={{ flexDirection: isOverLg ? "row" : "column" }}
      justify="space-between"
      align="stretch"
    >
      <LeftSideContent />
      <RightSideContent />
    </Flex>
  );
}

function LeftSideContent() {
  const { isOverLg } = useMediaQuery();
  return (
    <Stack w="100%" maw={isOverLg ? 450 : undefined} spacing={15}>
      <Avatars />
      <CoverBackgrounds />
      <Tags />
    </Stack>
  );
}

function Wrapper(props: { children: React.ReactNode } & StackProps) {
  const { isOverLg } = useMediaQuery();
  const { children, p = isOverLg ? 25 : 15, sx = { borderRadius: 22 }, ...restProps } = props;
  return (
    <Stack bg="#403C43" p={p} {...restProps} sx={sx} spacing={5}>
      {children}
    </Stack>
  );
}

function EmptyMessage(props: { message: string }) {
  const { message } = props;
  return (
    <Flex w="100%" py="xl" justify="center" align="center">
      <Title color="white" order={3}>
        {message}
      </Title>
    </Flex>
  );
}

function Avatars() {
  const { data } = useProfileQuery();
  return (
    <Wrapper p={16}>
      <Stack>
        <Flex w="100%" justify="space-between" align="center">
          <Text size={14} color="white">
            Avatars
          </Text>
          <GradientButtonPrimary>Upload</GradientButtonPrimary>
        </Flex>
        <Conditional
          condition={!!data?.avatars.length}
          component={<h1>We have that</h1>}
          fallback={<EmptyMessage message="No avatars found" />}
        />
      </Stack>
    </Wrapper>
  );
}

function CoverBackgrounds() {
  const { data } = useProfileQuery();
  return (
    <Wrapper p={16}>
      <Conditional
        condition={!!data?.cover_backgrounds.length}
        component={<h1>We have that</h1>}
        fallback={<EmptyMessage message="No covers found" />}
      />
    </Wrapper>
  );
}

function Tags() {
  return (
    <Wrapper p={16}>
      <h1>Tags</h1>
    </Wrapper>
  );
}

function RightSideContent() {
  const { data } = useProfileQuery();
  const editor = useRichTextEditor({ content: data?.description as string });
  return (
    <Wrapper>
      <Title color="white" order={2} size={24}>
        Description
      </Title>
      <Box sx={{ borderRadius: 12, overflow: "hidden", flex: 1 }}>
        <Editor editor={editor} />
      </Box>
    </Wrapper>
  );
}
