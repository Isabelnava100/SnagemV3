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
import { ConfirmPopover } from "../../../../components/common/ConfirmPopover";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Settings } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { toastError } from "../../../../lib/toast";
import { getNotifications, markNotificationsRead } from "../../../../queries/game";
import { getMyFriendCode, getSettings, saveFriendCode } from "../../../../queries/settings";
import {
  discordAuthorizeUrl,
  getDiscordPublicClientId,
  getMyDiscord,
  linkDiscord,
  unlinkDiscord,
} from "../../../../queries/discord";

interface CustomSwitchProps extends SwitchProps {}

// NOTE: the forwarded ref is accepted but never attached to the inner Switch.
// Mockup toggle: cyan track (#12B7B6) when on, dark grey (#3C3A3C) when off;
// both come from the Switch CSS vars so the checked state keeps its color.
const CustomSwitch = React.forwardRef<HTMLInputElement, CustomSwitchProps>((props, _ref) => {
  const { label, ...restProps } = props;
  return (
    <Switch
      label={label}
      size="md"
      style={{ "--switch-bg": "#3C3A3C", "--switch-color": "#12B7B6" } as React.CSSProperties}
      styles={{ label: { color: "white", fontWeight: 700, fontSize: 15 } }}
      {...restProps}
    />
  );
});

