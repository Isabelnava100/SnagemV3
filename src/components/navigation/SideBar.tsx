import { Box, Image, Paper, Popover, SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import { useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";
import { Link, NavLink } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery";
import { Activities, Forum, Marketplace, Menu, Quests, TeamSangem, Users } from "../../icons";
import "/src/assets/styles/navigation.css";

function SingleLink(props: { label?: string; link?: string; icon: string }) {
  const { label, link, icon } = props;
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const { isOverSm, isOverMd } = useMediaQuery();
  return (
    <div>
      {label?.length === 0 ? (
        ""
      ) : (
        <NavLink
          to={link || "#"}
          style={({ isActive }) => {
            return {
              display: "flex",
              height: "100%",
              flexDirection: "column",
              paddingTop: 15,
              paddingBottom: 15,
              paddingLeft: isOverSm ? 30 : 20,
              paddingRight: isOverSm ? 30 : 20,
              gap: "8px",
              justifyContent: "center",
              alignItems: "center",
              textDecoration: "none",
              background: isActive
                ? "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)"
                : undefined,
              borderTopRightRadius: isOverMd ? 30 : 15,
              borderTopLeftRadius: isOverMd ? 0 : 15,
              borderBottomRightRadius: isOverMd ? 30 : 0,
            };
          }}
        >
          <Box>
            <Image src={icon} width={isUnder900 ? 40 : undefined} alt={label} />
          </Box>
          {!isUnder900 && (
            <Text color="white" transform="uppercase" size={16}>
              {label}
            </Text>
          )}
        </NavLink>
      )}
    </div>
  );
}

export const SideBar = () => {
  const isUnder900 = useCoreMediaQuery("(max-width: 900px)");
  const { isOverSm } = useMediaQuery();

  const headerLinks = {
    links: [
      { link: "/", label: "Activities", icon: Activities },
      { link: "/", label: "Quests", icon: Quests },
      { link: "/", label: "Shop", icon: Marketplace, mustShow: true },
      { link: "/", label: "Users", icon: Users },
      { link: "/Forum/Main-Forum", label: "Forum", icon: Forum, mustShow: true },
      { link: "/Dashboard", label: "Snag", icon: TeamSangem, mustShow: true },
      // { link: "/" + loginName, label: loginName }
    ],
  };

  const visibleLinks = isOverSm
    ? headerLinks.links
    : headerLinks.links.filter((link) => link.mustShow);
  const menuLinks = headerLinks.links.filter((link) => !link.mustShow);

  const items = visibleLinks.map((link) => <SingleLink {...link} key={link.label} />);

  return (
    <Paper
      sx={{
        display: isUnder900 ? "flex" : "block",
        width: "100%",
        height: "100%",
        borderTopRightRadius: isUnder900 ? 30 : 60,
        borderTopLeftRadius: isUnder900 ? 30 : 0,
        borderBottomRightRadius: isUnder900 ? 0 : 60,
        overflow: "auto",
        flexShrink: 0,
        justifyContent: "center",
      }}
    >
      {!isOverSm && <MobileMenu links={menuLinks} />}
      {items}
    </Paper>
  );
};

function MobileMenu(props: { links: { link: string; label: string; icon: string }[] }) {
  const { links } = props;
  return (
    <Popover
      styles={{
        dropdown: {
          background: "linear-gradient(180deg, #912691 41.15%, #4D14C4 90.1%)",
          border: "none",
          borderRadius: 15,
        },
      }}
      width={200}
      position="top"
    >
      <Popover.Target>
        <UnstyledButton
          sx={{
            paddingTop: 15,
            paddingBottom: 15,
            paddingLeft: 15,
            paddingRight: 15,
          }}
        >
          <Image src={Menu} width={40} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <SimpleGrid cols={2} w="100%">
          {links.map((link) => (
            <Link key={link.label} style={{ padding: 15 }} to={link.link}>
              <Image src={link.icon} width={45} />
            </Link>
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
