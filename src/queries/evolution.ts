/**
 * Evolution + character assignment, both server-authoritative. The client asks
 * to evolve a Pokemon into a target dex number and the Cloud Function looks up
 * the real evolution, checks the level/friendship/item requirement, spends any
 * item, and applies the change. owned_pokemons and items are function-only
 * (Firestore rules), so these no longer write the bag directly.
 */

import { call } from "./_callable";

/** Evolve an owned Pokemon into the chosen target form (server validates all). */
export const evolvePokemon = (pokemonId: string, toIdx: number) =>
  call<{ ok: boolean; toName: string; toIdx: number }>("evolvePokemon", { pokemonId, toIdx });

/** Assign an owned Pokemon to one of the trainer's characters ("" = unassigned). */
export const assignPokemonCharacter = (pokemonId: string, characterId: string) =>
  call<{ ok: boolean }>("assignPokemonCharacter", { pokemonId, characterId });

/** Cure a shadowed Pokemon with a Shadow Vaccine from the bag (server validates). */
export const purifyShadowPokemon = (pokemonId: string) =>
  call<{ ok: boolean; cleared: number }>("useShadowVaccine", { pokemonId });
