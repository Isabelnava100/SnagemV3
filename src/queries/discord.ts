import { getDb } from "../context/firebase";
import { call } from "./_callable";

/** Public Discord OAuth client id (safe to expose; the secret is server-side). */
export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

/** Where Discord returns the user after authorizing (must match the app config). */
export const discordRedirectUri = () =>
  `${window.location.origin}/Dashboard/Settings/Notifications`;

/** Build the Discord authorize URL for the "Connect Discord" button. */
export const discordAuthorizeUrl = (clientId?: string) => {
  const params = new URLSearchParams({
    client_id: clientId || DISCORD_CLIENT_ID || "",
    redirect_uri: discordRedirectUri(),
    response_type: "code",
    scope: "identify",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
};

async function callFn<T>(name: string, data: unknown): Promise<T> {
  return call<T>(name, data);
}

export const linkDiscord = (code: string) =>
  callFn<{ discordUID: string; discordUsername: string }>("linkDiscord", {
    code,
    redirectUri: discordRedirectUri(),
  });

export const unlinkDiscord = () => callFn<{ ok: boolean }>("unlinkDiscord", {});

/** The signed-in user's current Discord link, read from their user doc. */
export const getMyDiscord = async (
  uid: string
): Promise<{ discordUID?: string; discordUsername?: string }> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid))).data() ?? {};
  return { discordUID: data.discordUID, discordUsername: data.discordUsername };
};

// -- Admin Discord config (adminSecrets/discord) -----------------------------

export interface DiscordConfig {
  /** OAuth client id, stored here so linkDiscord never trusts the client. */
  clientId: string;
  clientSecret: string;
  webhookUrl: string;
}

export const getDiscordConfig = async (): Promise<DiscordConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "adminSecrets", "discord"))).data() ?? {};
  return {
    // Older configs predate the stored client id; prefill from the build env
    // so saving the form once migrates it.
    clientId: String(data.clientId ?? DISCORD_CLIENT_ID ?? ""),
    clientSecret: String(data.clientSecret ?? ""),
    webhookUrl: String(data.webhookUrl ?? ""),
  };
};

export const saveDiscordConfig = async (config: DiscordConfig): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  await setDoc(doc(db, "adminSecrets", "discord"), config, { merge: true });
  // Mirror the client id somewhere members can actually read. adminSecrets is
  // admin-only, so without this the Connect Discord button would depend on a
  // build-time env var and every id change would need a redeploy. An OAuth
  // client id is public by design (it travels in the authorize URL).
  await setDoc(doc(db, "admin", "discord_public"), { clientId: config.clientId }, { merge: true });
};

/**
 * The public OAuth client id, world-readable so any signed-in member's browser
 * can build the authorize URL. Falls back to the build-time env var for
 * installs configured before the mirror existed.
 */
export const getDiscordPublicClientId = async (): Promise<string> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "admin", "discord_public")).catch(() => null))?.data() ?? {};
  return String(data.clientId ?? DISCORD_CLIENT_ID ?? "");
};
