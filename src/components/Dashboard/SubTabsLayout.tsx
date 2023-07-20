import { Box, Flex, Stack, Text } from "@mantine/core";
import React from "react";
import { useLocation } from "react-router";
import { Link } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery";

interface Link {
  path: string;
  label: string;
}

export default function SubTabsLayout(props: {
  children: React.ReactNode;
  links: Link[];
  parentRoutePath: string;
}) {
  const { links, children, parentRoutePath } = props;
  const { isOverLg } = useMediaQuery();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Flex
      direction={isOverLg ? "row" : "column"}
      w="100%"
      className="flex-nowrap"
      gap={37}
      align="start"
    >
      <Stack
        w="100%"
        maw={isOverLg ? 320 : undefined}
        sx={{ flexShrink: 0, flexDirection: isOverLg ? "column" : "row" }}
      >
        {links.map((link, index) => {
          const linkPath = `${parentRoutePath}/${link.path}`;
          const isActive = currentPath.includes(linkPath);
          return (
            <Box
              key={index}
              component={Link}
              to={linkPath}
              sx={{
                borderRadius: isOverLg ? 22 : 16,
                flexShrink: 0,
                background: isActive
                  ? "linear-gradient(90deg, #762B77 13.54%, #14B1B6 70.83%)"
                  : "rgba(119, 41, 118, 0.25)",
                textDecoration: "none",
                marginLeft: isOverLg ? (isActive ? 20 : 0) : undefined,
              }}
              h={59}
              className="flex justify-start items-center px-6 duration-100"
              w={isOverLg ? "100%" : undefined}
            >
              <Text
                sx={{
                  fontSize: isOverLg ? 24 : 20,
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
      {children}
    </Flex>
  );
}

export function SimpleSectionWrapper(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Box className="bg-[#403C43] w-full flex-1 overflow-auto p-4 rounded-[22px]">{children}</Box>
  );
}
