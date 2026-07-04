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
  it("builds a pokesprite shiny URL from a slug", () => {
    expect(getPokemonImageURL("pikachu")).toBe(
      "http://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/shiny/pikachu.png"
    );
  });
});

describe("getItemImageURL", () => {
  it("builds an item sprite URL from a file path", () => {
    expect(getItemImageURL("ball/poke.png")).toBe(
      "http://raw.githubusercontent.com/msikma/pokesprite/master/items/ball/poke.png"
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
