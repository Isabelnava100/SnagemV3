import { ActionIcon, Box, Drawer, Group, Image, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure, useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";
import { IconBell, IconHome, IconX } from "@tabler/icons-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
  { link: "/Activities", label: "Activities", icon: Activities },
  { link: "/Missions", label: "Missions", icon: Quests },
  { link: "/Shop", label: "Shop", icon: Marketplace },
  { link: "/Users", label: "Users", icon: Users },
  { link: "/Forum/Main-Forum", label: "Forum", icon: Forum },
  { link: "/Dashboard", label: "Snag", icon: TeamSangem },
];

// The four primary destinations pinned to the mobile bottom bar; everything
// else lives behind "More" so the bar stays thumb-friendly (app convention).
const MOBILE_PRIMARY = ["Forum", "Missions", "Shop", "Snag"];

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
  const { user } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);

  const primary = MOBILE_PRIMARY.map((label) => ALL_LINKS.find((l) => l.label === label)!).filter(
    Boolean
  );
  const overflow = ALL_LINKS.filter((l) => !MOBILE_PRIMARY.includes(l.label));

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
          {primary.map((item) => (
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
          // just above the Menu/X row — mirroring the bottom main nav.
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
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Link to="/" onClick={close} style={{ textDecoration: "none" }}>
            <Stack gap={6} align="center" py={12} style={{ background: "#3C3A3C", borderRadius: 12 }}>
              <Box style={{ height: 30, display: "flex", alignItems: "center" }}>
                <IconHome size={26} color="white" />
              </Box>
              <Text fz={11} c="white" tt="uppercase">
                Home
              </Text>
            </Stack>
          </Link>
          {overflow.map((item) => (
            <Link key={item.label} to={item.link} onClick={close} style={{ textDecoration: "none" }}>
              <Stack gap={6} align="center" py={12} style={{ background: "#3C3A3C", borderRadius: 12 }}>
                {/* Fixed box + fit=contain: Mantine 9 Image ignores numeric
                    width/height, so constrain the box to size the icon. */}
                <Box style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image src={item.icon} w="100%" h="100%" fit="contain" alt={item.label} />
                </Box>
                <Text fz={11} c="white" tt="uppercase">
                  {item.label}
                </Text>
              </Stack>
            </Link>
          ))}
          {user && (
            // Profile lives under Users (the public-profile hub), and Logout
            // moved to the dashboard header (next to the welcome) to avoid an
            // accidental misclick in the nav.
            <Link
              to="/Dashboard/Settings/Notifications"
              onClick={close}
              style={{ textDecoration: "none" }}
            >
              <Stack gap={6} align="center" py={12} style={{ background: "#3C3A3C", borderRadius: 12 }}>
                <Box style={{ height: 30, display: "flex", alignItems: "center" }}>
                  <IconBell size={26} color="white" />
                </Box>
                <Text fz={11} c="white" tt="uppercase">
                  Alerts
                </Text>
              </Stack>
            </Link>
          )}
        </Box>
        {/* Controls sit at the bottom (Menu left, close right) to mirror the
            bottom main nav — thumb-friendly, with the list right above. */}
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

  if (isUnder900) return <MobileTabBar />;

  return (
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
      {ALL_LINKS.map((link) => (
        <SingleLink {...link} key={link.label} />
      ))}
    </Paper>
  );
};
