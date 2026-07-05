import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import type { EmotionSx as Sx } from "@mantine/emotion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";
import BackgroundImage from "../../../assets/images/dashboard-background.jpg";
import ItemsBackground from "../../../assets/images/items-background.png";
import PokemonImage from "../../../assets/images/sylveon.svg";
import SectionWrapper, { ActionButton } from "../../../components/Dashboard/SectionWrapper";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { useAuth } from "../../../context/AuthContext";
import { getItemImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  AdminAccessIcon,
  Bell,
  Bookmarks,
  Characters,
  DollarSign,
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
import { getCharacters, getCurrencies, getItems } from "../../../queries/dashboard";
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
      <Stack gap={isOverMd ? 30 : 10} w="100%">
        {isOverMd && (
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
              <Image src={Bell} alt="Bell icon" width={40} />
              <Text color="white" fz={20}>
                Welcome, {user?.displayName}!
              </Text>
            </Group>
          </Stack>
        )}
        <Announcements />
        <ItemsAndCurrencySection />
        <TabsPanel />
      </Stack>
    </Paper>
  );
}

function ItemsAndCurrencySection() {
  const [currentTab, setCurrentTab] = useState<"items" | "currency">("items");
  const { isOverLg } = useMediaQuery();
  return (
    <Stack gap={13}>
      {!isOverLg && (
        <Flex justify="end" align="center" gap={10}>
          <ActionIcon
            onClick={() => setCurrentTab("items")}
            variant={currentTab === "items" ? "filled" : undefined}
            color="brand"
            radius="xl"
            size="xl"
          >
            <Image src={Tether} width={25} />
          </ActionIcon>
          <ActionIcon
            onClick={() => setCurrentTab("currency")}
            variant={currentTab === "currency" ? "filled" : undefined}
            color="brand"
            radius="xl"
            size="xl"
          >
            <Image src={DollarSign} width={25} />
          </ActionIcon>
        </Flex>
      )}
      <Flex gap={25} maw="100%">
        {isOverLg ? (
          <>
            <MyItems />
            <MyCurrency />
          </>
        ) : currentTab === "items" ? (
          <MyItems />
        ) : (
          <MyCurrency />
        )}
      </Flex>
    </Stack>
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
          <Flex sx={{ overflowY: "hidden" }} align="center" justify="start" gap={isOverMd ? 45 : 0}>
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
                      paddingLeft: 25,
                      paddingRight: 25,
                      paddingTop: 10,
                      paddingBottom: 10,
                      textDecoration: "none",
                    }}
                    to={linkPath}
                    key={link.path}
                  >
                    <Group gap={10}>
                      <Image width={isOverMd ? 45 : 25} src={link.icon} alt={link.label} />
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

/** Mystery-box items open a pop-up on click; contents are deferred (board 3). */
const isMysteryBox = (name: string, category: string) =>
  /mystery|box/i.test(name) || /mystery|box/i.test(category);

