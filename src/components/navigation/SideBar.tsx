import {
  ActionIcon,
  Box,
  Drawer,
  Group,
  Image,
  Paper,
  Popover,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";
import { IconBooks, IconFileText, IconHome, IconSpeakerphone, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import useMediaQuery from "../../hooks/useMediaQuery";
import { getUnseenAnnouncement } from "../../queries/announcements";
import { AppNotification, getNotifications, markNotificationsRead } from "../../queries/game";
import {
  AdminAccessIcon,
  Forum,
  GengarCoins,
  Marketplace,
  Quests,
  SettingsIcon,
  TeamSangem,
} from "../../icons";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
import { useAlertsBadge } from "../../hooks/useAlertsBadge";
import { canAccessStaffArea, hasCapability, isAdmin } from "../../lib/permissions";
import { RESET_READING_SCALE } from "../../lib/readingSize";
import "/src/assets/styles/navigation.css";

// Nav icons are a mix: some are the guild's original icon files (kept where the
// owner wants the originals), others are the newer Snag icon set (SnagIcon).
type IconRef = { snag: SnagIconName } | { img: string };

interface NavItem {
  link: string;
  label: string;
  icon: IconRef;
}

const ALL_LINKS: NavItem[] = [
  { link: "/Colosseum", label: "Colosseum", icon: { snag: "swords" } },
  { link: "/Challenges", label: "Challenges", icon: { snag: "medal" } },
  { link: "/Missions", label: "Missions", icon: { img: Quests } },
  { link: "/Shop", label: "Shop", icon: { img: Marketplace } },
  { link: "/Research", label: "Research", icon: { snag: "flask" } },
  { link: "/Casino", label: "Casino", icon: { img: GengarCoins } },
  { link: "/Users", label: "Users", icon: { snag: "users" } },
  { link: "/Activities", label: "Activities", icon: { snag: "ferris" } },
  { link: "/Forum/Main-Forum", label: "Forum", icon: { img: Forum } },
  { link: "/Dashboard", label: "Console", icon: { img: TeamSangem } },
  { link: "/SNAG", label: "S.N.A.G.", icon: { snag: "walkie" } },
];

// Only these stay pinned to the main nav (the desktop rail and the mobile
// bottom bar). Everything else lives behind "More" so the rail stays clean and
// the bar stays thumb-friendly.
const PRIMARY_LABELS = ["Forum", "Console", "Shop", "S.N.A.G."];

const primaryLinks = PRIMARY_LABELS.map((label) => ALL_LINKS.find((l) => l.label === label)!);

/** Primary links for this user: the S.N.A.G. device is members-only. */
function usePrimaryLinks(): NavItem[] {
  const { user } = useAuth();
  return primaryLinks.filter((l) => l.label !== "S.N.A.G." || !!user);
}
const overflowLinks = ALL_LINKS.filter((l) => !PRIMARY_LABELS.includes(l.label));

/** Red dot pinned to a nav icon when something needs the member's attention. */
function AlertDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Box
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "#E54156",
        border: "2px solid #1E1D20",
      }}
    />
  );
}

/** Render a nav icon, whether it is an original image file or a SnagIcon. */
function NavGlyph(props: {
  icon: IconRef;
  size: number;
  cut?: string;
  opacity?: number;
  title?: string;
  /** Horizontal placement of the art in its box. Rail uses flex-start. */
  align?: "center" | "flex-start";
}) {
  const { icon, size, cut, opacity, title, align = "center" } = props;
  const dim = opacity != null ? { opacity } : undefined;
  if ("snag" in icon) {
    return <SnagIcon name={icon.snag} size={size} cut={cut} title={title} style={dim} />;
  }
  return (
    <Box
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: align,
        ...dim,
      }}
    >
      {/* The image fills the box, so object-position (not justify) is what
          left-aligns the contained art with the label. */}
      <Image
        src={icon.img}
        w="100%"
        h="100%"
        fit="contain"
        alt={title ?? ""}
        style={{ objectPosition: align === "flex-start" ? "left center" : "center" }}
      />
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared drawer grid (used by both the desktop and mobile "More" drawers)     */
/* -------------------------------------------------------------------------- */

