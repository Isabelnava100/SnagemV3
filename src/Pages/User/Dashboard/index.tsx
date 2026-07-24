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
  UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAttention } from "../../../lib/attention";
import PokemonImage from "../../../assets/images/sylveon.webp";
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
  Marketplace,
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
  const { isOverMd, isOverXl } = useMediaQuery();

  return (
    <Paper
      bg="transparent"
      // Board rule: 900px-1440px viewports keep the main module >= 1200px tall.
      mih={isOverMd && !isOverXl ? 1200 : "100%"}
      py={isOverMd ? 30 : 10}
      px={isOverMd ? 75 : 5}
    >
      <Seo noindex title="Trainer Dashboard | Snagem Guild" />
      <Stack gap={isOverMd ? 24 : 12} w="100%">
        <DashboardHeader />
        <CurrencyBar />
        <ImportBanner />
        <NeedsAttention />
        <Announcements />
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
  // Gold banner language, same as the Gaia import banner below: tinted gold
  // card, gold border, angled bottom-right clip.
  return (
    <Box
      p={{ base: 14, sm: 18 }}
      style={{
        background: "rgba(255,208,116,0.07)",
        border: "1px solid rgba(255,208,116,0.4)",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
      }}
    >
      <Text
        fz={14}
        fw={700}
        c="#FFD074"
        tt="uppercase"
        mb={8}
        style={{
          letterSpacing: "0.12em",
          fontFamily: "var(--font-display, 'Quantico', sans-serif)",
        }}
      >
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
      gap={14}
      px={{ base: 16, sm: 22 }}
      py={{ base: 14, sm: 16 }}
      style={{ background: "rgba(255,208,116,0.07)", border: "1px solid rgba(255,208,116,0.4)" }}
    >
      <Box style={{ width: 24, height: 24, flexShrink: 0 }}>
        <SnagIcon name="gift" size={24} title="Import" />
      </Box>
      <Text fz={{ base: 13, sm: 15 }} c="white" style={{ flex: 1, minWidth: 0 }}>
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
            <SnagIcon name="bolt" size={24} title="Notifications" />
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
 * Currency stat tile (redesign): colored accent border (left on wide screens,
 * top on phones), currency icon, a large value and a small uppercase label.
 * The whole tile is tappable and opens a popover with the full name + balance.
 */
function CurrencyChip(props: {
  amount: number | string;
  name: string;
  /** Accent border color for the currency. */
  color: string;
  /** Color of the big value (gold for Snag Coins, white otherwise). */
  valueColor: string;
  icon: string;
  /** Small dimmed suffix after the value, e.g. "+ 1 piece". */
  suffix?: string;
}) {
  const { isOverXs } = useMediaQuery();
  // Tolerate both number (migrated) and string (legacy) currency values.
  const numeric = Number(props.amount ?? 0);
  const amount = Number.isFinite(numeric) ? numeric.toLocaleString("en-US") : String(props.amount);
  const value = (
    <>
      {amount}
      {props.suffix && (
        <Text component="span" fz={isOverXs ? 14 : 11} fw={700} c="#b6b1bc">
          {" "}
          {props.suffix}
        </Text>
      )}
    </>
  );
  return (
    <Popover position="bottom" withArrow shadow="md" width={180}>
      <Popover.Target>
        <UnstyledButton style={{ flex: 1, minWidth: 0 }}>
          {isOverXs ? (
            // Desktop/tablet: horizontal tile, colored left accent border.
            <Flex
              align="center"
              gap={14}
              px={20}
              py={16}
              style={{
                minWidth: 0,
                background: "#17151c",
                border: "1px solid #2a2637",
                borderLeft: `3px solid ${props.color}`,
              }}
            >
              <Image
                src={props.icon}
                w={30}
                h={30}
                fit="contain"
                alt={props.name}
                style={{ flexShrink: 0 }}
              />
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text c={props.valueColor} fz={22} fw={800} lh={1.1}>
                  {value}
                </Text>
                <Text
                  c="#b6b1bc"
                  fz={14}
                  fw={700}
                  tt="uppercase"
                  lineClamp={1}
                  style={{ letterSpacing: "0.16em" }}
                >
                  {props.name}
                </Text>
              </Stack>
            </Flex>
          ) : (
            // Phone: stacked tile with a colored top accent border, so the full
            // label fits at a small size instead of truncating to "S...".
            <Stack
              gap={2}
              px={12}
              py={12}
              style={{
                minWidth: 0,
                background: "#17151c",
                border: "1px solid #2a2637",
                borderTop: `3px solid ${props.color}`,
              }}
            >
              <Image src={props.icon} w={22} h={22} fit="contain" alt={props.name} />
              <Text c={props.valueColor} fz={17} fw={800} lh={1.1}>
                {value}
              </Text>
              <Text
                c="#b6b1bc"
                fz={9}
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: "0.1em", lineHeight: 1.3 }}
              >
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

/** Currency stays on top (mobile + desktop) as a row of three stat tiles. */
function CurrencyBar() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["get-currencies", user?.uid],
    queryFn: () => getCurrencies(user?.uid as string),
  });
  // Emblem pieces are cumulative; every 3 grant one emblem, so the remainder
  // is the progress toward the next one (the "+ N piece" suffix).
  const pieces = Number(data?.snagEmblemPieces ?? 0) % 3;
  // Accent colors per currency (gold / purple / teal), per the redesign.
  const chips = [
    {
      icon: PokePesos,
      amount: data?.pokecoin || "0",
      name: "Snag Coins",
      color: "#FFD074",
      valueColor: "#FFD074",
    },
    {
      icon: GengarCoins,
      amount: data?.gengarcoin || "0",
      name: "Gengar Coins",
      color: "#772976",
      valueColor: "#FFFFFF",
    },
    {
      icon: SnagCoins,
      amount: data?.snagemblem || "0",
      name: "Snag Emblems",
      color: "#12B7B6",
      valueColor: "#FFFFFF",
      suffix: pieces > 0 ? `+ ${pieces} piece${pieces === 1 ? "" : "s"}` : undefined,
    },
  ];
  return (
    <Flex gap={{ base: 8, sm: 14 }} wrap="nowrap">
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
    { path: "/Items", icon: Marketplace, label: "Items", enabled: true },
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
      bg="transparent"
      customHeader={
        <Paper bg="transparent" p={0} style={RESET_READING_SCALE}>
          {/* Horizontally scrollable so the tabs never overlap or overflow the
              viewport on mobile (scrollbar hidden). */}
          <Box component="nav" aria-label="Dashboard tabs">
            <ScrollArea type="never" scrollbarSize={0}>
              <Flex align="center" justify="start" gap={8} wrap="nowrap">
                {dashboardTabLinks
                  .filter((link) => link.enabled)
                  .map((link) => {
                    const linkPath = link.absolute ? link.path : `/Dashboard${link.path}`;
                    const isActive = currentPath.includes(linkPath);
                    const iconBox = isOverMd ? 20 : 18;
                    return (
                      <Link
                        className="dc-dash-tab"
                        style={{
                          background: isActive
                            ? "linear-gradient(90deg, #912691, #4D14C4)"
                            : "#17151c",
                          border: isActive ? "1px solid transparent" : "1px solid #2a2637",
                          paddingLeft: isOverMd ? 22 : 16,
                          paddingRight: isOverMd ? 22 : 16,
                          paddingTop: isOverMd ? 13 : 11,
                          paddingBottom: isOverMd ? 13 : 11,
                          textDecoration: "none",
                          flexShrink: 0,
                        }}
                        to={linkPath}
                        key={link.path}
                      >
                        {/* Redesigned pill: icon beside an uppercase Quantico label,
                            purple gradient fill on the active tab, dark bordered
                            pill otherwise. The fixed box + fit=contain normalizes
                            the different icon SVG bounds. */}
                        <Group gap={isOverMd ? 8 : 6} wrap="nowrap" align="center">
                          <Box
                            style={{
                              width: iconBox,
                              height: iconBox,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {link.snag ? (
                              <SnagIcon name={link.snag} size={iconBox} title={link.label} />
                            ) : (
                              <Image src={link.icon} alt={link.label} w="100%" h="100%" fit="contain" />
                            )}
                          </Box>
                          <Text
                            fz={isOverMd ? 14 : 12}
                            fw={700}
                            tt="uppercase"
                            c="white"
                            style={{
                              whiteSpace: "nowrap",
                              lineHeight: 1,
                              fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                              letterSpacing: isOverMd ? "0.12em" : "0.1em",
                            }}
                          >
                            {link.label}
                          </Text>
                        </Group>
                      </Link>
                    );
                  })}
              </Flex>
            </ScrollArea>
          </Box>
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
