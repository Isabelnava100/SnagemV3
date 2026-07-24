import { Box, Flex, ScrollArea, Stack, Text } from "@mantine/core";
import React from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery";
import { RESET_READING_SCALE } from "../../lib/readingSize";

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
          flexShrink: 0,
          border: "1px solid #2a2637",
          clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
          background: isActive
            ? "linear-gradient(90deg, #762B77 13.54%, #14B1B6 70.83%)"
            : "#17151c",
          textDecoration: "none",
          "&:hover": isActive ? undefined : { borderColor: "#E54156" },
        }}
        h={isOverLg ? 52 : 44}
        className="flex justify-start items-center px-4 duration-100"
        w={isOverLg ? "100%" : undefined}
      >
        <Text
          sx={{
            fontFamily: "var(--font-display, 'Quantico', sans-serif)",
            fontSize: isOverLg ? 16 : 14,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            lineHeight: "normal",
            whiteSpace: "nowrap",
            color: isActive ? "#FFFFFF" : "#8f8a99",
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
        <Stack w="100%" maw={260} gap={10} style={RESET_READING_SCALE} sx={{ flexShrink: 0 }}>
          {tabs}
        </Stack>
      ) : (
        // Mobile: a horizontally scrollable segmented row so 3-5 sub-tabs
        // never overflow the viewport or wrap awkwardly.
        <ScrollArea type="never" scrollbarSize={0} w="100%" style={RESET_READING_SCALE}>
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
  const { children, bg = "#17151c", borderRadius = 0 } = props;
  return (
    <Box bg={bg} sx={{ borderRadius, border: "1px solid #2a2637" }} className="w-full overflow-auto p-4">
      {children}
    </Box>
  );
}
