import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Flex,
  Image,
  ScrollArea,
  Stack,
  TagsInput,
  Text,
  Title,
  Tooltip,
  type StackProps,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconExternalLink, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import FeaturedPicks from "./FeaturedPicks";
import { UploadAndCropImage } from "../../../components/crop-image/UploadAndCropImage";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Upload } from "../../../icons";
import { STORAGE_FOLDERS, storagePath } from "../../../lib/storage";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isLoading, isError } = useProfileQuery();
  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  return (
    <Stack gap={10} w="100%">
      {/* Everything below edits the public profile; this jumps to the real thing. */}
      {user?.username && (
        <GradientButtonSecondary
          radius="xl"
          size="xs"
          w="fit-content"
          rightSection={<IconExternalLink size={14} />}
          onClick={() => navigate(`/Users/${user.username}`)}
        >
          View your public profile
        </GradientButtonSecondary>
      )}
      <Flex
        gap={10}
        sx={{ flexDirection: isOverLg ? "row" : "column" }}
        justify="space-between"
        align="stretch"
      >
        <LeftSideContent />
        <RightSideContent />
      </Flex>
    </Stack>
  );
}

function LeftSideContent() {
  const { isOverLg } = useMediaQuery();
  return (
    <Stack w="100%" maw={isOverLg ? 450 : undefined} gap={15}>
      <Avatars />
      <CoverBackgrounds />
      <Tags />
      <FeaturedPicks />
    </Stack>
  );
}

/**
 * Sticky save bar: stays pinned to the bottom of the description column via
 * CSS `position: sticky` (in-flow, no fixed overlap), so there's a single,
 * always-reachable save action while editing.
 */
function StickySaveBar(props: { onSave: () => void; loading?: boolean }) {
  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 8,
        zIndex: 5,
        marginTop: 8,
        padding: 8,
        borderRadius: 16,
        background: "rgba(30, 29, 32, 0.92)",
        backdropFilter: "blur(4px)",
        border: "1px solid #3C3A3C",
      }}
    >
      <GradientButtonPrimary fullWidth radius="xl" loading={props.loading} onClick={props.onSave}>
        Save Your Changes
      </GradientButtonPrimary>
    </Box>
  );
}

function Wrapper(props: { children: React.ReactNode } & StackProps) {
  const { isOverLg } = useMediaQuery();
  const { children, p = isOverLg ? 25 : 15, sx = { borderRadius: 22 }, ...restProps } = props;
  return (
    <Stack bg="#403C43" p={p} {...restProps} sx={sx} gap={5}>
      {children}
    </Stack>
  );
}

