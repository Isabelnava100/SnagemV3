import {
  Box,
  Button,
  Flex,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
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
import { getNotifications } from "../../../queries/game";
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
      <Flex justify="space-between" align="center" px={4}>
        <Text c="white" fw={700} fz={18} lineClamp={1}>
          Welcome, {user?.displayName}!
        </Text>
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

/** Bell with unread count; clicking opens the notification inbox (Q7). */
function NotificationBell() {
  const { user } = useAuth();
  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.uid],
    queryFn: () => getNotifications(user!.uid),
    enabled: !!user,
  });
  const unread = (notifications ?? []).filter((n) => !n.read).length;
  return (
    <Link to="/Dashboard/Settings/Notifications" style={{ position: "relative" }}>
      <Image src={Bell} alt="Notifications" width={40} />
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
    </Link>
  );
}

/** Compact currency chip: icon + amount + label, contained so it never breaks. */
function CurrencyChip(props: { amount: string; name: string; color: string; icon: string }) {
  return (
    <Flex
      bg={props.color}
      align="center"
      gap={8}
      px={12}
      py={8}
      style={{ borderRadius: 12, flex: 1, minWidth: 0 }}
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
          {props.amount.padStart(3, "0")}
        </Text>
        <Text c="white" fz={11} lineClamp={1}>
          {props.name}
        </Text>
      </Stack>
    </Flex>
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
      path: "/Admin-Access",
      icon: AdminAccessIcon,
      label: "Admin Access",
      enabled: user?.otherinfo?.permissions === "Admin",
    },
  ];

  return (
    <SectionWrapper
      title="Tabs"
      customHeader={
        <Paper bg="#3C3A3C">
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
                        paddingLeft: isOverMd ? 20 : 14,
                        paddingRight: isOverMd ? 20 : 14,
                        paddingTop: 10,
                        paddingBottom: 10,
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                      to={linkPath}
                      key={link.path}
                    >
                      <Group gap={10} wrap="nowrap">
                        <Image width={isOverMd ? 40 : 26} src={link.icon} alt={link.label} />
                        {isActive && isOverMd && (
                          <Text c="white" fz={20} tt="uppercase">
                            {link.label}
                          </Text>
                        )}
                      </Group>
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
