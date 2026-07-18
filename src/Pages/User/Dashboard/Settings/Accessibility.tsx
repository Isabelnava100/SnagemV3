import { Divider, SegmentedControl, Stack, Switch, Text, Title } from "@mantine/core";
import React from "react";
import {
  READING_SIZES,
  ReadingSize,
  getReadingSize,
  setReadingSize,
} from "../../../../lib/readingSize";
import { getZoomAllowed, setZoomAllowed } from "../../../../lib/viewportZoom";

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
    <Stack maw={520}>
      <Title order={2} size={28} c="white" fw={400}>
        Reading Text Size
      </Title>
      <Text fz={14} c="dimmed">
        Use this to size the reading text across the site; navigation stays compact.
        The minimum is 16px.
      </Text>

      <SegmentedControl
        value={String(size)}
        onChange={update}
        data={READING_SIZES.map((s) => ({
          value: String(s),
          label: s === 16 ? "Default" : `${s}px`,
        }))}
      />

      {/* Preview is fixed-px so it always shows the chosen size directly. */}
      <Stack gap={6} p="md" bg="#1E1D20" style={{ borderRadius: 12 }}>
        <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
          Preview ({size}px)
        </Text>
        <Text c="white" style={{ fontSize: size, lineHeight: 1.5 }}>
          The quick brown Zubat flew over the lazy Snorlax. This is how reading
          text will look across the site.
        </Text>
      </Stack>

      <Divider color="#4a464a" my={6} />

      <Title order={2} size={28} c="white" fw={400}>
        Pinch to Zoom
      </Title>
      <Text fz={14} c="dimmed">
        Zoom is turned off by default so the site feels like an app. Turn it on if
        you would like to pinch-zoom pages on your device. This takes effect right
        away.
      </Text>
      <Switch
        checked={zoom}
        onChange={(e) => updateZoom(e.currentTarget.checked)}
        label="Allow pinch to zoom"
        styles={{ label: { color: "white" } }}
      />
    </Stack>
  );
}
