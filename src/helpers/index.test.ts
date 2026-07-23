import { describe, expect, it } from "vitest";
import { excludeProperties, getItemImageURL, getPokemonImageURL, getPokemonName } from "./index";

describe("excludeProperties", () => {
  it("removes listed keys and keeps the rest", () => {
    const result = excludeProperties({ a: 1, b: 2, c: 3 }, ["b"]);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("does not mutate the original object", () => {
    const original = { a: 1, b: 2 };
    excludeProperties(original, ["a"]);
    expect(original).toEqual({ a: 1, b: 2 });
  });
});

describe("getPokemonImageURL", () => {
  it("builds a pokesprite regular URL from a slug by default", () => {
    expect(getPokemonImageURL("pikachu")).toBe(
      "https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/regular/pikachu.png"
    );
  });
  it("builds a pokesprite shiny URL when shiny", () => {
    expect(getPokemonImageURL("pikachu", true)).toBe(
      "https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/shiny/pikachu.png"
    );
  });
  it("serves Gen 9 sprites from the local public directory", () => {
    expect(getPokemonImageURL("sprigatito")).toBe(
      "/images/sprites/gen9/sprigatito.png"
    );
  });
  it("serves Gen 9 shiny sprites from the local public directory", () => {
    expect(getPokemonImageURL("sprigatito", true)).toBe(
      "/images/sprites/gen9/shiny/sprigatito.png"
    );
  });
  it("falls back to the CDN for unknown slugs", () => {
    expect(getPokemonImageURL("not-a-pokemon", true)).toBe(
      "https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/shiny/not-a-pokemon.png"
    );
  });
});

describe("getItemImageURL", () => {
  it("builds an item sprite URL from a file path", () => {
    expect(getItemImageURL("ball/poke.png")).toBe(
      "https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/items/ball/poke.png"
    );
  });
});

describe("getPokemonName", () => {
  it("resolves a known slug to its display name", () => {
    expect(getPokemonName("pikachu")).toBe("Pikachu");
  });

  it("throws on an unknown slug", () => {
    expect(() => getPokemonName("not-a-pokemon")).toThrow();
  });
});
