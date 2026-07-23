import { describe, expect, it } from "vitest";
import { typeEffectiveness } from "./typeChart";

describe("typeEffectiveness", () => {
  it("returns 2 for a super effective single-type matchup", () => {
    expect(typeEffectiveness(["Water"], ["Fire"])).toBe(2);
  });

  it("returns 0.5 for a resisted single-type matchup", () => {
    expect(typeEffectiveness(["Fire"], ["Water"])).toBe(0.5);
  });

  it("returns 1 for a neutral matchup", () => {
    expect(typeEffectiveness(["Normal"], ["Normal"])).toBe(1);
  });

  it("multiplies across a dual-type defender and clamps at 2", () => {
    // Electric vs Water/Flying is 2 * 2 = 4 on the raw chart, clamped to 2.
    expect(typeEffectiveness(["Electric"], ["Water", "Flying"])).toBe(2);
  });

  it("flattens an immunity on a dual-type defender to the 0.5 floor", () => {
    // Normal vs Rock/Ghost is 0.5 * 0 = 0 on the raw chart, clamped to 0.5.
    expect(typeEffectiveness(["Normal"], ["Rock", "Ghost"])).toBe(0.5);
  });

  it("flattens a single-type immunity to the 0.5 floor", () => {
    expect(typeEffectiveness(["Normal"], ["Ghost"])).toBe(0.5);
  });

  it("uses the attacker's best type when it has two", () => {
    // Fire vs Water is 0.5, Grass vs Water is 2: the attacker leads with Grass.
    expect(typeEffectiveness(["Fire", "Grass"], ["Water"])).toBe(2);
  });

  it("treats an unknown type as neutral", () => {
    expect(typeEffectiveness(["Faketype"], ["Fire"])).toBe(1);
    expect(typeEffectiveness(["Fire"], ["Faketype"])).toBe(1);
  });

  it("falls back to Normal for empty type lists", () => {
    expect(typeEffectiveness([], [])).toBe(1);
    expect(typeEffectiveness([], ["Ghost"])).toBe(0.5);
  });
});
