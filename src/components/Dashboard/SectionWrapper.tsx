import { Box, BoxProps, Flex, Paper, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import React from "react";
import useMediaQuery from "../../hooks/useMediaQuery";
import { SectionLoader } from "../navigation/loading";

export default function SectionWrapper(props: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  style?: BoxProps["style"];
  customHeader?: React.ReactNode;
  willFetchData?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: string;
  bg?: string;
}) {
  const {
    title,
    children,
    action,
    style,
    customHeader,
    willFetchData = false,
    isLoading,
    isError,
    error,
    bg = "#282727",
  } = props;
  const { isOverSm, isOverMd } = useMediaQuery();
  return (
    <Paper style={style} bg={bg} radius={16} sx={{ overflow: "hidden" }}>
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
          <Title order={3} fz={isOverSm ? 20 : 16} c="white">
            {title}
          </Title>
          {action && action}
        </Flex>
      )}
      <Box p={isOverMd ? 25 : 10}>
        {willFetchData && isLoading ? (
          <SectionLoader />
        ) : willFetchData && isError ? (
          <Flex
            role="alert"
            align="center"
            gap={10}
            p={14}
            style={{ background: "#141318", border: "1px solid #232028", borderRadius: 10 }}
          >
            <IconAlertCircle size={18} color="#E54156" style={{ flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
              <Text fz={14} c="white">
                This section could not load
              </Text>
              {error && (
                <Text fz={14} c="dimmed" mt={2} style={{ overflowWrap: "anywhere" }}>
                  {error}
                </Text>
              )}
            </Box>
          </Flex>
        ) : (
          children
        )}
      </Box>
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
