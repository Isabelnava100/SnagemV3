import { ActionIcon, Box, Drawer, Group, Image, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure, useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";
import { IconBooks, IconFileText, IconHome, IconX } from "@tabler/icons-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery";
import { Activities, Forum, Marketplace, Menu, Quests, TeamSangem, Users } from "../../icons";
import { RESET_READING_SCALE } from "../../lib/readingSize";
import "/src/assets/styles/navigation.css";

interface NavItem {
  link: string;
  label: string;
  icon: string;
}

const ALL_LINKS: NavItem[] = [
  { link: "/Colosseum", label: "Colosseum", icon: Activities },
  { link: "/Challenges", label: "Challenges", icon: Quests },
  { link: "/Missions", label: "Missions", icon: Quests },
  { link: "/Shop", label: "Shop", icon: Marketplace },
  { link: "/Research", label: "Research", icon: Marketplace },
  { link: "/Casino", label: "Casino", icon: Activities },
  { link: "/Users", label: "Users", icon: Users },
  { link: "/Activities", label: "Activities", icon: Activities },
  { link: "/Forum/Main-Forum", label: "Forum", icon: Forum },
  { link: "/Dashboard", label: "Snag", icon: TeamSangem },
];

// Only these two stay pinned to the main nav (the desktop rail and the mobile
// bottom bar). Everything else lives behind "More" so the rail stays clean and
// the bar stays thumb-friendly.
const PRIMARY_LABELS = ["Forum", "Snag", "Shop"];

const primaryLinks = PRIMARY_LABELS.map((label) => ALL_LINKS.find((l) => l.label === label)!);
const overflowLinks = ALL_LINKS.filter((l) => !PRIMARY_LABELS.includes(l.label));

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
// icons, `img` for the overflow-link sprites.
type DrawerTileDef = { link: string; label: string; tabler?: typeof IconHome; img?: string };

// Importance order, top item first. The grid lays these out bottom-right first
// (Home) and reads right-to-left then upward, so the most-used links sit
// closest to the thumb.
const DRAWER_TILES: DrawerTileDef[] = [
  { link: "/", label: "Home", tabler: IconHome },
  ...overflowLinks.map((l) => ({ link: l.link, label: l.label, img: l.icon })),
  { link: "/Library", label: "Library", tabler: IconBooks },
  { link: "/Policies", label: "Policies", tabler: IconFileText },
];

function DrawerTileIcon({ tile }: { tile: DrawerTileDef }) {
  if (tile.tabler) {
    const Icon = tile.tabler;
    return (
      <Box style={{ height: 30, display: "flex", alignItems: "center" }}>
        <Icon size={26} color="white" />
      </Box>
    );
  }
  // Fixed box + fit=contain: Mantine 9 Image ignores numeric width/height, so
  // constrain the box to size the icon.
  return (
    <Box style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Image src={tile.img} w="100%" h="100%" fit="contain" alt={tile.label} />
    </Box>
  );
}

const DRAWER_COLS = 3;

function DrawerGrid({ onNavigate }: { onNavigate: () => void }) {
  // Fill bottom-right first, running right-to-left then up. Reverse the DOM
  // order, then pad the top row with blanks so Home always lands bottom-right
  // no matter how many tiles there are.
  const cells = [...DRAWER_TILES].reverse();
  const leadEmpties = (DRAWER_COLS - (cells.length % DRAWER_COLS)) % DRAWER_COLS;
  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {Array.from({ length: leadEmpties }).map((_, i) => (
        <Box key={`empty-${i}`} aria-hidden />
      ))}
      {cells.map((tile) => (
        <Link key={tile.label} to={tile.link} onClick={onNavigate} style={{ textDecoration: "none" }}>
          <DrawerTile>
            <DrawerTileIcon tile={tile} />
            <Text fz={11} c="white" tt="uppercase">
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

function SingleLink(props: { label: string; link: string; icon: string }) {
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
        paddingTop: 14,
        paddingBottom: 14,
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
      <Image src={icon} width={isUnder900 ? 44 : 100} height={isUnder900 ? 40 : 100} alt={label} />
      {!isUnder900 && (
        <Text c="white" tt="uppercase" fz={16}>
          {label}
        </Text>
      )}
    </NavLink>
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
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: isOverSm ? 30 : 20,
        paddingRight: isOverSm ? 30 : 20,
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Image src={Menu} width={isUnder900 ? 44 : 100} height={isUnder900 ? 40 : 100} alt="More" />
      {!isUnder900 && (
        <Text c="white" tt="uppercase" fz={16}>
          More
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
          {/* w/h (not width/height, which Mantine 9 ignores) size the icon. */}
          <Image src={item.icon} w={22} h={22} fit="contain" alt={item.label} style={{ opacity: isActive ? 1 : 0.65 }} />
        </Box>
        <Text fz={9} fw={isActive ? 700 : 500} c={isActive ? "white" : "rgba(255,255,255,0.6)"} tt="uppercase">
          {item.label}
        </Text>
      </Stack>
    </NavLink>
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
          <Image src={Menu} w={22} h={22} fit="contain" alt="More" style={{ opacity: props.active ? 1 : 0.65 }} />
        </Box>
        <Text fz={9} fw={props.active ? 700 : 500} c={props.active ? "white" : "rgba(255,255,255,0.6)"} tt="uppercase">
          More
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

function MobileTabBar() {
  const [opened, { open, close }] = useDisclosure(false);

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
        <Box style={{ display: "flex", alignItems: "stretch" }}>
          {primaryLinks.map((item) => (
            <TabButton key={item.label} item={item} />
          ))}
          <MoreButton active={opened} onClick={open} />
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
          <DrawerGrid onNavigate={close} />
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
        {primaryLinks.map((link) => (
          <SingleLink {...link} key={link.label} />
        ))}
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