function DrawerTile(props: { children: React.ReactNode }) {
  return (
    <Stack gap={6} align="center" py={12} style={{ background: "#3C3A3C", borderRadius: 12 }}>
      {props.children}
    </Stack>
  );
}

// One tile in the drawer grid. `tabler` for the fixed Home/Library/Policies
// icons, `icon` for the nav links and admin tools.
type DrawerTileDef = { link: string; label: string; tabler?: typeof IconHome; icon?: IconRef };

// Base tiles, in importance order (top item first). The grid lays these out
// bottom-right first (Home) and reads right-to-left then upward on mobile, so
// the most-used links sit closest to the thumb. Admin/staff tools are appended
// per-user at render time (see useDrawerTiles).
const BASE_DRAWER_TILES: DrawerTileDef[] = [
  { link: "/", label: "Home", tabler: IconHome },
  ...overflowLinks.map((l) => ({ link: l.link, label: l.label, icon: l.icon })),
  { link: "/Announcements", label: "News", tabler: IconSpeakerphone },
  // About reuses the Admin Access icon per the owner's request.
  { link: "/About", label: "About", icon: { img: AdminAccessIcon } },
  { link: "/Library", label: "Library", tabler: IconBooks },
  { link: "/Policies", label: "Policies", tabler: IconFileText },
];

/**
 * Drawer tiles for the current user. Site Settings and Admin Access live in the
 * nav (not the Snag dashboard) and are only shown to admins / directors with the
 * matching capability. The UI gate mirrors the Firestore rules; it is not the
 * real authorization boundary.
 */
function useDrawerTiles(): DrawerTileDef[] {
  const { user } = useAuth();
  const adminTiles: DrawerTileDef[] = [];
  if (isAdmin(user) || hasCapability(user, Capability.ManageSEO)) {
    adminTiles.push({
      link: "/Dashboard/Site-Settings",
      label: "Site Settings",
      icon: { img: SettingsIcon },
    });
  }
  if (canAccessStaffArea(user)) {
    adminTiles.push({
      link: "/Admin",
      label: isAdmin(user) ? "Admin Access" : "Staff Tools",
      icon: { img: AdminAccessIcon },
    });
  }
  return [...BASE_DRAWER_TILES, ...adminTiles];
}

function DrawerTileIcon({ tile }: { tile: DrawerTileDef }) {
  if (tile.tabler) {
    const Icon = tile.tabler;
    return (
      <Box style={{ height: 30, display: "flex", alignItems: "center" }}>
        <Icon size={26} color="white" />
      </Box>
    );
  }
  // cut matches the tile background (#3C3A3C) so SnagIcon cutlines read cleanly.
  return <NavGlyph icon={tile.icon ?? { snag: "pokeball" }} size={28} cut="#3C3A3C" title={tile.label} />;
}

const DRAWER_COLS = 3;

