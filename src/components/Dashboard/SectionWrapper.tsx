import { Box, DefaultProps, Flex, Paper, Title } from "@mantine/core";
import React from "react";
import useMediaQuery from "../../hooks/useMediaQuery";
import { SectionLoader } from "../navigation/loading";

export default function SectionWrapper(props: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  style?: DefaultProps["style"];
  customHeader?: React.ReactNode;
  willFetchData?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: string;
}) {
  const {
    title,
    icon,
    children,
    action,
    style,
    customHeader,
    willFetchData = false,
    isLoading,
    isError,
    error,
  } = props;
  const { isOverSm, isOverMd } = useMediaQuery();
  return (
    <Paper style={style} bg="#282727" radius={16} sx={{ overflow: "hidden" }}>
      {customHeader || (
        <Flex
          py={10}
          px={25}
          w="100%"
          justify="space-between"
          align="center"
          style={{
            background: "linear-gradient(90.37deg, #762B77 6.76%, #17F1F0 65.52%)",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Title order={3} size={isOverSm ? 20 : 16} color="white">
            {title}
          </Title>
          {action && action}
        </Flex>
      )}
      <Box p={isOverMd ? 25 : 10}>{willFetchData && isLoading ? <SectionLoader /> : children}</Box>
    </Paper>
  );
}

export function ActionButton(props: { children: React.ReactNode; action: () => void }) {
  const { isOverSm } = useMediaQuery();
  return (
    <button
      className="bg-transparent outline-none text-[#3283DA] border-none cursor-pointer font-medium"
      style={{ fontSize: isOverSm ? 14 : 12 }}
      onClick={props.action}
    >
      {props.children}
    </button>
  );
}
