import { Box, Flex, Stack, Switch, Text, TextInput, type SwitchProps } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Settings } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { getNotifications, markNotificationsRead } from "../../../../queries/game";
import { getSettings } from "../../../../queries/settings";

interface CustomSwitchProps extends SwitchProps {}

const CustomSwitch = React.forwardRef<HTMLInputElement, CustomSwitchProps>((props, ref) => {
  const { label, ...restProps } = props;
  return (
    <Switch
      label={label}
      size="md"
      color="cyan.1"
      styles={{ label: { color: "white" } }}
      {...restProps}
    />
  );
});

function CreateNewDiscordTicket() {
  const [input, setInput] = React.useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: isLoading } = useMutation({
    mutationKey: ["create-new-discord-ticket"],
    mutationFn: async () => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const docRef = doc(db, "tickets", "discord");
      await setDoc(
        docRef,
        {
          [uuid()]: {
            approved: false,
            discord_name: input,
            user_id: user?.uid,
            username: user?.username,
          },
        },
        { merge: true }
      );
    },
  });

  const handleClick = async () => {
    if (!input.trim().length) return;
    try {
      await mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["get-settings"] });
      setInput("");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Flex gap="md">
      <TextInput
        onChange={(e) => setInput(e.target.value)}
        value={input}
        placeholder="Enter Your Discord Name Tag"
        sx={{ flex: 1 }}
      />
      <GradientButtonSecondary loading={isLoading} onClick={handleClick}>
        Submit for Review
      </GradientButtonSecondary>
    </Flex>
  );
}

/**
 * In-app notification inbox (Q7): bookmarked-thread posts, @mentions, boss
 * battles, rewards and currency grants — produced by the Cloud Functions.
 * Discord delivery is a later, optional channel once accounts are linked.
 */
function NotificationsInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications, isPending } = useQuery({
    queryKey: ["notifications", user?.uid],
    queryFn: () => getNotifications(user!.uid),
    enabled: !!user,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = (notifications ?? []).filter((n) => !n.read).map((n) => n.id);
      if (unread.length && user) await markNotificationsRead(user.uid, unread);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.uid] }),
  });

  if (isPending) return null;
  if (!notifications?.length) {
    return (
      <Text fz={13} c="dimmed" mb={10}>
        You have no notifications yet.
      </Text>
    );
  }
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Stack gap={8} mb={10}>
      <Flex justify="space-between" align="center">
        <Text c="white" fw={600} fz={16}>
          Inbox{unreadCount ? ` (${unreadCount} unread)` : ""}
        </Text>
        {unreadCount > 0 && (
          <GradientButtonSecondary
            size="xs"
            radius="xl"
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutateAsync()}
          >
            Mark All Read
          </GradientButtonSecondary>
        )}
      </Flex>
      <Stack gap={4}>
        {notifications.map((notification) => (
          <Link
            key={notification.id}
            to={notification.link || "/Dashboard"}
            style={{ textDecoration: "none" }}
            onClick={() => {
              if (!notification.read && user) {
                markNotificationsRead(user.uid, [notification.id]).then(() =>
                  queryClient.invalidateQueries({ queryKey: ["notifications", user.uid] })
                );
              }
            }}
          >
            <Flex
              px={10}
              py={6}
              gap={8}
              align="center"
              style={{
                borderRadius: 8,
                background: notification.read ? "#3C3A3C" : "#1E1D20",
                borderLeft: notification.read ? undefined : "3px solid #17F1F0",
              }}
            >
              <Text fz={13} c={notification.read ? "dimmed" : "white"}>
                {notification.text}
              </Text>
            </Flex>
          </Link>
        ))}
      </Stack>
    </Stack>
  );
}

/**
 * Public Discord name toggle: users set a display Discord tag and choose
 * whether it shows on their public profile. Stored on the user doc
 * (discordName / discordPublic), self-writable.
 */
function DiscordPublicSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["discord-public", user?.uid],
    queryFn: async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const d = (await getDoc(doc(db, "users", user!.uid))).data();
      return { discordName: (d?.discordName as string) ?? "", discordPublic: !!d?.discordPublic };
    },
    enabled: !!user,
  });

  const [name, setName] = React.useState("");
  const [isPublic, setPublic] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !loaded) {
      setName(data.discordName);
      setPublic(data.discordPublic);
      setLoaded(true);
    }
  }, [data, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await updateDoc(doc(db, "users", user!.uid), {
        discordName: name.trim().slice(0, 60),
        discordPublic: isPublic,
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["discord-public", user?.uid] });
    },
  });

  if (isPending) return null;

  return (
    <Stack gap={8} p={12} sx={{ background: "#3C3A3C", borderRadius: 12 }}>
      <Text c="white" fw={600} fz={14}>
        Public Discord Name
      </Text>
      <TextInput
        placeholder="e.g. veronica#1234"
        value={name}
        onChange={(e) => {
          setSaved(false);
          setName(e.currentTarget.value);
        }}
        styles={{ input: { background: "#2E2D2E", color: "white" } }}
      />
      <CustomSwitch
        checked={isPublic}
        onChange={(e) => {
          setSaved(false);
          setPublic(e.currentTarget.checked);
        }}
        label="Show my Discord name on my public profile"
      />
      {saved && (
        <Text fz={13} c="green.0">
          Saved.
        </Text>
      )}
      <GradientButtonSecondary
        size="xs"
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save Discord Settings
      </GradientButtonSecondary>
    </Stack>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const [isFirstTime, setFirstTime] = React.useState(true);
  const { isLoading, isError, data, isSuccess } = useQuery({
    queryKey: ["get-settings"],
    queryFn: () => getSettings(user?.uid as string),
  });
  const { getInputProps, setValues, values } = useForm<Settings>({
    initialValues: {
      directPingNotifications: false,
      discordNotifications: false,
      postsAndBookmarkedThreadsNotification: false,
      siteNotifications: false,
    },
  });
  const [debouncedValue] = useDebouncedValue(values, 100);

  const { mutateAsync, isPending: isProcessing } = useMutation({
    mutationKey: ["update-settings"],
    mutationFn: async ({ settingsInput }: { settingsInput: Settings }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const docRef = doc(db, "users", user?.uid as string);
      await setDoc(docRef, { settings: { ...settingsInput } }, { merge: true });
    },
  });

  const queryClient = useQueryClient();

  const handleSaveChanges = async (values: Settings) => {
    try {
      await mutateAsync({ settingsInput: values });
      await queryClient.invalidateQueries({ queryKey: ["get-settings"] });
    } catch (err) {
      console.log(err);
    }
  };

  // Once the data is loaded, place that data in the form
  React.useEffect(() => {
    if (!isLoading && isSuccess) {
      setValues({ ...data });
    }
  }, [isLoading]);

  /**
   * * Autosave the changes
   * Don't save the document initially
   * Avoid it the first time, once the data is placed in the form,
   * Then allow saving it
   */
  React.useEffect(() => {
    if (!isFirstTime) {
      handleSaveChanges(debouncedValue);
    }
    setFirstTime(false);
  }, [debouncedValue]);

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  return (
    <Box className="bg-[#403C43] max-w-full flex-1 overflow-auto p-4 rounded-[22px]">
      <Stack>
        <NotificationsInbox />
        <CustomSwitch
          disabled={isProcessing}
          {...getInputProps("siteNotifications", { type: "checkbox" })}
          label="Enable on-site notifications"
        />
        <Stack>
          <CustomSwitch
            disabled={isProcessing}
            {...getInputProps("discordNotifications", { type: "checkbox" })}
            label="Enable Discord notifications"
          />
          {values.discordNotifications && <CreateNewDiscordTicket />}
          <DiscordPublicSettings />
        </Stack>
        <CustomSwitch
          disabled={isProcessing}
          {...getInputProps("postsAndBookmarkedThreadsNotification", { type: "checkbox" })}
          label="Receive notifications for new posts on your bookmarked threads"
        />
        <CustomSwitch
          disabled={isProcessing}
          {...getInputProps("directPingNotifications", { type: "checkbox" })}
          label="Receive notifications for direct pings"
        />
      </Stack>
    </Box>
  );
}