function DrawerGrid({ onNavigate, bottomUp }: { onNavigate: () => void; bottomUp?: boolean }) {
  const tiles = useDrawerTiles();
  // Mobile (bottomUp): fill bottom-right first, running right-to-left then up,
  // so the most-used tiles sit closest to the thumb. Reverse the DOM order and
  // pad the top row with blanks so Home always lands bottom-right. Desktop: keep
  // normal top-left-to-bottom-right reading order (blanks trail at the end).
  const cells = bottomUp ? [...tiles].reverse() : tiles;
  const leadEmpties = bottomUp ? (DRAWER_COLS - (cells.length % DRAWER_COLS)) % DRAWER_COLS : 0;
  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {Array.from({ length: leadEmpties }).map((_, i) => (
        <Box key={`empty-${i}`} aria-hidden />
      ))}
      {cells.map((tile) => (
        <Link key={tile.label} to={tile.link} onClick={onNavigate} style={{ textDecoration: "none" }}>
          <DrawerTile>
            <DrawerTileIcon tile={tile} />
            <Text fz={14} c="white" tt="uppercase">
              {tile.label}
            </Text>
          </DrawerTile>
        </Link>
      ))}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop vertical sidebar                                                    */
/* -------------------------------------------------------------------------- */

function SingleLink(props: { label: string; link: string; icon: IconRef }) {
  const { label, link, icon } = props;
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const { isOverSm, isOverMd } = useMediaQuery();
  return (
    <NavLink
      to={link}
      style={({ isActive }) => ({
        display: "flex",
        height: "100%",
        flexDirection: "column",
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: isOverSm ? 30 : 20,
        paddingRight: isOverSm ? 30 : 20,
        gap: "8px",
        justifyContent: "center",
        alignItems: "center",
        textDecoration: "none",
        background: isActive
          ? "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)"
          : undefined,
        borderTopRightRadius: isOverMd ? 30 : 0,
        borderBottomLeftRadius: isOverMd ? 0 : 15,
        borderBottomRightRadius: isOverMd ? 30 : 15,
      })}
    >
      <NavGlyph icon={icon} size={isUnder900 ? 40 : 44} title={label} />
      {!isUnder900 && (
        <Text c="white" tt="uppercase" fz={14}>
          {label}
        </Text>
      )}
    </NavLink>
  );
}

/**
 * Popover body for the nav Alerts button: recent notifications inline, plus
 * jump rows for staff-inbox work and an unseen announcement. Notifications are
 * marked read when the popover opens (see the trigger components).
 */
function AlertsDropdown(props: { onClose: () => void }) {
  const { user } = useAuth();
  const { staffPending } = useAlertsBadge();

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.uid],
    queryFn: () => getNotifications(user!.uid),
    enabled: !!user,
  });
  const { data: unseenAnnouncement } = useQuery({
    queryKey: ["announcement-unseen", user?.uid],
    queryFn: () => getUnseenAnnouncement(user!.uid),
    enabled: !!user,
  });

  const items = (notifications ?? []).slice(0, 12);
  const linkStyle = { textDecoration: "none" as const };
  const rowStyle = {
    borderRadius: 10,
    background: "#2a2830",
    padding: "8px 10px",
  };

  return (
    <Stack gap={8} w={290}>
      <Text fw={700} c="white" fz={16}>
        Alerts
      </Text>

      {staffPending > 0 && (
        <Link to="/Admin" onClick={props.onClose} style={linkStyle}>
          <Box style={{ ...rowStyle, border: "1px solid #7a5a1e" }}>
            <Text fz={14} fw={600} c="#F5C842">
              {staffPending} item{staffPending === 1 ? "" : "s"} waiting in the staff inbox
            </Text>
          </Box>
        </Link>
      )}

      {unseenAnnouncement && (
        <Link to="/Dashboard" onClick={props.onClose} style={linkStyle}>
          <Box style={{ ...rowStyle, border: "1px solid #5a3fb0" }}>
            <Text fz={14} fw={600} c="grape.3">
              New announcement on your dashboard
            </Text>
          </Box>
        </Link>
      )}

      {items.length === 0 && !staffPending && !unseenAnnouncement ? (
        <Text fz={14} c="dimmed" py={6}>
          You&apos;re all caught up.
        </Text>
      ) : (
        items.map((n) => (
          <Link key={n.id} to={n.link || "/Dashboard"} onClick={props.onClose} style={linkStyle}>
            <Box style={rowStyle}>
              <Text fz={14} c="white" lineClamp={2}>
                {n.text}
              </Text>
            </Box>
          </Link>
        ))
      )}
    </Stack>
  );
}

/**
 * Shared popover wiring for both Alerts triggers. Opening marks the unread
 * notifications read (mirrors the dashboard bell); the dot keeps showing for
 * staff work and unseen announcements, which have their own jump rows.
 */
function useAlertsPopover() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [opened, { close, toggle }] = useDisclosure(false);
  const { show } = useAlertsBadge();

  const markRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const list =
        queryClient.getQueryData<AppNotification[]>(["notifications", user.uid]) ??
        (await getNotifications(user.uid));
      const unread = list.filter((n) => !n.read).map((n) => n.id);
      if (unread.length) await markNotificationsRead(user.uid, unread);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.uid] }),
  });

  const onToggle = () => {
    if (!opened) markRead.mutate();
    toggle();
  };

  return { user, opened, close, onToggle, show };
}

