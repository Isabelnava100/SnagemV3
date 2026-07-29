import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink, IconHeart, IconRepeat } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/contact";
import { COST_LINES, COST_TOTAL, getDonationConfig } from "../../queries/donations";

/**
 * Library wing: why the guild costs money, what it costs, and how to chip in.
 *
 * The numbers on the left are real running costs (see COST_LINES); the goal
 * bar on the right is tiered, so a small year still lands somewhere honest.
 * Developer time is listed at zero on purpose: it is donated, and no part of a
 * donation pays for it.
 *
 * PayPal: an embedded Donate button (PayPal's donate-sdk, loaded only when a
 * hosted button id is configured) with a plain link underneath for anyone
 * blocking scripts, plus a separate subscribe link for the monthly pledge. All
 * three come from Site Settings, so nothing here is hardcoded to one account.
 */

const usd = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PAYPAL_SDK = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";

declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: Record<string, unknown>) => { render: (selector: string) => void };
      };
    };
  }
}

/** PayPal's own Donate button, rendered into a div by their SDK. */
function PayPalDonateButton(props: { hostedButtonId: string }) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.PayPal) return;
      const host = document.getElementById("paypal-donate-button");
      if (!host || host.childElementCount > 0) return;
      window.PayPal.Donation.Button({
        env: "production",
        hosted_button_id: props.hostedButtonId,
        image: { src: "https://pics.paypal.com/00/s/N2E5NTE4NTgtOTQ1NC00ZjM3LTk1MzUtN2VhZmMxYTFmZWQ2/file.PNG", alt: "Donate with PayPal button", title: "PayPal - The safer, easier way to pay online!" },
      }).render("#paypal-donate-button");
    };

    if (window.PayPal) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PAYPAL_SDK}"]`);
    const script = existing ?? document.createElement("script");
    script.src = PAYPAL_SDK;
    script.charset = "UTF-8";
    script.addEventListener("load", render);
    script.addEventListener("error", () => !cancelled && setFailed(true));
    if (!existing) document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", render);
    };
  }, [props.hostedButtonId]);

  if (failed) return null;
  return <div id="paypal-donate-button" />;
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Title order={3} c="white" size={22} fw={600}>
        {props.title}
      </Title>
      <Box c="rgba(255,255,255,0.75)" fz={16} style={{ lineHeight: 1.7 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

/** The tiered goal bar: three milestones, filled by the raised total. */
function GoalBar(props: {
  raised: number;
  essentials: number;
  growth: number;
  stretch: number;
  year: string;
  updated: string;
}) {
  const { raised, essentials, growth, stretch } = props;
  const percent = stretch > 0 ? Math.min(100, (raised / stretch) * 100) : 0;
  const tiers = [
    { amount: essentials, label: "Keep the lights on", detail: "Domain, hosting, and the AI subscription." },
    { amount: growth, label: "Fund the art", detail: "Monthly emoji and icon commissions from real artists." },
    { amount: stretch, label: "Events and extras", detail: "Contest prizes, event art, and room to grow." },
  ];

  return (
    <Stack gap={10}>
      <Group justify="space-between" wrap="wrap" gap={8}>
        <Text fz={14} c="dimmed">
          Raised{props.year ? ` in ${props.year}` : ""}
        </Text>
        <Text fz={14} c="dimmed">
          {usd(raised)} of {usd(stretch)}
        </Text>
      </Group>
      <Progress
        value={percent}
        size="xl"
        radius={0}
        color="grape"
        aria-label={`Donation progress: ${usd(raised)} raised of a ${usd(stretch)} goal`}
      />
      <Stack gap={6}>
        {tiers.map((tier) => {
          const met = raised >= tier.amount;
          return (
            <Group key={tier.label} gap={8} wrap="nowrap" align="baseline">
              <Badge size="sm" variant="light" color={met ? "teal" : "gray"} miw={78}>
                {usd(tier.amount)}
              </Badge>
              <Text fz={14} c={met ? "white" : "dimmed"}>
                <b>{tier.label}.</b> {tier.detail}
              </Text>
            </Group>
          );
        })}
      </Stack>
      {props.updated && (
        <Text fz={12} c="dimmed">
          Total updated by hand on {props.updated}.
        </Text>
      )}
    </Stack>
  );
}

export default function SupportWing() {
  const { data } = useQuery({ queryKey: ["donation-config"], queryFn: getDonationConfig });

  const config = data;
  const showDonate = !!config?.enabled;
  const hasAnyPayPal =
    !!config && (!!config.paypalHostedButtonId || !!config.paypalDonateUrl || !!config.paypalSubscribeUrl);

  return (
    <Stack gap={20}>
      <Section title="Why the guild asks for money">
        <Text mb={8}>
          Snagem Guild is free to join and always will be. It is not free to run. A handful of real
          bills keep the site online, and the art that makes it feel like a guild is commissioned
          from real artists who deserve to be paid.
        </Text>
        <Text>
          Nobody has to donate. Posting, hosting roleplays, and helping new members are worth more
          than a few dollars. This page exists so that anyone who <i>can</i> help knows exactly what
          they would be paying for.
        </Text>
      </Section>

      <Section title="What it costs to run">
        <ScrollArea type="auto">
          <Table withTableBorder withColumnBorders fz={14} miw={560}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Cost</Table.Th>
                <Table.Th>What it is</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Per year</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {COST_LINES.map((line) => (
                <Table.Tr key={line.label}>
                  <Table.Td fw={600} c="white">
                    {line.label}
                  </Table.Td>
                  <Table.Td>{line.detail}</Table.Td>
                  <Table.Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {line.donated ? (
                      <Badge size="sm" variant="light" color="grape">
                        Donated
                      </Badge>
                    ) : (
                      usd(line.yearly)
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td fw={700} c="white">
                  Total
                </Table.Td>
                <Table.Td c="dimmed">Everything that is actually billed.</Table.Td>
                <Table.Td fw={700} c="white" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {usd(COST_TOTAL)}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Section>

      <Section title="This year's goal">
        <GoalBar
          raised={config?.raised ?? 0}
          essentials={config?.goalEssentials ?? 400}
          growth={config?.goalGrowth ?? 1000}
          stretch={config?.goalStretch ?? 1500}
          year={config?.year ?? ""}
          updated={config?.raisedUpdated ?? ""}
        />
      </Section>

      {showDonate && hasAnyPayPal && (
        <Section title="Chip in">
          <Stack gap={12}>
            <Text>
              Donations go through PayPal. Give once, or set up a small monthly pledge from{" "}
              {usd(config?.minMonthly ?? 5)} a month.
            </Text>

            {config?.paypalHostedButtonId && (
              <PayPalDonateButton hostedButtonId={config.paypalHostedButtonId} />
            )}

            <Group gap={10} wrap="wrap">
              {config?.paypalDonateUrl && (
                <Button
                  component="a"
                  href={config.paypalDonateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconHeart size={16} />}
                  rightSection={<IconExternalLink size={14} />}
                  variant="light"
                  color="grape"
                >
                  Donate once
                </Button>
              )}
              {config?.paypalSubscribeUrl && (
                <Button
                  component="a"
                  href={config.paypalSubscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconRepeat size={16} />}
                  rightSection={<IconExternalLink size={14} />}
                  variant="light"
                  color="teal"
                >
                  Pledge {usd(config.minMonthly)} a month
                </Button>
              )}
            </Group>

            <Text fz={14} c="dimmed">
              Both links open PayPal in a new tab, so nothing you were reading here is lost. A
              monthly pledge can be cancelled from your own PayPal account at any time, without
              asking us.
            </Text>
          </Stack>
        </Section>
      )}

      {showDonate && !hasAnyPayPal && (
        <Alert color="grape" variant="light" role="status" aria-live="polite">
          Donations are not open yet. The PayPal links are being set up, so check back shortly.
        </Alert>
      )}

      <Section title="The Supporter badge">
        <Text mb={8}>
          Anyone with an active monthly pledge gets the <b>Supporter</b> badge on their profile and
          posts. It is a thank you, nothing more: it grants no items, no currency, no rarer
          encounters, and no advantage in a roleplay. This is a roleplay guild, not a shop.
        </Text>
        <Text>
          Badges are awarded by hand right now, so after your first payment goes through, message an
          admin and it will be added. If a pledge is cancelled, the badge comes off at the next
          check.
        </Text>
      </Section>

      <Section title="Questions or concerns">
        <Text>
          Anything about donations, a pledge you want changed or cancelled, a receipt, or where the
          money went: write to{" "}
          <Anchor href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</Anchor> and a person will answer. If you
          would rather cancel a monthly pledge yourself, you can do that from your own PayPal
          account without asking us.
        </Text>
      </Section>

      <Section title="Where the money does not go">
        <Text>
          Nobody takes a wage from this. Design, code, moderation tools and upkeep are donated time,
          which is why the table above lists developer time at zero. If the guild ever raises more
          than it costs to run, the surplus rolls into the next year and the goal on this page comes
          down to match.
        </Text>
      </Section>
    </Stack>
  );
}
