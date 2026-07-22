import {
  Anchor,
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
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAttention } from "../../../lib/attention";
import BackgroundImage from "../../../assets/images/dashboard-background.jpg";
import PokemonImage from "../../../assets/images/sylveon.svg";
import SectionWrapper, { ActionButton } from "../../../components/Dashboard/SectionWrapper";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { HERO_BORDER, HERO_GRADIENT, HERO_STRIPES } from "../../../components/common/PageHero";
import Seo from "../../../components/common/Seo";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  Bookmarks,
  Characters,
  Drafts,
  GengarCoins,
  PokePesos,
  Pokemons,
  Profile,
  SettingsIcon,
  SnagCoins,
} from "../../../icons";
import { SnagIcon, SnagIconName } from "../../../icons/SnagIcon";
import {
  getAnnouncement,
  getReadAnnouncements,
  markAnnouncementRead,
} from "../../../queries/announcements";
import OnboardingChecklist, {
  useOnboardingStatus,
} from "../../../components/onboarding/OnboardingChecklist";
import { getCurrencies } from "../../../queries/dashboard";
import { getNotifications, markNotificationsRead } from "../../../queries/game";
import { getImportRequest } from "../../../queries/imports";
import { RESET_READING_SCALE } from "../../../lib/readingSize";
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
      <Seo noindex title="Trainer Dashboard | Snagem Guild" />
      <Stack gap={isOverMd ? 24 : 12} w="100%">
        <DashboardHeader />
        <CurrencyBar />
        <NeedsAttention />
        <Announcements />
        <ImportBanner />
        <TabsPanel />
      </Stack>
    </Paper>
  );
}

/**
 * Desktop: full title + logout + welcome. Mobile: compact welcome + bell.
 * Wrapped in the shared hero banner so the dashboard opens like every other
 * section, while keeping its own unique content (welcome, bell, logout).
 */
function DashboardHeader() {
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const displayFont = "var(--font-display, 'Quantico', sans-serif)";

  // One responsive redesigned hero for phone + desktop (the old compact mobile
  // header is gone): kicker + controls row, big Quantico title, welcome line.
  const bannerClipped = {
    background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
    border: `1px solid ${HERO_BORDER}`,
    clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)",
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  return (
    <Box p={{ base: 20, sm: 36 }} style={bannerClipped}>
      <Stack gap={isOverSm ? 13 : 12} style={{ position: "relative" }}>
        <Flex justify="space-between" align="center" gap={12} wrap="nowrap">
          <Group gap={10} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
            <Box
              w={isOverSm ? 44 : 24}
              h={3}
              style={{ background: "#E54156", flexShrink: 0 }}
            />
            <Text
              fz={{ base: 10, sm: 14 }}
              fw={700}
              c="#FFD074"
              tt="uppercase"
              lineClamp={1}
              style={{ letterSpacing: "0.24em", fontFamily: displayFont }}
            >
              Guild Member Hub
            </Text>
          </Group>
          <Group gap={10} wrap="nowrap" style={{ flexShrink: 0 }}>
            <NotificationBell />
            <Button
              variant="outline"
              color="gray"
              onClick={handleLogout}
              radius={0}
              px={isOverSm ? 18 : 12}
              style={{
                clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
                borderColor: "rgba(255,255,255,0.4)",
                color: "#fff",
                fontFamily: displayFont,
                letterSpacing: "0.12em",
              }}
            >
              Log Out
            </Button>
          </Group>
        </Flex>
        <Text
          component="h1"
          c="white"
          fw={700}
          fz={{ base: 28, sm: 44 }}
          style={{ lineHeight: 1, margin: 0, fontFamily: displayFont, letterSpacing: "0.02em" }}
        >
          TRAINER DASHBOARD
        </Text>
        <Text c="#b6b1bc" fz={{ base: 14, sm: 16 }}>
          Welcome back, {user?.displayName}!
        </Text>
      </Stack>
    </Box>
  );
}

/**
 * Everything currently waiting on the member (egg, weekly cast, snag list,
 * trade offers, open mission threads), one line each with a jump link.
 * Hidden when nothing needs attention.
 */
