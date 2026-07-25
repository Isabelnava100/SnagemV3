import { Box, Stack, Text, UnstyledButton } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { Conduct, Cookies, Credits, Privacy, Terms } from "../Policies";

const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";

/**
 * The House Rules wing: the five policy documents that used to live at
 * /Policies, embedded in the Library. Sub-document deep links survive the
 * move as /Library?tab=policies&doc=<key> (the /Policies redirect forwards
 * its old ?tab= as ?doc=).
 */
const DOCS = [
  { value: "conduct", label: "Community Rules", content: <Conduct /> },
  { value: "privacy", label: "Privacy Policy", content: <Privacy /> },
  { value: "cookies", label: "Cookies & Cache", content: <Cookies /> },
  { value: "terms", label: "Terms of Use", content: <Terms /> },
  { value: "credits", label: "Credits", content: <Credits /> },
];

export default function PoliciesWing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("doc");
  // DOCS is a non-empty constant, so the first entry always exists.
  const fallback = DOCS[0]!;
  const active = DOCS.some((d) => d.value === requested) ? (requested as string) : fallback.value;
  const activeDoc = DOCS.find((d) => d.value === active) ?? fallback;

  const open = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "policies");
    if (value === fallback.value) next.delete("doc");
    else next.set("doc", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Stack gap={18}>
      <Box
        component="nav"
        aria-label="Policy documents"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          width: "100%",
          scrollbarWidth: "none",
        }}
      >
        {DOCS.map((d) => {
          const isActive = d.value === active;
          return (
            <UnstyledButton
              key={d.value}
              onClick={() => open(d.value)}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: "none",
                whiteSpace: "nowrap",
                border: `1px solid ${isActive ? "#E54156" : "#2a2637"}`,
                background: isActive
                  ? "linear-gradient(90deg, rgba(229,65,86,.25), #17151c)"
                  : "#17151c",
                color: "#fff",
                fontFamily: DISPLAY,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "11px 16px",
                cursor: "pointer",
              }}
            >
              {d.label}
            </UnstyledButton>
          );
        })}
      </Box>
      <Text fz={13} c="dimmed">
        Snagem Guild is a non-commercial Pokemon fan community. Last updated July 2026.
      </Text>
      {activeDoc.content}
    </Stack>
  );
}