function MyItems() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user?.uid as string),
  });
  const [mysteryItem, setMysteryItem] = useState<string | null>(null);
  const { isOverLg } = useMediaQuery();

  // no duplicate category
  const categories = useMemo(() => {
    return [...new Set(data?.map((item) => item.category))];
  }, [data?.length]);

  const itemCommonStyle: Sx = {
    borderRadius: 15,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 18,
    paddingRight: 18,
    color: "#FFFFFF",
  };

  return (
    <SectionWrapper
      willFetchData
      isLoading={isLoading}
      isError={isError}
      style={{ width: "100%", maxWidth: "100%", flex: 1 }}
      title="Your Items"
    >
      <Conditional
        condition={!categories.length}
        component={
          <Text color="white">
            You currently have no items!
            <br />
            You can get items by participating in Forums, completing Quests, buying at the
            Marketplace or playing Activities.
            <br />
            If you&apos;re a legacy user, please contact an admin in order to import your items over
            from the old forums.
          </Text>
        }
        fallback={
          <ScrollArea
            style={{ height: 260, width: "100%" }}
            pb={20}
            pr={20}
            sx={{
              background: `url(${ItemsBackground})`,
              backgroundSize: 250,
              backgroundRepeat: "no-repeat",
            }}
          >
            <Flex h="100%" w="100%" gap={25} sx={{ flexWrap: "nowrap" }}>
              {categories.sort().map((categoryName) => (
                <Stack key={categoryName} miw={330}>
                  <Title order={3} size={isOverLg ? 24 : 20} sx={itemCommonStyle} bg="#7e2c75a1">
                    {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
                  </Title>
                  {data
                    ?.filter((item) => item.category === categoryName)
                    // sort them in alphabetical order
                    .sort((a, b) => {
                      const nameA = a.name.toLowerCase();
                      const nameB = b.name.toLowerCase();

                      if (nameA < nameB) {
                        return -1;
                      }
                      if (nameA > nameB) {
                        return 1;
                      }
                      return 0;
                    })
                    .map((item, index) => (
                      <Box
                        key={index}
                        p={0}
                        bg="#3e3d3dba"
                        onClick={
                          isMysteryBox(item.name, item.category)
                            ? () => setMysteryItem(item.name)
                            : undefined
                        }
                        sx={{
                          ...itemCommonStyle,
                          overflow: "hidden",
                          cursor: isMysteryBox(item.name, item.category) ? "pointer" : undefined,
                        }}
                      >
                        <Flex w="100%" justify="space-between" align="center">
                          <Group px={18} py={10} gap={8}>
                            <Avatar src={getItemImageURL(item.filePath)} alt={item.name} w={40} />
                            <Text color="white" fz={16}>
                              {item.name}
                            </Text>
                          </Group>
                          <Box bg="#525151" py={10} px={20} sx={{ borderTopLeftRadius: 50 }}>
                            <Text color="white" fz={isOverLg ? 32 : 24}>
                              x{item.quantity}
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                    ))}
                </Stack>
              ))}
            </Flex>
          </ScrollArea>
        }
      />
      {/* Mystery box pop-up stub — opening mechanics land later. */}
      <Modal
        opened={!!mysteryItem}
        onClose={() => setMysteryItem(null)}
        title={<Text fw={700}>{mysteryItem}</Text>}
        centered
        radius={12}
      >
        <Text fz={14}>
          Something is rattling inside... Opening mystery boxes is coming soon!
        </Text>
      </Modal>
    </SectionWrapper>
  );
}

function Currency(props: { amount: string; name: string; color: string; icon: string }) {
  const { amount, name, color, icon } = props;
  return (
    <Paper bg={color} radius={8}>
      <Flex align="baseline" justify="start" px={10} py={5} gap={10}>
        <Image src={icon} mt={-100} alt="Icon" width={60} />
        <Text color="white" fz={32}>
          {amount.padStart(3, "0")}
        </Text>
        <Text color="white" fz={16}>
          {name}
        </Text>
      </Flex>
    </Paper>
  );
}

function MyCurrency() {
  const theme = useMantineTheme();
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-currencies", user?.uid],
    queryFn: () => getCurrencies(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();
  return (
    <SectionWrapper
      willFetchData
      isLoading={isLoading}
      isError={isError}
      title="Your Currency"
      style={{ width: isOverLg ? 345 : "100%" }}
      customHeader={
        <Flex pt={13} px={20} justify="end">
          <Title order={4} size={14} c="white">
            Your Currency
          </Title>
        </Flex>
      }
    >
      <Stack>
        <Currency
          icon={PokePesos}
          amount={data?.pokecoin || "000"}
          name="Poke Coin"
          color={theme.colors.pink[2]}
        />
        <Currency
          icon={GengarCoins}
          amount={data?.gengarcoin || "000"}
          name="Gengar Coin"
          color={theme.colors.pink[1]}
        />
        <Currency icon={SnagCoins} amount="000" name="Snag Emblems" color={theme.colors.pink[0]} />
      </Stack>
    </SectionWrapper>
  );
}
