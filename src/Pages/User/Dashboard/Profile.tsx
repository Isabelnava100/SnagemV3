import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Flex,
  Image,
  MultiSelect,
  MultiSelectProps,
  ScrollArea,
  SelectItem,
  Stack,
  Text,
  Title,
  Tooltip,
  type StackProps,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconX } from "@tabler/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { InfoCircle } from "tabler-icons-react";
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

const PROFILE_AVATARS_FOLDER_NAME = "profile-avatars";
const COVER_BACKGROUNDS_FOLDER_NAME = "cover-backgrounds";

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
      const count = MAX_ITEMS_COUNT - data?.avatars.length;
      return count >= 0 ? count : 0;
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

      const storageRef = ref(storage, `${PROFILE_AVATARS_FOLDER_NAME}/${fileName}`);

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
      const { doc, updateDoc } = await import("firebase/firestore");
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

  const handleRemoveAvatar = async (url: string) => {
    try {
      const { storage, db } = await import("../../../context/firebase");
      const { ref, deleteObject } = await import("firebase/storage");
      const { arrayRemove, doc, updateDoc } = await import("firebase/firestore");

      const httpsReference = storage.refFromURL(url);
      const fileName = httpsReference.name;

      const fileRef = ref(storage, `${PROFILE_AVATARS_FOLDER_NAME}/${fileName}`);

      await deleteObject(fileRef);

      // update the avatars array
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        avatars: arrayRemove(url),
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
        sx={{ borderRadius: "100%", flexShrink: 0, border: "4px solid white" }}
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
                      <div key={avatarUrl} className="relative">
                        <Avatar
                          onClick={() => handleSelectAvatar(avatarUrl)}
                          src={avatarUrl}
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

  const handleImageUpload = async () => {
    if (!fileBlob) return;
    try {
      setProcessing(true);

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      const { storage, db } = await import("../../../context/firebase");

      const fileName = `${uuid()}.jpg`;

      const storageRef = ref(storage, `${COVER_BACKGROUNDS_FOLDER_NAME}/${fileName}`);

      const res = await uploadBytes(storageRef, fileBlob);

      const imagePublicURL = await getDownloadURL(res.ref);

      // push it into avatars array in db
      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        cover_backgrounds: arrayUnion(imagePublicURL),
      });

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
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        coverBG: url,
      });

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
          <Text size={16} color="white">
            Cover Background
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
          condition={!!data?.cover_backgrounds.length}
          component={
            <ScrollArea pb={20}>
              <Flex gap={12} sx={{ flexWrap: "nowrap" }}>
                {data?.cover_backgrounds.map((cover_background_url) => {
                  const isActive = data.coverBG === cover_background_url;
                  return (
                    <div key={cover_background_url} className="relative">
                      <Image
                        onClick={() => handleSelectCoverImage(cover_background_url)}
                        src={cover_background_url}
                        sx={{
                          borderWidth: isActive ? 4 : 2,
                          borderColor: "white",
                          borderStyle: "solid",
                          borderRadius: 22,
                          overflow: "hidden",
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        width={160}
                        h={92}
                      />
                      {isActive && (
                        <div className="absolute bottom-0 left-0 w-full py-2">
                          <Text
                            transform="uppercase"
                            color="white"
                            align="center"
                            weight="bold"
                            size={14}
                          >
                            Selected
                          </Text>
                        </div>
                      )}
                    </div>
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
  const [items, setItems] = useState<SelectItem[]>([]);

  const handleCreateTag: MultiSelectProps["onCreate"] = (query) => {
    const item: SelectItem = { label: query, value: query };
    setItems((pre) => [...pre, item]);
    return query;
  };

  const addTag = async () => {
    if (isLoading) return;
    try {
      setProcessing(true);
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        tags: items.map((item) => item.value),
      });

      await queryClient.invalidateQueries({ queryKey: ["get-profile"] });
    } catch (err) {
      //
    } finally {
      setProcessing(false);
    }
  };

  React.useEffect(() => {
    if (!isLoading && data) {
      setItems(data.tags.map((tagString) => ({ label: tagString, value: tagString })));
    }
  }, [isLoading]);

  React.useEffect(() => {
    addTag();
  }, [items.length]);

  return (
    <Wrapper p={16}>
      <Stack>
        <Flex align="start" justify="center">
          <Text size={16} color="white">
            Tags
          </Text>
          <Alert icon={<InfoCircle />} py={0} color="gray" bg="transparent" sx={{ flex: 1 }}>
            Maximum 6 tags allowed. These are used to make filtering and searching easy on the users
            page.
          </Alert>
        </Flex>
        <MultiSelect
          onChange={(values) => setItems(values.map((value) => ({ value, label: value })))}
          data={items}
          disabled={processing}
          value={items.map((selectItem) => selectItem.value)}
          creatable
          searchable
          getCreateLabel={(query) => `+ Add ${query}`}
          onCreate={handleCreateTag}
        />
      </Stack>
    </Wrapper>
  );
}

function RightSideContent() {
  const { data } = useProfileQuery();
  const [value, setValue] = useState(data?.description);
  const [debounced] = useDebouncedValue(value, 500);
  const editor = useRichTextEditor({
    content: data?.description as string,
    async onUpdate({ editor }) {
      setValue(editor.getHTML());
    },
  });
  const { mutate, isLoading, isSuccess } = useMutation({
    mutationFn: () => saveChanges(),
  });
  const { user } = useAuth();

  const saveChanges = async () => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "profile");

      await updateDoc(docRef, {
        description: debounced,
      });
    } catch (err) {
      //
    }
  };

  React.useEffect(() => {
    mutate();
  }, [debounced]);

  return (
    <Stack sx={{ flex: 1 }}>
      <Wrapper sx={{ flex: 1, borderRadius: 22 }}>
        <Flex justify="space-between" align="center">
          <Title color="white" order={2} size={24}>
            Description
          </Title>
          {isLoading && <Text>Saving changes...</Text>}
          {isSuccess && <Text color="green">Saved</Text>}
        </Flex>
        <Box sx={{ borderRadius: 12, overflow: "hidden" }}>
          <Editor editor={editor} />
        </Box>
      </Wrapper>
    </Stack>
  );
}
