import {
  ActionIcon,
  Avatar,
  Box,
  Flex,
  Image,
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
    <Stack gap={18} w="100%">
      {/* Everything below edits the public profile; this jumps to the real thing. */}
      {user?.username && (
        <GradientButtonSecondary
          size="sm"
          w="fit-content"
          gradient={{ from: "#912691", to: "#14e0de", deg: 90 }}
          rightSection={<IconExternalLink size={14} />}
          onClick={() => navigate(`/Users/${user.username}`)}
        >
          View your public profile
        </GradientButtonSecondary>
      )}
      {/* Mockup: 5fr / 7fr two-column grid on desktop, single column on mobile. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isOverLg ? "5fr 7fr" : "1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <LeftSideContent />
        <RightSideContent />
      </Box>
    </Stack>
  );
}

function LeftSideContent() {
  return (
    <Stack w="100%" miw={0} gap={18}>
      <Avatars />
      <CoverBackgrounds />
      <Tags />
    </Stack>
  );
}

/** Quantico panel heading used by every profile card (mockup: 16px desktop, 14px mobile). */
function SectionTitle(props: { children: React.ReactNode }) {
  const { isOverLg } = useMediaQuery();
  return (
    <Text
      fz={isOverLg ? 16 : 14}
      fw={700}
      c="white"
      tt="uppercase"
      style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.1em" }}
    >
      {props.children}
    </Text>
  );
}

function Wrapper(props: { children: React.ReactNode } & StackProps) {
  const { isOverLg } = useMediaQuery();
  const { children, p = isOverLg ? "24px 26px" : "18px 16px", sx, style, ...restProps } = props;
  // Redesigned surface: the dark angular panel from the mockup replaces the old
  // grey rounded card. Inline style wins over any caller `sx` radius so every
  // profile card reads angular. (Kept `sx` passthrough for layout overrides.)
  return (
    <Stack
      p={p}
      {...restProps}
      sx={sx}
      style={{ background: "#17151c", border: "1px solid #2a2637", borderRadius: 0, ...style }}
      gap={5}
    >
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
  const { isOverLg } = useMediaQuery();
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
      const { getDb, getStorage } = await import("../../../context/firebase");
      const [db, storage] = await Promise.all([getDb(), getStorage()]);

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
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

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
      const { getDb, getStorage } = await import("../../../context/firebase");
      const [db, storage] = await Promise.all([getDb(), getStorage()]);
      const { ref, deleteObject } = await import("firebase/storage");
      const { arrayRemove, doc, setDoc } = await import("firebase/firestore");

      // Modular ref() accepts the download URL directly, so this works no
      // matter which folder/nesting the file was uploaded under.
      const fileRef = ref(storage, url);

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
    <Wrapper>
      <Flex w="100%" justify="space-between" align="center" mb={14}>
        <SectionTitle>Avatars</SectionTitle>
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
        <Text fz={14} c="#E54156" mb={10}>
          You&apos;ve reached the max of {MAX_ITEMS_COUNT} avatars. Remove one before adding more.
        </Text>
      )}
      <Flex gap={14} wrap="wrap" align="center">
        {/* The picked avatar leads the row: larger circle with the gold ring
            (mockup). It keeps its remove action hidden, exactly as before when
            it was excluded from the list, so the active avatar can't be
            deleted out from under the profile. */}
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            src={user?.avatar || DefaultAvatar}
            alt={`${user?.displayName ?? user?.username ?? "Your"} avatar (selected)`}
            w={isOverLg ? 86 : 70}
            h={isOverLg ? 86 : 70}
            sx={{ borderRadius: "100%", border: "3px solid #FFD074" }}
          />
        </Box>
        {/* all of them except the one the has picked as his profile avatar */}
        {data &&
          data.avatars &&
          data.avatars
            .filter((avatarUrl) => avatarUrl !== user?.avatar)
            .reverse()
            .map((avatarUrl) => {
              return (
                <Box key={avatarUrl} sx={{ position: "relative", flexShrink: 0 }}>
                  <Avatar
                    onClick={() => handleSelectAvatar(avatarUrl)}
                    src={avatarUrl}
                    alt="Saved avatar option"
                    w={60}
                    h={60}
                    radius="xl"
                    sx={{ cursor: "pointer", border: "1px solid #2a2637" }}
                  />
                  <Box sx={{ position: "absolute", top: -4, right: -4 }}>
                    <Tooltip label="Remove">
                      <ActionIcon
                        onClick={() => handleRemoveAvatar(avatarUrl)}
                        color="red"
                        variant="filled"
                        radius="xl"
                        size="xs"
                        aria-label="Delete avatar"
                      >
                        <IconX />
                      </ActionIcon>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
        {Array(REMAINING_ITEMS_COUNT)
          .fill(0)
          .map((_) => (
            <Box
              key={uuid()}
              bg="#3C3A3C"
              w={60}
              h={60}
              sx={{ borderRadius: "100%", border: "1px solid #2a2637", flexShrink: 0 }}
            />
          ))}
      </Flex>
    </Wrapper>
  );
}

function CoverBackgrounds() {
  const { data } = useProfileQuery();
  const { isOverLg } = useMediaQuery();
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
      const { getDb, getStorage } = await import("../../../context/firebase");
      const [db, storage] = await Promise.all([getDb(), getStorage()]);

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
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

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
      const { getDb, getStorage } = await import("../../../context/firebase");
      const [db, storage] = await Promise.all([getDb(), getStorage()]);
      const { ref, deleteObject } = await import("firebase/storage");
      const { arrayRemove, doc, setDoc } = await import("firebase/firestore");

      // Modular ref() accepts the download URL directly, so this works no
      // matter which folder/nesting the file was uploaded under.
      const fileRef = ref(storage, url);

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
    <Wrapper>
      <Flex w="100%" justify="space-between" align="center" mb={14}>
        <SectionTitle>Cover Background</SectionTitle>
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
        <Text fz={14} c="#E54156" mb={14}>
          You&apos;ve reached the max of 6 cover backgrounds. Remove one before adding more.
        </Text>
      )}
      <Conditional
        condition={!!data?.cover_backgrounds?.length}
        component={
          /* Mockup: 2-column swatch grid; the active cover gets a cyan border
             and a SELECTED tag strip along the bottom. */
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: isOverLg ? 12 : 10,
            }}
          >
            {data &&
              data.cover_backgrounds &&
              data.cover_backgrounds
                .slice()
                .reverse()
                .map((cover_background_url) => {
                  const isActive = data.coverBG === cover_background_url;
                  return (
                    /* Outer wrapper stays visible so the delete button can
                       overhang the swatch corner (mockup). */
                    <Box key={cover_background_url} sx={{ position: "relative" }}>
                      <Box
                        onClick={() => handleSelectCoverImage(cover_background_url)}
                        role="img"
                        aria-label={isActive ? "Selected cover background" : "Cover background option"}
                        sx={{
                          height: isOverLg ? 76 : 60,
                          overflow: "hidden",
                          cursor: "pointer",
                          border: isActive ? "2px solid #14e0de" : "1px solid #2a2637",
                          backgroundImage: `url(${cover_background_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          "&:hover": { borderColor: "#12B7B6" },
                        }}
                      >
                        {isActive && (
                          <Text
                            tt="uppercase"
                            c="white"
                            ta="center"
                            fw={700}
                            fz={isOverLg ? 14 : 10}
                            w="100%"
                            py={4}
                            sx={{
                              fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                              letterSpacing: "0.16em",
                              background: "rgba(10,9,13,0.6)",
                            }}
                          >
                            Selected
                          </Text>
                        )}
                      </Box>
                      <Box sx={{ position: "absolute", top: -4, right: -4 }}>
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
                            aria-label="Delete cover"
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
          </Box>
        }
        fallback={<EmptyMessage message="No covers found" />}
      />
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
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

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
    <Wrapper>
      <SectionTitle>Tags</SectionTitle>
      <Text fz={14} c="#b6b1bc" mt={8} mb={14}>
        Maximum 6 tags allowed. These are used to make filtering and searching easy on the users
        page.
      </Text>
      {/* Mockup pills: dark grey rounded chips; TagsInput keeps the add/remove
          behavior and the 6-tag cap. */}
      <TagsInput
        onChange={(values) => setItems(values.map((value) => ({ value, label: value })))}
        disabled={processing}
        value={items.map((selectItem) => selectItem.value)}
        maxTags={6}
        styles={{
          pill: {
            background: "#3C3A3C",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 50,
            padding: "7px 8px 7px 14px",
            height: "auto",
          },
          input: { background: "#0e0d11", borderColor: "#2a2637" },
        }}
      />
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
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

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
    <Stack miw={0} gap={18}>
      <Wrapper id="profile-save-anchor">
        <Flex justify="space-between" align="center" mb={10}>
          <Title
            c="white"
            order={2}
            size={16}
            tt="uppercase"
            style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.1em" }}
          >
            Description
          </Title>
          <Text fz={14} c={isLoading ? "dimmed" : "#12B7B6"} role="status" aria-live="polite">
            {isLoading ? "Saving changes..." : isSuccess ? "Saved" : ""}
          </Text>
        </Flex>
        <Text fz={14} fw={700} c="#12B7B6" mb={10}>
          The content is automatically saved.
        </Text>
        <Box sx={{ border: "1px solid #2a2637", overflow: "hidden" }}>
          <Editor editor={editor} />
        </Box>
        <GradientButtonPrimary
          fullWidth
          mt={16}
          loading={isLoading}
          onClick={() => mutate()}
          styles={{ root: { paddingTop: 16, paddingBottom: 16, height: "auto" } }}
        >
          Save Your Changes
        </GradientButtonPrimary>
      </Wrapper>
      {/* Featured picks moved to the right column under Description (desktop
          mockup); on mobile it simply stacks below. */}
      <FeaturedPicks />
    </Stack>
  );
}
