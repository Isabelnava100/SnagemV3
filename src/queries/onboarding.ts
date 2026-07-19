import { call } from "./_callable";

/**
 * One-time starter claim for members who own zero pokemon (any 1-star species
 * or a classic starter; validated server-side by chooseStarter).
 */
export const chooseStarter = (slug: string) =>
  call<{ ok: boolean; name: string }>("chooseStarter", { slug });
