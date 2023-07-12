import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Sx,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
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
  SnagCoins,
  Tether,
} from "../../../icons";
import { getCurrencies, getItems } from "../../../queries/dashboard";
import { handleLogout } from "../../auth/components/LogoutHandle";
import "/src/assets/styles/dashboard.css";

export function Dashboard() {
  const { user } = useAuth();
  const { isOverMd } = useMediaQuery();

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
      mih="100%"
      py={isOverMd ? 30 : 10}
      px={isOverMd ? 75 : 5}
    >
      <Stack spacing={isOverMd ? 30 : 10} w="100%">
        {isOverMd && (
          <Stack spacing={13}>
            <Title order={2} color="white" size={40} transform="uppercase">
              Snag Dashboard
            </Title>
            <Group>
              <Image src={Bell} alt="Bell icon" width={40} />
              <Text color="white" size={20}>
                Welcome, {user?.displayName}!
              </Text>
            </Group>
            <Button className="self-start" variant="subtle" onClick={handleLogout}>
              Logout
            </Button>
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
    <Stack spacing={13}>
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
            {dashboardTabLinks.map((link) => {
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
                  <Group spacing={10}>
                    <Image width={isOverMd ? 45 : 25} src={link.icon} alt={link.label} />
                    {isActive && isOverMd && (
                      <Text color="white" size={20} transform="uppercase">
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
  const handleClick = () => {
    const nestedElement = document.querySelector("#app-layout-main");
    if (nestedElement) {
      navigate("/Dashboard/Characters");
      setTimeout(() => {
        nestedElement.scrollTo(0, nestedElement.scrollHeight);
      }, 500);
    }
  };
  return (
    <SectionWrapper
      title="Important Announcement!"
      style={{ overflow: "visible" }}
      action={<ActionButton action={() => {}}>Mark as Read</ActionButton>}
    >
      <Flex direction="row-reverse" justify="space-between">
        {isOverLg && (
          <Box mt={-230} mr={100}>
            <Image src={PokemonImage} alt="Sylveon" />
          </Box>
        )}
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
      </Flex>
    </SectionWrapper>
  );
}

function MyItems() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-items"],
    queryFn: () => getItems(user?.uid as string),
  });
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
        condition={!Boolean(categories.length)}
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
            sx={{
              background: `url(${ItemsBackground})`,
              backgroundSize: 250,
              backgroundRepeat: "no-repeat",
            }}
          >
            <Flex
              mah={260}
              maw={500}
              gap={25}
              sx={{
                flexWrap: "nowrap",
              }}
            >
              {categories.map((categoryName) => (
                <Stack key={categoryName} miw={330}>
                  <Title order={3} size={isOverLg ? 24 : 20} sx={itemCommonStyle} bg="#7e2c75a1">
                    {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
                  </Title>
                  {data
                    ?.filter((item) => item.category === categoryName)
                    .map((item, index) => (
                      <Box
                        key={index}
                        p={0}
                        bg="#3e3d3dba"
                        sx={{ ...itemCommonStyle, overflow: "hidden" }}
                      >
                        <Flex w="100%" justify="space-between" align="center">
                          <Group px={18} py={10} spacing={8}>
                            <Avatar src={item.image_url} alt={item.name} w={40} />
                            <Text color="white" size={16}>
                              {item.name}
                            </Text>
                          </Group>
                          <Box bg="#525151" py={10} px={20} sx={{ borderTopLeftRadius: 50 }}>
                            <Text color="white" size={isOverLg ? 32 : 24}>
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
    </SectionWrapper>
  );
}

function Currency(props: { amount: string; name: string; color: string; icon: string }) {
  const { amount, name, color, icon } = props;
  return (
    <Paper bg={color} radius={8}>
      <Flex align="baseline" justify="start" px={10} py={5} gap={10}>
        <Image src={icon} mt={-100} alt="Icon" width={60} />
        <Text color="white" size={32}>
          {amount.padStart(3, "0")}
        </Text>
        <Text color="white" size={16}>
          {name}
        </Text>
      </Flex>
    </Paper>
  );
}

function MyCurrency() {
  const theme = useMantineTheme();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["get-currencies"],
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
          <Title order={4} size={14} color="white">
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
        <Currency icon={SnagCoins} amount="000" name="Snag Gems" color={theme.colors.pink[0]} />
      </Stack>
    </SectionWrapper>
  );
}