function NeedsAttention() {
  const { items } = useAttention();
  if (!items.length) return null;
  return (
    <Box
      p="md"
      style={{ borderRadius: 12, background: "rgba(240,198,116,0.08)", border: "1px solid #4a3f28" }}
    >
      <Text fz={14} fw={800} c="#F5C842" tt="uppercase" mb={6} style={{ letterSpacing: 2 }}>
        Needs your attention
      </Text>
      <Stack gap={4}>
        {items.map((item) => (
          <Anchor key={item.key} component={Link} to={item.link} fz={15} c="gray.2" underline="hover">
            {item.text}
          </Anchor>
        ))}
      </Stack>
    </Box>
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
    <Group
      align="center"
      wrap="nowrap"
      gap={16}
      px={22}
      py={16}
      style={{ background: "rgba(255,208,116,0.07)", border: "1px solid rgba(255,208,116,0.4)" }}
    >
      <Box style={{ width: 24, height: 24, flexShrink: 0 }}>
        <SnagIcon name="gift" size={24} title="Import" />
      </Box>
      <Text fz={15} c="white" style={{ flex: 1, minWidth: 0 }}>
        {message}
      </Text>
      <Link to="/Onboarding" className="dc-cta dc-cta-gold" style={{ flexShrink: 0 }}>
        Open Import
      </Link>
    </Group>
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
        <UnstyledButton
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          style={{
            position: "relative",
            lineHeight: 0,
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,9,13,0.5)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {/* Crisp vector alert icon (burst) from the Snag icon set; replaced
              the old bell.svg which scaled blurry. */}
          <Box style={{ width: 24, height: 24 }}>
            <SnagIcon name="burst" size={24} title="Notifications" />
          </Box>
          {unread > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -6,
                background: "#E54156",
                color: "white",
                borderRadius: "100%",
                minWidth: 20,
                height: 20,
                fontSize: 14,
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
        <Text c="white" fw={700} fz={16} mb={6} px={4}>
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
                  fz={14}
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
          <Text fz={14} c="dimmed" ta="center" py={16}>
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
function CurrencyChip(props: { amount: number | string; name: string; color: string; icon: string }) {
  const { isOverXs } = useMediaQuery();
  const displayFont = "var(--font-display, 'Quantico', sans-serif)";
  // Tolerate both number (migrated) and string (legacy) currency values.
  const amount = String(props.amount ?? 0).padStart(3, "0");
  return (
    <Popover position="bottom" withArrow shadow="md" width={180}>
      <Popover.Target>
        <UnstyledButton style={{ flex: 1, minWidth: 0 }}>
          {isOverXs ? (
            // Desktop/tablet: wide horizontal tile, colored left border.
            <Flex
              bg="#17151c"
              align="center"
              gap={12}
              px={18}
              py={14}
              style={{
                minWidth: 0,
                border: "1px solid #2a2637",
                borderLeft: `3px solid ${props.color}`,
              }}
            >
              <Box
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image src={props.icon} w={34} h={34} style={{ objectFit: "contain" }} alt={props.name} />
              </Box>
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text c={props.color} fz={22} fw={800} lh={1.1} style={{ fontFamily: displayFont }}>
                  {amount}
                </Text>
                <Text c="#b6b1bc" fz={14} fw={700} tt="uppercase" lineClamp={1} style={{ letterSpacing: "0.16em" }}>
                  {props.name}
                </Text>
              </Stack>
            </Flex>
          ) : (
            // Phone: stacked tile with a colored top border, so the full label
            // fits at a small size instead of truncating to "S...".
            <Stack
              bg="#17151c"
              gap={3}
              px={12}
              py={12}
              style={{
                minWidth: 0,
                border: "1px solid #2a2637",
                borderTop: `3px solid ${props.color}`,
              }}
            >
              <Box style={{ width: 22, height: 22, display: "flex", alignItems: "center" }}>
                <Image src={props.icon} w={22} h={22} style={{ objectFit: "contain" }} alt={props.name} />
              </Box>
              <Text c={props.color} fz={17} fw={800} lh={1.1} style={{ fontFamily: displayFont }}>
                {amount}
              </Text>
              <Text c="#b6b1bc" fz={10} fw={700} tt="uppercase" style={{ letterSpacing: "0.06em", lineHeight: 1.15 }}>
                {props.name}
              </Text>
            </Stack>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" p={10}>
        <Group gap={8} wrap="nowrap">
          <Box style={{ width: 28, height: 28, flexShrink: 0 }}>
            <Image src={props.icon} w="100%" h="100%" fit="contain" alt={props.name} />
          </Box>
          <Stack gap={0}>
            <Text c="white" fw={700} fz={16}>
              {props.name}
            </Text>
            <Text c="gray.4" fz={14}>
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
  const { user } = useAuth();
  const { isOverLg } = useMediaQuery();
  const { data } = useQuery({
    queryKey: ["get-currencies", user?.uid],
    queryFn: () => getCurrencies(user?.uid as string),
  });
  // Accent colors per currency (gold / purple / teal), used for the tile number.
  const chips = [
    { icon: PokePesos, amount: data?.pokecoin || "0", name: "Snag Coins", color: "#FFD074" },
    { icon: GengarCoins, amount: data?.gengarcoin || "0", name: "Gengar Tokens", color: "#C17DC1" },
    { icon: SnagCoins, amount: data?.snagemblem || "0", name: "Snag Emblems", color: "#3ACCCB" },
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
  /** Original icon file (image src). Use `snag` instead for the Snag icon set. */
  icon?: string;
  /** Snag icon set glyph; takes precedence over `icon` when set. */
  snag?: SnagIconName;
  label: string;
  enabled: boolean;
  /** Link to `path` as-is (top-level), instead of under /Dashboard. */
  absolute?: boolean;
};

function TabsPanel() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isOverMd } = useMediaQuery();
  const dashboardTabLinks: DashboardTabLink[] = [
    { path: "/Bookmarks", icon: Bookmarks, label: "Bookmarks", enabled: true },
    { path: "/Drafts", icon: Drafts, label: "Drafts", enabled: true },
    { path: "/History", snag: "book", label: "History", enabled: true },
    { path: "/Items", snag: "bag", label: "Items", enabled: true },
    { path: "/Characters", icon: Characters, label: "Characters", enabled: true },
    { path: "/Pokemon", icon: Pokemons, label: "Pokemon", enabled: true },
    { path: "/Profile", icon: Profile, label: "Profile", enabled: true },
    { path: "/Settings", icon: SettingsIcon, label: "Settings", enabled: true },
    // Site Settings and Admin Access now live in the nav (More drawer), gated to
    // admins/directors, so they no longer appear on the Snag dashboard.
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
                  const linkPath = link.absolute ? link.path : `/Dashboard${link.path}`;
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
                          {link.snag ? (
                            <SnagIcon
                              name={link.snag}
                              size={isOverMd ? 30 : 24}
                              title={link.label}
                            />
                          ) : (
                            <Image
                              src={link.icon}
                              alt={link.label}
                              w="100%"
                              h="100%"
                              fit="contain"
                            />
                          )}
                        </Box>
                        <Text
                          fz={isOverMd ? 12 : 9}
                          fw={700}
                          tt="uppercase"
                          ta="center"
                          c={isActive ? "white" : "rgba(255,255,255,0.6)"}
                          style={{
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                            fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                            letterSpacing: "0.08em",
                          }}
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
  const onboarding = useOnboardingStatus();

  const markRead = useMutation({
    mutationFn: async () => {
      if (!user || !announcement) return;
      await markAnnouncementRead(user.uid, announcement.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement-read", user?.uid] });
      // The nav Alerts dot watches this key.
      queryClient.invalidateQueries({ queryKey: ["announcement-unseen", user?.uid] });
    },
  });

  const adminAnnouncementVisible =
    !!announcement?.active && !!announcement.id && !(readIds ?? []).includes(announcement.id);
  // Setup checklist welcome: shows while any onboarding step (character,
  // pokemon, stocked team) is incomplete, for brand-new members and Gaia
  // returnees alike.
  const showWelcome = !adminAnnouncementVisible && !onboarding.loading && !onboarding.complete;

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
            <OnboardingChecklist intro="Welcome to the Snagem Guild! Finish these three steps to start your journey on the forums:" />
          </Stack>
        )}
      </Flex>
    </SectionWrapper>
  );
}
