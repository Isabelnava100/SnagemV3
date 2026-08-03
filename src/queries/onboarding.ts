import { call } from "./_callable";

/**
 * One-time starter claim for members who own zero pokemon (any 1-star species
 * or a classic starter; validated server-side by chooseStarter). An optional
 * nickname overrides the default species name.
 */
export const chooseStarter = (slug: string, name?: string) =>
  call<{ ok: boolean; name: string }>("chooseStarter", { slug, name });
