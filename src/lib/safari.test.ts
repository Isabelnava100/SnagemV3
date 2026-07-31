import { describe, expect, it } from "vitest";
import {
  CATCH_CAP,
  DEFAULT_BALL_RATE,
  MAX_FIGHT_BONUS,
  safariBallBaseRate,
  safariCatchChance,
  safariFightBonus,
} from "./safari";

describe("safariBallBaseRate", () => {
  it("uses the documented base rate per ball", () => {
    expect(safariBallBaseRate("poke")).toBe(50);
    expect(safariBallBaseRate("great")).toBe(60);
    expect(safariBallBaseRate("ultra")).toBe(70);
    expect(safariBallBaseRate("master")).toBe(100);
  });

  it("falls back to the default rate for unknown balls", () => {
    expect(safariBallBaseRate("not-a-ball")).toBe(DEFAULT_BALL_RATE);
  });

  it("applies the conditional ball bonuses", () => {
    expect(safariBallBaseRate("quick", { firstEncounter: true })).toBe(80);
    expect(safariBallBaseRate("heal", { failCount: 2 })).toBe(80);
    expect(safariBallBaseRate("level", { firstStage: true })).toBe(70);
    // Conditions unmet: base rate.
    expect(safariBallBaseRate("quick")).toBe(50);
    expect(safariBallBaseRate("heal", { failCount: 0 })).toBe(50);
  });

  it("applies the type-based ball bonuses (Net/Dive)", () => {
    expect(safariBallBaseRate("net", { types: ["Water"] })).toBe(70);
    expect(safariBallBaseRate("net", { types: ["bug", "flying"] })).toBe(70);
    expect(safariBallBaseRate("dive", { types: ["water"] })).toBe(70);
    // Conditions unmet: base rate.
    expect(safariBallBaseRate("net", { types: ["fire"] })).toBe(50);
    expect(safariBallBaseRate("dive", { types: ["bug"] })).toBe(50);
    expect(safariBallBaseRate("net")).toBe(50);
  });

  it("applies the Repeat Ball bonus when the species is already owned", () => {
    expect(safariBallBaseRate("repeat", { alreadyOwned: true })).toBe(70);
    expect(safariBallBaseRate("repeat")).toBe(50);
  });

  it("applies the Dusk Ball bonus at night", () => {
    expect(safariBallBaseRate("dusk", { night: true })).toBe(70);
    expect(safariBallBaseRate("dusk")).toBe(50);
  });

  it("scales the Nest Ball by wild star tier", () => {
    expect(safariBallBaseRate("nest", { star: 1 })).toBe(80);
    expect(safariBallBaseRate("nest", { star: 2 })).toBe(70);
    expect(safariBallBaseRate("nest", { star: 3 })).toBe(60);
    // 4/5-star wilds: base rate.
    expect(safariBallBaseRate("nest", { star: 4 })).toBe(50);
    expect(safariBallBaseRate("nest")).toBe(50);
  });

  it("grows the Timer Ball with fight posts, capped at 80", () => {
    expect(safariBallBaseRate("timer")).toBe(50);
    expect(safariBallBaseRate("timer", { fightPosts: 1 })).toBe(60);
    expect(safariBallBaseRate("timer", { fightPosts: 3 })).toBe(80);
    expect(safariBallBaseRate("timer", { fightPosts: 10 })).toBe(80);
  });
});

describe("safariFightBonus", () => {
  it("is 0 at full health and MAX_FIGHT_BONUS one post before a knockout", () => {
    expect(safariFightBonus(0, 7)).toBe(0);
    expect(safariFightBonus(6, 7)).toBe(MAX_FIGHT_BONUS);
  });

  it("scales linearly with the fight span", () => {
    // span 6, half of it: 20
    expect(safariFightBonus(3, 7)).toBe(20);
  });

  it("never exceeds MAX_FIGHT_BONUS even past the knockout point", () => {
    expect(safariFightBonus(10, 7)).toBe(MAX_FIGHT_BONUS);
  });
});

describe("safariCatchChance", () => {
  it("adds base + fight bonus + berry bonus", () => {
    // great (60) + half fight bonus (20) + one berry (5)
    expect(
      safariCatchChance({ ballKey: "great", fightPosts: 3, postsToDefeat: 7, berryBonus: 5 })
    ).toBe(85);
  });

  it("caps at 95 for anything short of a Master Ball", () => {
    // ultra (70) + full fight bonus (40) + berries (25) = 135, capped.
    expect(
      safariCatchChance({ ballKey: "ultra", fightPosts: 6, postsToDefeat: 7, berryBonus: 25 })
    ).toBe(CATCH_CAP);
  });

  it("keeps the Master Ball a sure thing", () => {
    expect(
      safariCatchChance({ ballKey: "master", fightPosts: 0, postsToDefeat: 7, berryBonus: 0 })
    ).toBe(100);
  });
});
