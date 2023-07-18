import { Box, Flex, Stack, Text } from "@mantine/core";
import { Outlet, useLocation } from "react-router";
import { Link } from "react-router-dom";

export default function SettingsLayout() {
  const settingsTabLinks = [
    { path: "Notifications", label: "Notifications" },
    { path: "Collections", label: "Collections" },
  ];
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Flex justify="space-between" gap={37} align="start">
      <Stack w="100%" maw={320} sx={{ flexShrink: 0 }}>
        {settingsTabLinks.map((link, index) => {
          const linkPath = `/Dashboard/Settings/${link.path}`;
          const isActive = currentPath.includes(linkPath);
          return (
            <Box
              key={index}
              component={Link}
              to={linkPath}
              sx={{
                borderRadius: 22,
                flexShrink: 0,
                background: isActive
                  ? "linear-gradient(90deg, #762B77 13.54%, #14B1B6 70.83%)"
                  : "rgba(119, 41, 118, 0.25)",
                textDecoration: "none",
                marginLeft: isActive ? 20 : 0,
              }}
              h={59}
              className="flex justify-start items-center px-6 duration-100"
              w="100%"
            >
              <Text
                sx={{
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: "normal",
                  color: isActive ? "#FFFFFF" : "rgba(189, 110, 189, 0.25)",
                }}
              >
                {link.label}
              </Text>
            </Box>
          );
        })}
      </Stack>
      <Box className="bg-[#403C43] w-full flex-1 p-4 rounded-[22px]">
        <Outlet />
      </Box>
    </Flex>
  );
}
