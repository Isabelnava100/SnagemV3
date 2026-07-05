import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Paper,
  Popover,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";
import BackgroundImage from "../../../assets/images/dashboard-background.jpg";
import PokemonImage from "../../../assets/images/sylveon.svg";
import SectionWrapper, { ActionButton } from "../../../components/Dashboard/SectionWrapper";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  AdminAccessIcon,
  Bell,
  Bookmarks,
  Characters,
  Drafts,
  GengarCoins,
  PokePesos,
  Pokemons,
  Profile,
  SettingsIcon,
  SnagCoins,
  Tether,
} from "../../../icons";
import {
  getAnnouncement,
  getReadAnnouncements,
  markAnnouncementRead,
} from "../../../queries/announcements";
import { getCharacters, getCurrencies } from "../../../queries/dashboard";
import { getNotifications, markNotificationsRead } from "../../../queries/game";
import { getImportRequest } from "../../../queries/imports";
import { RESET_READING_SCALE } from "../../../lib/readingSize";
import { canAccessStaffArea, isAdmin } from "../../../lib/permissions";
import { handleLogout } from "../../auth/components/LogoutHandle";
import "/src/assets/styles/dashboard.css";

export function Dashboard() {
  const { user } = useAuth();
  const { isOverMd, isOverXl } = useMediaQuery();

  return (
    <Paper
      sx={{
        background: isOverMd
          ? `linear-gradient(rgba(34, 12, 32, 0.65), rgba(34, 12, 32, 0.65)), url(${BackgroundImage})`
          : undefined,
        backgroundSize: isOverMd ? "100% 260px" : undefined,
        backgroundPosition: "top",
        backgroundRepeat: "no-repeat",
      }}
      // Board rule: 900px-1440px viewports keep the main module >= 1200px tall.
      mih={isOverMd && !isOverXl ? 1200 : "100%"}
      py={isOverMd ? 30 : 10}
      px={isOverMd ? 75 : 5}
    >
      <Stack gap={isOverMd ? 24 : 12} w="100%">
        <DashboardHeader />
        <CurrencyBar />
        <Announcements />
        <ImportBanner />
        <TabsPanel />
      </Stack>
    </Paper>
  );
}

/** Desktop: full title + logout + welcome. Mobile: compact welcome + bell. */
function DashboardHeader() {
  const { user } = useAuth();
  const { isOverMd } = useMediaQuery();

  if (!isOverMd) {
    return (
      <Flex justify="space-between" align="center" px={4} gap={8}>
        <Group gap={6} style={{ minWidth: 0 }} wrap="nowrap">
          <Text c="white" fw={700} fz={18} lineClamp={1}>
            Welcome, {user?.displayName}!
          </Text>
          {/* Logout lives here (not the nav) to avoid an accidental misclick. */}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={handleLogout}
            aria-label="Log out"
            style={{ flexShrink: 0 }}
          >
            <IconLogout size={20} />
          </ActionIcon>
        </Group>
        <NotificationBell />
      </Flex>
    );
  }

  return (
    <Stack gap={13}>
      <Flex justify="space-between" align="center">
        <Title order={2} c="white" size={40} tt="uppercase">
          Snag Dashboard
        </Title>
        <Button className="self-start" variant="subtle" onClick={handleLogout}>
          Logout
        </Button>
      </Flex>
      <Group>
        <NotificationBell />
        <Text color="white" fz={20}>
          Welcome, {user?.displayName}!
        </Text>
      </Group>
    </Stack>
  );
}

/**
 * Prompts returning Gaia members to restore their collection. Shows until they
 * mark the import complete; a rejected/granted state nudges them back too.
 */
function ImportBanner() {
  const { user } = useAuth();
  const isGaia = user?.otherinfo?.isGaia === "Yes";
  const { data: request } = useQuery({
    queryKey: ["import-request", user?.uid],
    queryFn: () => getImportRequest(user!.uid),
    enabled: !!user && isGaia,
  });

  if (!isGaia) return null;
  const status = request?.status;
  if (status === "completed") return null;

  const message =
    status === "pending"
      ? "Your import is waiting for staff approval."
      : status === "rejected"
      ? "Your import needs a small change before it can be approved."
      : status === "granted"
      ? "Your last import was approved. Add more or mark it complete."
      : "Welcome back! Import your currency, items, and Pokemon from the Gaia guild.";

  return (
    <Alert color="grape" variant="light" title="Restore your collection">
      <Group justify="space-between" align="center" wrap="wrap" gap={10}>
        <Text fz={14} c="white">
          {message}
        </Text>
        <Button component={Link} to="/Onboarding" size="xs" radius="xl" variant="white">
          Open import
        </Button>
      </Group>
    </Alert>
  );
}

