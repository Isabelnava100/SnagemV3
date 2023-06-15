import {
  Avatar,
  Box,
  Flex,
  Image,
  ScrollArea,
  Stack,
  Text,
  Title,
  type StackProps,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { UploadAndCropImage } from "../../../components/crop-image/UploadAndCropImage";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Upload } from "../../../icons";
import { getProfile } from "../../../queries/dashboard";
import DefaultAvatar from "/src/assets/images/character-default.jpg";

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
  const [fileBlob, setFileBlob] = useState<Blob>();
  const [isProcessing, setProcessing] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const MAX_ITEMS_COUNT = 8;
  const REMAINING_ITEMS_COUNT = useMemo(() => {
    if (data?.avatars.length) {
      return MAX_ITEMS_COUNT - data?.avatars.length;
    } else {
      return 0;
    }
  }, [data?.avatars.length]);

  const handleAvatarUpload = async () => {
    if (!fileBlob) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      const { storage, db } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;

      const storageRef = ref(storage, fileName);

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      // push it into avatars array in db
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        avatars: arrayUnion(imagePublicURL),
      });

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });

      setFileBlob(undefined);
    } catch (err) {
      //
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    try {
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string);

      await updateDoc(docRef, {
        avatar: url,
      });

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
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
    <Wrapper
      sx={{
        display: "flex",
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
      p={16}
    >
      <Avatar
        src={user?.avatar || DefaultAvatar}
        w={100}
        h={100}
        sx={{ borderRadius: "100%", flexShrink: 0, cursor: "pointer" }}
      />
      <Stack w="100%" maw="100%" sx={{ flex: 1, overflow: "hidden" }}>
        <Flex w="100%" justify="space-between" align="center">
          <Text size={16} color="white">
            Avatars
          </Text>
          <UploadAndCropImage
            setStateAction={setFileBlob}
            target={
              <GradientButtonPrimary loading={isProcessing} rightIcon={<Image src={Upload} />}>
                Upload
              </GradientButtonPrimary>
            }
          />
        </Flex>
        <Conditional
          condition={!!data?.avatars.length}
          component={
            <ScrollArea pb={20}>
              <Flex gap={6} sx={{ flexWrap: "nowrap" }}>
                {/* all of them except the one the has picked as his profile avatar */}
                {data?.avatars
                  .filter((avatarUrl) => avatarUrl !== user?.avatar)
                  .map((avatarUrl) => {
                    return (
                      <Avatar
                        onClick={() => handleSelectAvatar(avatarUrl)}
                        src={avatarUrl}
                        w={60}
                        h={60}
                        radius="xl"
                        key={avatarUrl}
                      />
                    );
                  })}
                {Array(REMAINING_ITEMS_COUNT)
                  .fill(0)
                  .map((_) => (
                    <Box key={uuid()} bg="#3C3A3C" w={60} h={60} sx={{ borderRadius: "100%" }} />
                  ))}
              </Flex>
            </ScrollArea>
          }
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
      <Stack>
        <Flex w="100%" justify="space-between" align="center">
          <Text size={16} color="white">
            Cover Background
          </Text>
          <GradientButtonPrimary rightIcon={<Image src={Upload} />}>Upload</GradientButtonPrimary>
        </Flex>
        <Conditional
          condition={!!data?.cover_backgrounds.length}
          component={<h1>We have that</h1>}
          fallback={<EmptyMessage message="No covers found" />}
        />
      </Stack>
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
    <Stack>
      <Wrapper sx={{ flex: 1, borderRadius: 22 }}>
        <Title color="white" order={2} size={24}>
          Description
        </Title>
        <Box sx={{ borderRadius: 12, overflow: "hidden" }}>
          <Editor editor={editor} />
        </Box>
      </Wrapper>
    </Stack>
  );
}