/** Thin section separator used between settings groups (mockup border-top). */
function SectionDivider() {
  return <Box mt={18} pt={18} sx={{ borderTop: "1px solid #2a2637" }} />;
}

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
      <Text fz={14} c="dimmed" mb={10}>
        You have no notifications yet.
        <br />
        Bookmark a thread in the <Link to="/Forum/Main-Forum">Forums</Link> to get pinged about new
        posts.
      </Text>
    );
  }
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Stack gap={8} mb={10}>
      <Flex justify="space-between" align="center">
        <Text c="white" fw={600} fz={20}>
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
                borderRadius: 0,
                background: notification.read ? "#141318" : "#1E1D20",
                borderLeft: notification.read ? undefined : "3px solid #17F1F0",
              }}
            >
              <Text fz={14} c={notification.read ? "dimmed" : "white"}>
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
      const { getDb } = await import("../../../../context/firebase");
      const db = await getDb();
      const d = (await getDoc(doc(db, "users", user!.uid))).data();
      return { discordPublic: !!d?.discordPublic };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { getDb } = await import("../../../../context/firebase");
      const db = await getDb();
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
  // Read at runtime rather than from a build-time env var, so an admin saving
  // the Discord settings turns this button on without a redeploy.
  const { data: discordClientId } = useQuery({
    queryKey: ["discord-client-id"],
    queryFn: getDiscordPublicClientId,
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
          <Text fz={14} c="white">
            Discord connected{link?.discordUsername ? ` as ${link.discordUsername}` : ""}.
          </Text>
          <ConfirmPopover
            message="Disconnect Discord? You'll stop getting Discord pings until you reconnect."
            confirmLabel="Disconnect"
            loading={unlinkMutation.isPending}
            onConfirm={() => unlinkMutation.mutateAsync()}
            target={(open) => (
              <Button
                size="xs"
                variant="light"
                color="red"
                loading={unlinkMutation.isPending}
                onClick={open}
              >
                Disconnect
              </Button>
            )}
          />
        </Group>
      ) : discordClientId ? (
        <GradientButtonSecondary
          radius="lg"
          w="fit-content"
          loading={linkMutation.isPending}
          onClick={() => {
            window.location.href = discordAuthorizeUrl(discordClientId);
          }}
        >
          Connect Discord
        </GradientButtonSecondary>
      ) : (
        <Text fz={14} c="dimmed">
          Discord connecting is not set up yet.
        </Text>
      )}
      {status && (
        <Text fz={14} c="dimmed" role="status" aria-live="polite">
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
  const [statusIsError, setStatusIsError] = React.useState(false);
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

  // Same shape as the Colosseum register card; normalized on save.
  const normalizedCode = code.trim().toUpperCase();
  const codeInvalid = normalizedCode.length > 0 && !/^SW-\d{4}-\d{4}-\d{4}$/.test(normalizedCode);

  const saveMutation = useMutation({
    mutationFn: () => saveFriendCode(user!.uid, normalizedCode),
    onSuccess: () => {
      setStatus("Friend code saved.");
      setStatusIsError(false);
      queryClient.invalidateQueries({ queryKey: ["friend-code", user?.uid] });
    },
    onError: () => {
      setStatus("Could not save your friend code. Try again.");
      setStatusIsError(true);
    },
  });

  if (isPending) return null;

  return (
    <Stack gap={6}>
      <Text
        c="white"
        fz={15}
        fw={700}
        style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.08em" }}
      >
        SWITCH FRIEND CODE
      </Text>
      <Text fz={14} c="#b6b1bc">
        Used to prefill tournament registrations in the Colosseum.
      </Text>
      <Group gap={10} wrap="wrap" align="center">
        <TextInput
          aria-label="Switch friend code"
          placeholder="SW-0000-0000-0000"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
          error={codeInvalid ? "Format: SW-1234-4567-8901" : undefined}
          w={260}
          styles={{ input: { background: "#0e0d11", borderColor: "#2a2637" } }}
        />
        <GradientButtonPrimary
          size="sm"
          loading={saveMutation.isPending}
          disabled={codeInvalid || normalizedCode === (savedCode ?? "")}
          onClick={() => saveMutation.mutate()}
        >
          Save friend code
        </GradientButtonPrimary>
      </Group>
      {status && (
        <Text fz={14} c={statusIsError ? "red.4" : "dimmed"} role="status" aria-live="polite">
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
  // Defaults mirror the server (notifyUsers treats unset as ON), so a member
  // who never saved settings sees switches that match what actually happens.
  const { getInputProps, setValues, values } = useForm<Settings>({
    initialValues: {
      directPingNotifications: true,
      discordNotifications: false,
      postsAndBookmarkedThreadsNotification: true,
      siteNotifications: true,
      emailUpdates: true,
      weeklyReminders: true,
      activityNotifications: false,
    },
  });
  const [debouncedValue] = useDebouncedValue(values, 100);

  const [saveStatus, setSaveStatus] = React.useState("");
  const { mutateAsync } = useMutation({
    mutationKey: ["update-settings"],
    mutationFn: async ({ settingsInput }: { settingsInput: Settings }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { getDb } = await import("../../../../context/firebase");
      const db = await getDb();
      const docRef = doc(db, "users", user?.uid as string);
      await setDoc(docRef, { settings: { ...settingsInput } }, { merge: true });
    },
    onSuccess: () => setSaveStatus("Saved"),
    onError: (e) => {
      setSaveStatus("");
      toastError(e, "Could not save settings.");
    },
  });

  const queryClient = useQueryClient();

  const handleSaveChanges = async (values: Settings) => {
    try {
      await mutateAsync({ settingsInput: values });
      await queryClient.invalidateQueries({ queryKey: ["get-settings"] });
    } catch {
      // Reported via the mutation's onError toast.
    }
  };

  // Once the data is loaded, place that data in the form. Unsaved fields keep
  // the server-default ON state instead of flipping to off.
  React.useEffect(() => {
    if (!isLoading && isSuccess) {
      const saved = (data ?? {}) as Partial<Settings>;
      setValues({
        directPingNotifications: saved.directPingNotifications ?? true,
        discordNotifications: saved.discordNotifications ?? false,
        postsAndBookmarkedThreadsNotification: saved.postsAndBookmarkedThreadsNotification ?? true,
        siteNotifications: saved.siteNotifications ?? true,
        emailUpdates: saved.emailUpdates ?? true,
        weeklyReminders: saved.weeklyReminders ?? true,
        activityNotifications: saved.activityNotifications ?? false,
      });
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
  if (isError)
    return (
      <Text c="white" fz={15}>
        Could not load your notification settings. Refresh to try again.
      </Text>
    );

  return (
    <Box
      className="bg-[#17151c] border border-[#2a2637] max-w-full flex-1 overflow-auto"
      p={{ base: "18px 16px", lg: "28px 32px" }}
    >
      <Stack gap={18}>
        <Text
          role="status"
          aria-live="polite"
          fz={13}
          c="#12B7B6"
          style={{ minHeight: 18, visibility: saveStatus ? "visible" : "hidden" }}
        >
          {saveStatus || "saved"}
        </Text>
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
          <Text fz={14} c="#b6b1bc">
            Your site notifications also ping you in the guild's Discord
            notifications channel (never a private message). Requires a
            connected Discord account below.
          </Text>
          <ConnectDiscord />
          <DiscordPublicToggle />
        </Stack>
        <SectionDivider />
        <FriendCodeSection />
        <SectionDivider />
        <CustomSwitch
          {...getInputProps("postsAndBookmarkedThreadsNotification", { type: "checkbox" })}
          label="Receive notifications for new posts on your bookmarked threads"
        />
        <CustomSwitch
          {...getInputProps("directPingNotifications", { type: "checkbox" })}
          label="Receive notifications for direct pings"
        />
        <Stack gap={2}>
          <CustomSwitch
            {...getInputProps("emailUpdates", { type: "checkbox" })}
            label="Receive information via Email"
          />
          <Text fz={14} c="#b6b1bc">
            Announcements and site updates by email. Account emails such as
            password resets always come through, even with this off.
          </Text>
        </Stack>
        <Stack gap={2}>
          <CustomSwitch
            {...getInputProps("weeklyReminders", { type: "checkbox" })}
            label="Weekly reset reminders"
          />
          <Text fz={14} c="#b6b1bc">
            A Sunday nudge if your Snag List is unfinished, plus a Monday ping when it
            resets, the Fishing Pond restocks, and your weekly cast is back.
          </Text>
        </Stack>
        <Stack gap={2}>
          <CustomSwitch
            {...getInputProps("activityNotifications", { type: "checkbox" })}
            label="Activity notifications"
          />
          <Text fz={14} c="#b6b1bc">
            Off by default. Turn on to be pinged when someone makes an offer on your
            trade listing and when your Daycare egg is ready to hatch.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
