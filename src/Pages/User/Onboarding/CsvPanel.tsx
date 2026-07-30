import { Box, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import React from "react";
import { itemData } from "../../../data/item";
import { pokemonData } from "../../../data/pokemon";
import { ImportEntries } from "../../../queries/imports";
import { UploadResult, buildImportCsv, downloadCsv, parseUploadCsv } from "./csv";

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const CLIP_CTA = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";

const pokemonByName = new Map(pokemonData.map((p) => [p.name.toLowerCase(), p]));
const itemByName = new Map(itemData.map((i) => [i.name.toLowerCase(), i]));

/** Angular CTA local to the CSV tools (mirrors the page's button language). */
function CsvButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  kind: "red" | "cyan";
}) {
  const palettes = {
    red: {
      background: "#E54156",
      color: "#fff",
      border: "none",
      "&:hover": { background: "#fff", color: "#1A1B1E" },
    },
    cyan: {
      background: "transparent",
      color: "#12B7B6",
      border: "1px solid #12B7B6",
      "&:hover": { background: "#12B7B6", color: "#fff" },
    },
  } as const;
  return (
    <UnstyledButton
      onClick={props.onClick}
      disabled={props.loading}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: props.kind === "red" ? "13px 22px" : "11px 16px",
        clipPath: CLIP_CTA,
        transition: "background .2s ease, color .2s ease, border-color .2s ease",
        opacity: props.loading ? 0.6 : 1,
        pointerEvents: props.loading ? "none" : "auto",
        ...palettes[props.kind],
      }}
    >
      {props.loading ? <Loader size={15} color="#fff" /> : props.children}
    </UnstyledButton>
  );
}

/** Small uppercase step label inside the CSV tools. */
function StepLabel(props: { children: React.ReactNode }) {
  return (
    <Text
      component="span"
      fz={13}
      fw={700}
      c="#c79bd6"
      tt="uppercase"
      style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em" }}
    >
      {props.children}
    </Text>
  );
}

/**
 * The spreadsheet import tools: one combined template (items and pokemon in
 * one file), downloadable empty or prefilled with the member's current draft,
 * and the upload control right next to it. Used by the Gaia panel's CSV tab
 * and by the plain spreadsheet import path.
 */
export default function CsvPanel(props: {
  entries: ImportEntries;
  onImported: (result: UploadResult, info: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const hasDraft = props.entries.items.length > 0 || props.entries.pokemon.length > 0;

  const handleFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      props.onImported(
        { items: [], pokemon: [], matched: 0, skipped: [], format: "unknown" },
        `${file.name} is not a CSV file. We can only accept .csv files: in Google Sheets or Excel use "Download as CSV" and upload that file instead.`
      );
      return;
    }
    const text = await file.text();
    const result = parseUploadCsv(text, { pokemonByName, itemByName });
    let info: string;
    if (result.format === "unknown") {
      info = `${file.name} does not match the template. Download the template below, keep the header row, and fill your rows under it.`;
    } else {
      info =
        `Imported ${result.matched} row${result.matched === 1 ? "" : "s"} from ${file.name}; ` +
        "your draft below now matches the file." +
        (result.skipped.length
          ? ` Skipped ${result.skipped.length} unrecognized: ${result.skipped.slice(0, 8).join(", ")}`
          : "");
    }
    props.onImported(result, info);
  };

  return (
    <Stack gap={16}>
      <Text fz={14.5} c="#b6b1bc" lh={1.6}>
        One template covers everything: items and Pokemon live in the same file. Fill it in with
        Google Sheets or Excel, save it as CSV, and upload it back here. We can only accept .csv
        files.
      </Text>

      <Stack gap={8}>
        <StepLabel>Step A · Download the template</StepLabel>
        <Group gap={10} wrap="wrap">
          <CsvButton
            kind="cyan"
            onClick={() => downloadCsv("snagem-import-template.csv", buildImportCsv())}
          >
            <IconDownload size={14} /> Empty template
          </CsvButton>
          <CsvButton
            kind="cyan"
            onClick={() => downloadCsv("snagem-import.csv", buildImportCsv(props.entries))}
          >
            <IconDownload size={14} /> My current import
          </CsvButton>
        </Group>
        <Text fz={13} c="#8f8a99" lh={1.55}>
          {hasDraft
            ? "“My current import” downloads the items and Pokemon already in your draft so you can edit them in a spreadsheet."
            : "Your draft is empty right now, so both downloads start you from the template."}
        </Text>
      </Stack>

      <Stack
        gap={8}
        p={14}
        style={{ background: "#0e0d11", border: "1px dashed #12B7B6" }}
      >
        <StepLabel>Step B · Upload your CSV here</StepLabel>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          hidden
          aria-label="Import CSV file"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />
        <Box>
          <CsvButton kind="red" onClick={() => input.current?.click()}>
            <IconUpload size={15} /> Upload CSV file
          </CsvButton>
        </Box>
        <Text fz={13} c="#8f8a99" lh={1.55}>
          Uploading replaces the matching part of your draft with the file&apos;s rows (currency is
          untouched), and you can still edit everything on this page before submitting.
        </Text>
      </Stack>
    </Stack>
  );
}
