import { SegmentedControl, Stack, Text, Title } from "@mantine/core";
import React from "react";
import {
  READING_SIZES,
  ReadingSize,
  getReadingSize,
  setReadingSize,
} from "../../../../lib/readingSize";

/**
 * Reading text size (accessibility). Pinch-zoom is disabled sitewide for an
 * app-like feel, so this is how users enlarge reading text. Navigation keeps
 * its compact size regardless. 16px is the minimum.
 */
export default function Accessibility() {
  const [size, setSize] = React.useState<ReadingSize>(getReadingSize());

  const update = (value: string) => {
    const px = Number(value) as ReadingSize;
    setSize(px);
    setReadingSize(px);
  };

  return (
    <Stack maw={520}>
      <Title order={2} size={24} c="white" fw={400}>
        Reading Text Size
      </Title>
      <Text fz={13} c="dimmed">
        Zoom is turned off so the site feels like an app. Use this to size the
        reading text across the site; navigation stays compact. The minimum is 16px.
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
        <Text fz={11} c="dimmed" tt="uppercase" fw={700}>
          Preview ({size}px)
        </Text>
        <Text c="white" style={{ fontSize: size, lineHeight: 1.5 }}>
          The quick brown Zubat flew over the lazy Snorlax. This is how reading
          text will look across the site.
        </Text>
      </Stack>
    </Stack>
  );
}
