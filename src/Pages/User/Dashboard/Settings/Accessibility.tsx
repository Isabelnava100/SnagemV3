import { Box, SegmentedControl, Stack, Switch, Text, Title } from "@mantine/core";
import React from "react";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import {
  READING_SIZES,
  ReadingSize,
  getReadingSize,
  setReadingSize,
} from "../../../../lib/readingSize";
import { getZoomAllowed, setZoomAllowed } from "../../../../lib/viewportZoom";

/** Quantico section heading used by the accessibility panel (mockup). */
function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <Title
      order={2}
      c="white"
      fz={17}
      fw={700}
      tt="uppercase"
      style={{ fontFamily: "var(--font-display, 'Quantico', sans-serif)", letterSpacing: "0.08em" }}
    >
      {props.children}
    </Title>
  );
}

/**
 * Accessibility settings: reading text size and a pinch-to-zoom toggle. Zoom is
 * off by default for an app-like feel, but members who need it can turn it on.
 */
export default function Accessibility() {
  const [size, setSize] = React.useState<ReadingSize>(getReadingSize());
  const [zoom, setZoom] = React.useState<boolean>(getZoomAllowed());

  const update = (value: string) => {
    const px = Number(value) as ReadingSize;
    setSize(px);
    setReadingSize(px);
  };

  const updateZoom = (allowed: boolean) => {
    setZoom(allowed);
    setZoomAllowed(allowed);
  };

  return (
    <SimpleSectionWrapper>
      <Stack maw={520}>
        <SectionTitle>Reading Text Size</SectionTitle>
        <Text fz={14} c="#b6b1bc">
          Use this to size the reading text across the site; navigation stays compact.
          The minimum is 16px.
        </Text>

        {/* Mockup segmented control: bordered strip, active cell on #3C3A3C. */}
        <Box w="fit-content">
          <SegmentedControl
            value={String(size)}
            onChange={update}
            data={READING_SIZES.map((s) => ({
              value: String(s),
              label: s === 16 ? "Default" : `${s}px`,
            }))}
            styles={{
              root: {
                background: "transparent",
                border: "1px solid #2a2637",
                borderRadius: 0,
              },
              indicator: { background: "#3C3A3C", borderRadius: 0 },
              control: { borderRadius: 0 },
              label: { color: "#b6b1bc", fontWeight: 700, "&[data-active]": { color: "#fff" } },
            }}
          />
        </Box>

        {/* Preview is fixed-px so it always shows the chosen size directly. */}
        <Stack gap={6} p="18px 22px" bg="#0e0d11" style={{ border: "1px solid #2a2637" }}>
          <Text
            fz={14}
            c="#b6b1bc"
            tt="uppercase"
            fw={700}
            style={{
              fontFamily: "var(--font-display, 'Quantico', sans-serif)",
              letterSpacing: "0.16em",
            }}
          >
            Preview ({size}px)
          </Text>
          <Text c="white" style={{ fontSize: size, lineHeight: 1.6 }}>
            The quick brown Zubat flew over the lazy Snorlax. This is how reading
            text will look across the site.
          </Text>
        </Stack>

        <Box mt={24} pt={22} sx={{ borderTop: "1px solid #2a2637" }}>
          <Stack>
            <SectionTitle>Pinch to Zoom</SectionTitle>
            <Text fz={14} c="#b6b1bc">
              Zoom is turned off by default so the site feels like an app. Turn it on if
              you would like to pinch-zoom pages on your device. This takes effect right
              away.
            </Text>
            {/* Mockup toggle: cyan track on, dark grey off (Switch CSS vars). */}
            <Switch
              checked={zoom}
              onChange={(e) => updateZoom(e.currentTarget.checked)}
              label="Allow pinch to zoom"
              size="md"
              style={
                { "--switch-bg": "#3C3A3C", "--switch-color": "#12B7B6" } as React.CSSProperties
              }
              styles={{ label: { color: "white", fontWeight: 700, fontSize: 15 } }}
            />
          </Stack>
        </Box>
      </Stack>
    </SimpleSectionWrapper>
  );
}