/** Bell with unread count; opens a popover of recent notifications (Q7). */
function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.uid],
    queryFn: () => getNotifications(user!.uid),
    enabled: !!user,
  });
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  const openRead = () => {
    const ids = (notifications ?? []).filter((n) => !n.read).map((n) => n.id);
    if (ids.length && user) {
      markNotificationsRead(user.uid, ids).then(() =>
        queryClient.invalidateQueries({ queryKey: ["notifications", user.uid] })
      );
    }
  };

  return (
    <Popover width={300} position="bottom-end" withArrow shadow="md" onOpen={openRead}>
      <Popover.Target>
        <UnstyledButton style={{ position: "relative", lineHeight: 0 }}>
          {/* Fixed box + fit=contain: Mantine 9 Image ignores numeric width,
              which rendered the bell full-size. */}
          <Box style={{ width: 30, height: 30 }}>
            <Image src={Bell} alt="Notifications" w="100%" h="100%" fit="contain" />
          </Box>
          {unread > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -6,
                background: "#E35C65",
                color: "white",
                borderRadius: "100%",
                minWidth: 20,
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </Box>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" p={8}>
        <Text c="white" fw={700} fz={14} mb={6} px={4}>
          Notifications
        </Text>
        {notifications?.length ? (
          <ScrollArea.Autosize mah={320}>
            <Stack gap={4}>
              {notifications.map((n) => (
                <Text
                  key={n.id}
                  component={Link}
                  to={n.link || "/Dashboard"}
                  fz={13}
                  c="gray.3"
                  px={8}
                  py={6}
                  style={{ borderRadius: 8, background: "#3C3A3C", textDecoration: "none" }}
                >
                  {n.text}
                </Text>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text fz={13} c="dimmed" ta="center" py={16}>
            You have no notifications yet.
          </Text>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * Compact currency chip: icon + amount + label, contained so it never breaks.
 * The label is clamped to one line (it gets cut off on narrow phones), so the
 * whole chip is tappable and opens a popover with the full name + amount.
 */
function CurrencyChip(props: { amount: string; name: string; color: string; icon: string }) {
  const amount = props.amount.padStart(3, "0");
  return (
    <Popover position="bottom" withArrow shadow="md" width={180}>
      <Popover.Target>
        <UnstyledButton style={{ flex: 1, minWidth: 0 }}>
          <Flex
            bg={props.color}
            align="center"
            gap={8}
            px={12}
            py={8}
            style={{ borderRadius: 12, minWidth: 0 }}
          >
            <Box
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image src={props.icon} w={34} h={34} style={{ objectFit: "contain" }} alt={props.name} />
            </Box>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text c="white" fz={20} fw={700} lh={1.1}>
                {amount}
              </Text>
              <Text c="white" fz={11} lineClamp={1}>
                {props.name}
              </Text>
            </Stack>
          </Flex>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" p={10}>
        <Group gap={8} wrap="nowrap">
          <Box style={{ width: 28, height: 28, flexShrink: 0 }}>
            <Image src={props.icon} w="100%" h="100%" fit="contain" alt={props.name} />
          </Box>
          <Stack gap={0}>
            <Text c="white" fw={700} fz={14}>
              {props.name}
            </Text>
            <Text c="gray.4" fz={12}>
              Balance: {amount}
            </Text>
          </Stack>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

/** Currency stays on top (mobile + desktop) as a compact, always-visible row. */
function CurrencyBar() {
  const theme = useMantineTheme();
  const { user } = useAuth();
  const { isOverLg } = useMediaQuery();
  const { data } = useQuery({
    queryKey: ["get-currencies", user?.uid],
    queryFn: () => getCurrencies(user?.uid as string),
  });
  const chips = [
    { icon: PokePesos, amount: data?.pokecoin || "0", name: "Poke Coin", color: theme.colors.pink[2] },
    { icon: GengarCoins, amount: data?.gengarcoin || "0", name: "Gengar Coin", color: theme.colors.pink[1] },
    { icon: SnagCoins, amount: data?.snagemblem || "0", name: "Snag Emblems", color: theme.colors.pink[0] },
  ];
  return (
    <Flex gap={10} wrap="nowrap" maw={isOverLg ? 720 : undefined}>
      {chips.map((chip) => (
        <CurrencyChip key={chip.name} {...chip} />
      ))}
    </Flex>
  );
}

type DashboardTabLink = {
  path: string;
  icon: string;
  label: string;
  enabled: boolean;
};

function TabsPanel() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isOverMd } = useMediaQuery();
  const { user } = useAuth();
  const dashboardTabLinks: DashboardTabLink[] = [
    { path: "/Bookmarks", icon: Bookmarks, label: "Bookmarks", enabled: true },
    { path: "/Drafts", icon: Drafts, label: "Drafts", enabled: true },
    { path: "/Items", icon: Tether, label: "Items", enabled: true },
    { path: "/Characters", icon: Characters, label: "Characters", enabled: true },
    { path: "/Pokemon", icon: Pokemons, label: "Pokemon", enabled: true },
    { path: "/Profile", icon: Profile, label: "Profile", enabled: true },
    { path: "/Settings", icon: SettingsIcon, label: "Settings", enabled: true },
    {
      // Admins get the full "Admin Access"; directors with a staff capability
      // get a "Staff Tools" entry to the same area (with only their tools).
      path: "/Admin-Access",
      icon: AdminAccessIcon,
      label: isAdmin(user) ? "Admin Access" : "Staff Tools",
      enabled: canAccessStaffArea(user),
    },
  ];

  return (
    <SectionWrapper
      title="Tabs"
      customHeader={
        <Paper bg="#3C3A3C" style={RESET_READING_SCALE}>
          {/* Horizontally scrollable so the tabs never overlap or overflow the
              viewport on mobile. */}
          <ScrollArea type="never" scrollbarSize={0}>
            <Flex align="center" justify="start" gap={isOverMd ? 20 : 4} wrap="nowrap">
              {dashboardTabLinks
                .filter((link) => link.enabled)
                .map((link) => {
                  const linkPath = `/Dashboard${link.path}`;
                  const isActive = currentPath.includes(linkPath);
                  return (
                    <Link
                      style={{
                        background: isActive
                          ? "linear-gradient(180deg, #912691 28.65%, #4D14C4 89.06%)"
                          : undefined,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        paddingLeft: isOverMd ? 18 : 10,
                        paddingRight: isOverMd ? 18 : 10,
                        paddingTop: 8,
                        paddingBottom: 6,
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                      to={linkPath}
                      key={link.path}
                    >
                      {/* Icon + a tiny always-on label so the current tab is
                          identifiable at a glance (like the bottom nav). The
                          fixed box + fit=contain normalizes the icons so they
                          all render the same visual size despite different SVG
                          bounds. */}
                      <Stack gap={2} align="center" justify="center">
                        <Box
                          style={{
                            width: isOverMd ? 30 : 24,
                            height: isOverMd ? 30 : 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Image
                            src={link.icon}
                            alt={link.label}
                            w="100%"
                            h="100%"
                            fit="contain"
                          />
                        </Box>
                        <Text
                          fz={isOverMd ? 12 : 9}
                          fw={isActive ? 700 : 500}
                          tt="uppercase"
                          ta="center"
                          c={isActive ? "white" : "rgba(255,255,255,0.6)"}
                          style={{ whiteSpace: "nowrap", lineHeight: 1 }}
                        >
                          {link.label}
                        </Text>
                      </Stack>
                    </Link>
                  );
                })}
            </Flex>
          </ScrollArea>
        </Paper>
      }
    >
      <Outlet />
    </SectionWrapper>
  );
}

function Announcements() {
  const { isOverMd, isOverLg } = useMediaQuery();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Admin-managed announcement takes priority; the create-your-first-character
  // welcome shows as the fallback while the user has no characters yet.
  const { data: announcement } = useQuery({
    queryKey: ["announcement"],
    queryFn: getAnnouncement,
  });
  const { data: readIds } = useQuery({
    queryKey: ["announcement-read", user?.uid],
    queryFn: () => getReadAnnouncements(user!.uid),
    enabled: !!user,
  });
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async () => {
      if (!user || !announcement) return;
      await markAnnouncementRead(user.uid, announcement.id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["announcement-read", user?.uid] }),
  });

  const handleClick = () => {
    const nestedElement = document.querySelector("#app-layout-main");
    if (nestedElement) {
      navigate("/Dashboard/Characters");
      setTimeout(() => {
        nestedElement.scrollTo(0, nestedElement.scrollHeight);
      }, 500);
    }
  };

  const adminAnnouncementVisible =
    !!announcement?.active && !!announcement.id && !(readIds ?? []).includes(announcement.id);
  const showWelcome = !adminAnnouncementVisible && characters !== undefined
    ? characters.sortedData.length === 0
    : false;

  if (!adminAnnouncementVisible && !showWelcome) return null;

  return (
    <SectionWrapper
      title="Important Announcement!"
      style={{ overflow: "visible" }}
      action={
        adminAnnouncementVisible ? (
          <ActionButton action={() => markRead.mutateAsync()}>Mark as Read</ActionButton>
        ) : undefined
      }
    >
      <Flex direction="row-reverse" justify="space-between">
        {isOverLg && (
          <Box mt={-230} mr={100}>
            <Image src={PokemonImage} alt="Sylveon" />
          </Box>
        )}
        {adminAnnouncementVisible && announcement ? (
          <Stack sx={{ flex: 1 }}>
            <Text fw={600} color="white">
              {announcement.title}
            </Text>
            <Text style={{ whiteSpace: "pre-line" }}>{announcement.body}</Text>
            {announcement.ctaLabel && announcement.ctaUrl && (
              <Box>
                <GradientButtonPrimary
                  onClick={() => navigate(announcement.ctaUrl!)}
                  fullWidth={!isOverMd}
                >
                  {announcement.ctaLabel}
                </GradientButtonPrimary>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack sx={{ flex: 1 }}>
            <Text>
              Welcome to the Snagem Guild! We truly appreciate your stay.
              <br />
              It looks like you haven&apos;t created a character yet.
              <br />
              Please go here to create a character and start your journey with Snagem!
            </Text>
            <Box>
              <GradientButtonPrimary onClick={handleClick} fullWidth={!isOverMd}>
                Create Your First Character
              </GradientButtonPrimary>
            </Box>
          </Stack>
        )}
      </Flex>
    </SectionWrapper>
  );
}
