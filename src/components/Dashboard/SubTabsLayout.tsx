import { Box, Flex, ScrollArea, Stack, Text } from "@mantine/core";
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

  const tabs = links.map((link, index) => {
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
        }}
        h={isOverLg ? 59 : 44}
        className="flex justify-start items-center px-4 duration-100"
        w={isOverLg ? "100%" : undefined}
      >
        <Text
          sx={{
            fontSize: isOverLg ? 24 : 15,
            fontWeight: 700,
            lineHeight: "normal",
            whiteSpace: "nowrap",
            color: isActive ? "#FFFFFF" : "rgba(189, 110, 189, 0.55)",
          }}
        >
          {link.label}
        </Text>
      </Box>
    );
  });

  return (
    <Flex
      direction={isOverLg ? "row" : "column"}
      w="100%"
      className="flex-nowrap"
      gap={isOverLg ? 37 : 14}
      align="start"
    >
      {isOverLg ? (
        <Stack w="100%" maw={320} gap={12} sx={{ flexShrink: 0 }}>
          {tabs}
        </Stack>
      ) : (
        // Mobile: a horizontally scrollable segmented row so 3-5 sub-tabs
        // never overflow the viewport or wrap awkwardly.
        <ScrollArea type="never" scrollbarSize={0} w="100%">
          <Flex gap={8} wrap="nowrap" pb={2}>
            {tabs}
          </Flex>
        </ScrollArea>
      )}
      {children}
    </Flex>
  );
}

export function SimpleSectionWrapper(props: {
  children: React.ReactNode;
  bg?: string;
  borderRadius?: number;
}) {
  const { children, bg = "#403C43", borderRadius = 22 } = props;
  return (
    <Box bg={bg} sx={{ borderRadius }} className="w-full overflow-auto p-4">
      {children}
    </Box>
  );
}