/** Alerts popover trigger on the desktop rail. */
function AlertsSideButton() {
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const { isOverSm } = useMediaQuery();
  const { user, opened, close, onToggle, show } = useAlertsPopover();
  if (!user) return null;

  return (
    <Popover opened={opened} onChange={close} position="right-start" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton
          onClick={onToggle}
          aria-label={show ? "Alerts, new activity waiting" : "Alerts"}
          aria-expanded={opened}
          style={{
            display: "flex",
            width: "100%",
            flexDirection: "column",
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: isOverSm ? 30 : 20,
            paddingRight: isOverSm ? 30 : 20,
            gap: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box style={{ position: "relative" }}>
            <SnagIcon name="burst" size={isUnder900 ? 40 : 44} title="Alerts" />
            <AlertDot show={show} />
          </Box>
          {!isUnder900 && (
            <Text c="white" tt="uppercase" fz={14}>
              Alerts
            </Text>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" style={{ border: "1px solid #3C3A3C" }}>
        <AlertsDropdown onClose={close} />
      </Popover.Dropdown>
    </Popover>
  );
}

// Desktop "More" trigger, styled to match SingleLink but opening the drawer.
function MoreSideButton(props: { onClick: () => void }) {
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const { isOverSm } = useMediaQuery();
  return (
    <UnstyledButton
      onClick={props.onClick}
      style={{
        display: "flex",
        width: "100%",
        flexDirection: "column",
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: isOverSm ? 30 : 20,
        paddingRight: isOverSm ? 30 : 20,
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SnagIcon name="menu" size={isUnder900 ? 40 : 44} title="Menu" />
      {!isUnder900 && (
        <Text c="white" tt="uppercase" fz={14}>
          Menu
        </Text>
      )}
    </UnstyledButton>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom tab bar (app feel)                                            */
/* -------------------------------------------------------------------------- */

function TabButton(props: { item: NavItem }) {
  const { item } = props;
  const location = useLocation();
  // A tab is active when the current path starts with its base (so /Forum/…
  // and /Dashboard/… light the right tab on nested routes).
  const base = item.link.split("/").slice(0, 2).join("/");
  const isActive = location.pathname === "/" ? item.link === "/" : location.pathname.startsWith(base);
  return (
    <NavLink to={item.link} style={{ textDecoration: "none", flex: 1 }}>
      {/* +4px padding above, +2px below the icon/name group. */}
      <Stack gap={4} align="center" justify="center" pt={10} pb={6}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 30,
            borderRadius: 999,
            transition: "background 150ms ease",
            background: isActive
              ? "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)"
              : "transparent",
          }}
        >
          <NavGlyph icon={item.icon} size={22} title={item.label} opacity={isActive ? 1 : 0.65} />
        </Box>
        <Text fz={14} fw={isActive ? 700 : 500} c={isActive ? "white" : "rgba(255,255,255,0.6)"} tt="uppercase">
          {item.label}
        </Text>
      </Stack>
    </NavLink>
  );
}

/** Alerts popover trigger on the mobile bar; opens upward above the bar. */
function AlertsTabButton() {
  const { user, opened, close, onToggle, show } = useAlertsPopover();
  if (!user) return null;

  return (
    <Popover opened={opened} onChange={close} position="top" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton
          onClick={onToggle}
          style={{ flex: 1 }}
          aria-label={show ? "Alerts, new activity waiting" : "Alerts"}
          aria-expanded={opened}
        >
          <Stack gap={4} align="center" justify="center" pt={10} pb={6}>
            <Box
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 30,
                borderRadius: 999,
                background: opened
                  ? "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)"
                  : "transparent",
              }}
            >
              <SnagIcon name="burst" size={22} title="Alerts" style={{ opacity: opened ? 1 : 0.65 }} />
              <AlertDot show={show} />
            </Box>
            <Text
              fz={14}
              fw={opened ? 700 : 500}
              c={opened ? "white" : "rgba(255,255,255,0.6)"}
              tt="uppercase"
            >
              Alerts
            </Text>
          </Stack>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" style={{ border: "1px solid #3C3A3C" }}>
        <AlertsDropdown onClose={close} />
      </Popover.Dropdown>
    </Popover>
  );
}

function MoreButton(props: { active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton onClick={props.onClick} style={{ flex: 1 }}>
      <Stack gap={4} align="center" justify="center" pt={10} pb={6}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 30,
            borderRadius: 999,
            background: props.active
              ? "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)"
              : "transparent",
          }}
        >
          <SnagIcon name="menu" size={22} title="Menu" style={{ opacity: props.active ? 1 : 0.65 }} />
        </Box>
        <Text fz={14} fw={props.active ? 700 : 500} c={props.active ? "white" : "rgba(255,255,255,0.6)"} tt="uppercase">
          Menu
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

function MobileTabBar() {
  const [opened, { open, close }] = useDisclosure(false);
  const visibleLinks = usePrimaryLinks();

  return (
    <>
      <Paper
        style={RESET_READING_SCALE}
        sx={{
          width: "100%",
          background: "#1E1D20",
          borderTop: "1px solid #3C3A3C",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          // Clear the iPhone home indicator.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Mobile runs in the opposite order to the desktop rail: Menu on the
            left, Forum on the right (owner's preference). */}
        <Box style={{ display: "flex", alignItems: "stretch" }}>
          <MoreButton active={opened} onClick={open} />
          <AlertsTabButton />
          {[...visibleLinks].reverse().map((item) => (
            <TabButton key={item.label} item={item} />
          ))}
        </Box>
      </Paper>

      <Drawer
        opened={opened}
        onClose={close}
        position="bottom"
        size="100%"
        withCloseButton={false}
        styles={{
          content: { background: "#1E1D20", "--mantine-scale": "1" },
          // Fill the sheet and push everything to the bottom so the grid sits
          // just above the Menu/X row, mirroring the bottom main nav.
          body: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            minHeight: "100%",
            padding: 16,
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          },
        }}
      >
        <Stack gap={14}>
          <DrawerGrid onNavigate={close} bottomUp />
          {/* Controls sit at the bottom (Menu left, close right) to mirror the
              bottom main nav, thumb-friendly, with the list right above. */}
          <Group justify="space-between" align="center">
            <Text fw={700} c="white">
              Menu
            </Text>
            <ActionIcon variant="subtle" color="gray" onClick={close} aria-label="Close menu">
              <IconX size={22} />
            </ActionIcon>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
}

/* -------------------------------------------------------------------------- */

export const SideBar = () => {
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const [opened, { open, close }] = useDisclosure(false);
  const visibleLinks = usePrimaryLinks();

  if (isUnder900) return <MobileTabBar />;

  return (
    <>
      <Paper
        style={RESET_READING_SCALE}
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          borderTopRightRadius: 60,
          borderBottomRightRadius: 60,
          overflow: "auto",
          flexShrink: 0,
          justifyContent: "safe center",
        }}
      >
        {visibleLinks.map((link) => (
          <SingleLink {...link} key={link.label} />
        ))}
        <AlertsSideButton />
        <MoreSideButton onClick={open} />
      </Paper>

      <Drawer
        opened={opened}
        onClose={close}
        position="left"
        size={320}
        withCloseButton={false}
        styles={{ content: { background: "#1E1D20", "--mantine-scale": "1" }, body: { padding: 16 } }}
      >
        <Stack gap={14}>
          <Group justify="space-between" align="center">
            <Text fw={700} c="white">
              Menu
            </Text>
            <ActionIcon variant="subtle" color="gray" onClick={close} aria-label="Close menu">
              <IconX size={22} />
            </ActionIcon>
          </Group>
          <DrawerGrid onNavigate={close} />
        </Stack>
      </Drawer>
    </>
  );
};