function EmptyMessage(props: { message: string }) {
  const { message } = props;
  return (
    <Flex w="100%" py="xl" justify="center" align="center">
      <Title c="white" order={3}>
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

  const canUpload = data && data.avatars ? data.avatars.length < 6 : true;

  const MAX_ITEMS_COUNT = 6;
  const REMAINING_ITEMS_COUNT = useMemo(() => {
    if (data?.avatars?.length) {
      const count = MAX_ITEMS_COUNT - data?.avatars.length;
      return count >= 0 ? count : 0;
    } else {
      return 0;
    }
  }, [data?.avatars?.length]);

  const handleAvatarUpload = async () => {
    if (!fileBlob) return;
    if (!canUpload) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { doc, arrayUnion, setDoc } = await import("firebase/firestore");
      const { storage, db } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;

      const storageRef = ref(
        storage,
        storagePath(STORAGE_FOLDERS.profileAvatars, user?.uid as string, fileName)
      );

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      // push it into avatars array in db
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(docRef, { avatars: arrayUnion(imagePublicURL) }, { merge: true });

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });

      setFileBlob(undefined);
    } catch (err) {
      console.log(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string);

      await setDoc(
        docRef,
        {
          avatar: url,
        },
        { merge: true }
      );

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
    }
  };

  const handleRemoveAvatar = async (url: string) => {
    const confirmed = window.confirm("Are you sure, you want to remove this permanently?");
    if (!confirmed) return;
    try {
      const { storage, db } = await import("../../../context/firebase");
      const { ref, deleteObject } = await import("firebase/storage");
      const { arrayRemove, doc, setDoc } = await import("firebase/firestore");

      // Delete via the file's own full path (from its URL) so it works no
      // matter which folder/nesting the file was uploaded under.
      const fileRef = ref(storage, storage.refFromURL(url).fullPath);

      await deleteObject(fileRef);

      // update the avatars array
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(
        docRef,
        {
          avatars: arrayRemove(url),
        },
        { merge: true }
      );

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
        alt={`${user?.displayName ?? user?.username ?? "Your"} avatar`}
        w={100}
        h={100}
        sx={{ borderRadius: "100%", flexShrink: 0, border: "4px solid white" }}
      />
      <Stack w="100%" maw="100%" sx={{ flex: 1, overflow: "hidden" }}>
        <Flex w="100%" justify="space-between" align="center">
          <Text fz={20} color="white">
            Avatars
          </Text>
          <UploadAndCropImage
            setStateAction={setFileBlob}
            target={
              <GradientButtonPrimary
                disabled={isProcessing || !canUpload}
                loading={isProcessing}
                rightSection={<Image src={Upload} alt="Upload" />}
              >
                Upload
              </GradientButtonPrimary>
            }
          />
        </Flex>
        {!canUpload && (
          <Text fz={14} c="#E54156">
            You&apos;ve reached the max of {MAX_ITEMS_COUNT} avatars. Remove one before adding more.
          </Text>
        )}
        <Conditional
          condition={!!data?.avatars?.length}
          component={
            <ScrollArea pb={20}>
              <Flex gap={6} sx={{ flexWrap: "nowrap" }}>
                {/* all of them except the one the has picked as his profile avatar */}
                {data &&
                  data.avatars &&
                  data.avatars
                    .filter((avatarUrl) => avatarUrl !== user?.avatar)
                    .reverse()
                    .map((avatarUrl) => {
                      return (
                        <div key={avatarUrl} className="relative">
                          <Avatar
                            onClick={() => handleSelectAvatar(avatarUrl)}
                            src={avatarUrl}
                            alt="Saved avatar option"
                            w={60}
                            h={60}
                            radius="xl"
                            sx={{ cursor: "pointer" }}
                          />
                          <div className="absolute top-0 right-0">
                            <Tooltip label="Remove">
                              <ActionIcon
                                onClick={() => handleRemoveAvatar(avatarUrl)}
                                color="red"
                                variant="filled"
                                radius="xl"
                                size="xs"
                              >
                                <IconX />
                              </ActionIcon>
                            </Tooltip>
                          </div>
                        </div>
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
  const [fileBlob, setFileBlob] = useState<Blob>();
  const [isProcessing, setProcessing] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canUpload = data && data.cover_backgrounds ? data.cover_backgrounds.length < 6 : true;

  const handleImageUpload = async () => {
    if (!fileBlob) return;
    if (!canUpload) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { doc, setDoc, arrayUnion } = await import("firebase/firestore");
      const { storage, db } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;

      const storageRef = ref(
        storage,
        storagePath(STORAGE_FOLDERS.coverBackgrounds, user?.uid as string, fileName)
      );

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      // push it into avatars array in db
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(
        docRef,
        {
          cover_backgrounds: arrayUnion(imagePublicURL),
        },
        { merge: true }
      );

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });

      setFileBlob(undefined);
    } catch (err) {
      //
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectCoverImage = async (url: string) => {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(
        docRef,
        {
          coverBG: url,
        },
        { merge: true }
      );

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
    }
  };

  const handleRemoveCoverImage = async (url: string) => {
    const confirmed = window.confirm("Are you sure, you want to remove this permanently?");
    if (!confirmed) return;
    try {
      const { storage, db } = await import("../../../context/firebase");
      const { ref, deleteObject } = await import("firebase/storage");
      const { arrayRemove, doc, setDoc } = await import("firebase/firestore");

      // Delete via the file's own full path (from its URL) so it works no
      // matter which folder/nesting the file was uploaded under.
      const fileRef = ref(storage, storage.refFromURL(url).fullPath);

      await deleteObject(fileRef);

      // update the avatars array
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(
        docRef,
        {
          cover_backgrounds: arrayRemove(url),
        },
        { merge: true }
      );

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
    }
  };

  useEffect(() => {
    if (fileBlob) {
      handleImageUpload();
    }
    return () => {
      setFileBlob(undefined);
    };
  }, [fileBlob]);

  return (
    <Wrapper p={16}>
      <Stack>
        <Flex w="100%" justify="space-between" align="center">
          <Text fz={20} color="white">
            Cover Background
          </Text>
          <UploadAndCropImage
            setStateAction={setFileBlob}
            target={
              <GradientButtonPrimary
                disabled={isProcessing || !canUpload}
                loading={isProcessing}
                rightSection={<Image src={Upload} alt="Upload" />}
              >
                Upload
              </GradientButtonPrimary>
            }
          />
        </Flex>
        {!canUpload && (
          <Text fz={14} c="#E54156">
            You&apos;ve reached the max of 6 cover backgrounds. Remove one before adding more.
          </Text>
        )}
        <Conditional
          condition={!!data?.cover_backgrounds?.length}
          component={
            <ScrollArea pb={12} offsetScrollbars>
              <Flex gap={12} sx={{ flexWrap: "nowrap" }}>
                {data &&
                  data.cover_backgrounds &&
                  data.cover_backgrounds
                    .slice()
                    .reverse()
                    .map((cover_background_url) => {
                      const isActive = data.coverBG === cover_background_url;
                      return (
                        <Box
                          key={cover_background_url}
                          onClick={() => handleSelectCoverImage(cover_background_url)}
                          role="img"
                          aria-label={isActive ? "Selected cover background" : "Cover background option"}
                          sx={{
                            position: "relative",
                            flexShrink: 0,
                            width: 180,
                            height: 100,
                            borderRadius: 12,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: isActive ? "3px solid #17F1F0" : "2px solid #5a545f",
                            backgroundImage: `url(${cover_background_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          {isActive && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                width: "100%",
                                padding: "4px 0",
                                background: "rgba(0,0,0,0.55)",
                              }}
                            >
                              <Text tt="uppercase" c="white" ta="center" fw="bold" fz={14}>
                                Selected
                              </Text>
                            </Box>
                          )}
                          <Box sx={{ position: "absolute", top: 4, right: 4 }}>
                            <Tooltip label="Remove">
                              <ActionIcon
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCoverImage(cover_background_url);
                                }}
                                color="red"
                                variant="filled"
                                radius="xl"
                                size="sm"
                              >
                                <IconX size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })}
              </Flex>
            </ScrollArea>
          }
          fallback={<EmptyMessage message="No covers found" />}
        />
      </Stack>
    </Wrapper>
  );
}

function Tags() {
  const { data, isLoading } = useProfileQuery();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [processing, setProcessing] = React.useState(false);
  const [items, setItems] = useState<{ label: string; value: string }[]>([]);
  const [isFirstTime, setFirstTime] = useState(true);

  const addTag = async () => {
    if (isLoading) return;
    try {
      setProcessing(true);
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await setDoc(
        docRef,
        {
          tags: items.map((item) => item.value),
        },
        { merge: true }
      );

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
    } finally {
      setProcessing(false);
    }
  };

  React.useEffect(() => {
    if (!isLoading && data && data.tags) {
      setItems(data.tags.map((tagString) => ({ label: tagString, value: tagString })));
    }
  }, [isLoading]);

  React.useEffect(() => {
    if (!isFirstTime) {
      addTag();
    }
    setFirstTime(false);
  }, [items.length]);

  return (
    <Wrapper p={16}>
      <Stack>
        <Flex align="start" justify="center">
          <Text fz={20} color="white">
            Tags
          </Text>
          <Alert icon={<IconInfoCircle />} py={0} color="gray" bg="transparent" sx={{ flex: 1 }}>
            Maximum 6 tags allowed. These are used to make filtering and searching easy on the users
            page.
          </Alert>
        </Flex>
        <TagsInput
          onChange={(values) => setItems(values.map((value) => ({ value, label: value })))}
          disabled={processing}
          value={items.map((selectItem) => selectItem.value)}
          maxTags={6}
        />
      </Stack>
    </Wrapper>
  );
}

function RightSideContent() {
  const { data } = useProfileQuery();
  const [value, setValue] = useState(data?.description);
  const [isFirstTime, setFirstTime] = useState(true);
  const [debounced] = useDebouncedValue(value, 500);
  const editor = useRichTextEditor({
    content: data?.description as string,
    async onUpdate({ editor }) {
      setValue(editor.getHTML());
    },
  });
  const { mutate, isPending: isLoading, isSuccess } = useMutation({
    mutationFn: () => saveChanges(),
  });
  const { user } = useAuth();

  const saveChanges = async () => {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      // Sanitize before persisting so stored HTML is safe for any render path
      await setDoc(docRef, { description: DOMPurify.sanitize(debounced ?? "") }, { merge: true });
    } catch (err) {
      //
    }
  };

  React.useEffect(() => {
    if (!isFirstTime) {
      mutate();
    }
    setFirstTime(false);
  }, [debounced]);

  return (
    <Stack sx={{ flex: 1 }}>
      <Wrapper id="profile-save-anchor" sx={{ flex: 1, borderRadius: 22 }}>
        <Flex justify="space-between" align="center">
          <Title c="white" order={2} size={28}>
            Description
          </Title>
          {isLoading && <Text>Saving changes...</Text>}
          {isSuccess && <Text color="green">Saved</Text>}
        </Flex>
        <Box sx={{ borderRadius: 12, overflow: "hidden" }}>
          <Editor editor={editor} />
        </Box>
        <StickySaveBar onSave={() => mutate()} loading={isLoading} />
      </Wrapper>
    </Stack>
  );
}
