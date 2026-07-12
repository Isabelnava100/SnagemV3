import {
  Box,
  Button,
  Flex,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  type SwitchProps,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Settings } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { getNotifications, markNotificationsRead } from "../../../../queries/game";
import { getMyFriendCode, getSettings, saveFriendCode } from "../../../../queries/settings";
import {
  DISCORD_CLIENT_ID,
  discordAuthorizeUrl,
  getMyDiscord,
  linkDiscord,
  unlinkDiscord,
} from "../../../../queries/discord";

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

/**
 * In-app notification inbox (Q7): bookmarked-thread posts, @mentions, boss
 * battles, rewards and currency grants, produced by the Cloud Functions.
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
 * "Show my Discord name publicly": a plain toggle matching the other
 * switches. The Discord name is auto-grabbed once account linking ships;
 * this only controls whether it appears on the public profile. Stored on
 * the user doc (discordPublic), self-writable, saved on change.
 */
function DiscordPublicToggle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["discord-public", user?.uid],
    queryFn: async () => {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const d = (await getDoc(doc(db, "users", user!.uid))).data();
      return { discordPublic: !!d?.discordPublic };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      await updateDoc(doc(db, "users", user!.uid), { discordPublic: next });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discord-public", user?.uid] }),
  });

  if (isPending) return null;

  return (
    <CustomSwitch
      checked={!!data?.discordPublic}
      onChange={(e) => saveMutation.mutate(e.currentTarget.checked)}
      label="Show my Discord name on my public profile"
    />
  );
}

/**
 * "Connect Discord": runs the Discord OAuth flow. Clicking sends the member to
 * Discord; on return we read the `code` query param, exchange it server-side
 * (linkDiscord), and store their Discord id. Shows connected status + unlink.
 */
function ConnectDiscord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = React.useState("");

  const { data: link } = useQuery({
    queryKey: ["my-discord", user?.uid],
    queryFn: () => getMyDiscord(user!.uid),
    enabled: !!user,
  });

  const linkMutation = useMutation({
    mutationFn: (code: string) => linkDiscord(code),
    onSuccess: (r) => {
      setStatus(`Connected as ${r.discordUsername || "your Discord account"}.`);
      queryClient.invalidateQueries({ queryKey: ["my-discord", user?.uid] });
    },
    onError: (e) => setStatus((e as Error).message || "Could not connect Discord."),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkDiscord,
    onSuccess: () => {
      setStatus("Disconnected.");
      queryClient.invalidateQueries({ queryKey: ["my-discord", user?.uid] });
    },
  });

  // Handle the OAuth redirect back from Discord (?code=...).
  React.useEffect(() => {
    const code = searchParams.get("code");
    if (code && !linkMutation.isPending) {
      linkMutation.mutateAsync(code).catch(() => undefined);
      // Clean the code out of the URL so a refresh doesn't re-run it.
      searchParams.delete("code");
      searchParams.delete("state");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connected = !!link?.discordUID;

  return (
    <Stack gap={6}>
      {connected ? (
        <Group gap={10} wrap="wrap">
          <Text fz={13} c="white">
            Discord connected{link?.discordUsername ? ` as ${link.discordUsername}` : ""}.
          </Text>
          <Button
            size="xs"
            variant="light"
            color="red"
            loading={unlinkMutation.isPending}
            onClick={() => unlinkMutation.mutateAsync()}
          >
            Disconnect
          </Button>
        </Group>
      ) : DISCORD_CLIENT_ID ? (
        <GradientButtonSecondary
          radius="lg"
          w="fit-content"
          loading={linkMutation.isPending}
          onClick={() => {
            window.location.href = discordAuthorizeUrl();
          }}
        >
          Connect Discord
        </GradientButtonSecondary>
      ) : (
        <Text fz={13} c="dimmed">
          Discord connecting is not set up yet.
        </Text>
      )}
      {status && (
        <Text fz={12} c="dimmed" role="status" aria-live="polite">
          {status}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Switch friend code, stored on the member's own user doc. Prefills the
 * Colosseum tournament register form (registering there also updates it).
 */
function FriendCodeSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  const { data: savedCode, isPending } = useQuery({
    queryKey: ["friend-code", user?.uid],
    queryFn: () => getMyFriendCode(user!.uid),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!loaded && savedCode !== undefined) {
      setCode(savedCode);
      setLoaded(true);
    }
  }, [savedCode, loaded]);

  const saveMutation = useMutation({
    mutationFn: () => saveFriendCode(user!.uid, code),
    onSuccess: () => {
      setStatus("Friend code saved.");
      queryClient.invalidateQueries({ queryKey: ["friend-code", user?.uid] });
    },
    onError: () => setStatus("Could not save your friend code. Try again."),
  });

  if (isPending) return null;

  return (
    <Stack gap={6}>
      <TextInput
        label="Switch friend code"
        placeholder="SW-0000-0000-0000"
        description="Used to prefill tournament registrations in the Colosseum."
        value={code}
        onChange={(e) => setCode(e.currentTarget.value)}
        maw={320}
      />
      <Button
        size="xs"
        variant="light"
        w="fit-content"
        loading={saveMutation.isPending}
        disabled={code.trim() === (savedCode ?? "")}
        onClick={() => saveMutation.mutate()}
      >
        Save friend code
      </Button>
      {status && (
        <Text fz={12} c="dimmed" role="status" aria-live="polite">
          {status}
        </Text>
      )}
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

  const { mutateAsync } = useMutation({
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
          {...getInputProps("siteNotifications", { type: "checkbox" })}
          label="Enable on-site notifications"
        />
        <Stack gap={8}>
          <CustomSwitch
            {...getInputProps("discordNotifications", { type: "checkbox" })}
            label="Enable Discord notifications"
          />
          <ConnectDiscord />
          <DiscordPublicToggle />
        </Stack>
        <FriendCodeSection />
        <CustomSwitch
          {...getInputProps("postsAndBookmarkedThreadsNotification", { type: "checkbox" })}
          label="Receive notifications for new posts on your bookmarked threads"
        />
        <CustomSwitch
          {...getInputProps("directPingNotifications", { type: "checkbox" })}
          label="Receive notifications for direct pings"
        />
      </Stack>
    </Box>
  );
}
