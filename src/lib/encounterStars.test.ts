import { describe, expect, it } from "vitest";
import { DEFAULT_HP_SCALING, maxHpForLevel } from "./encounterStars";

describe("maxHpForLevel", () => {
  // Default scaling: base 100, +2/level up to 50, +4/level after 50.

  it("returns the base HP at level 1", () => {
    expect(maxHpForLevel(1)).toBe(DEFAULT_HP_SCALING.base);
  });

  it("grows by the low rate up to the split level", () => {
    // 100 + 2 * 49
    expect(maxHpForLevel(50)).toBe(198);
  });

  it("switches to the high rate right after the split", () => {
    // 100 + 2 * 49 + 4 * 1
    expect(maxHpForLevel(51)).toBe(202);
  });

  it("reaches the top of the curve at level 100", () => {
    // 100 + 2 * 49 + 4 * 50
    expect(maxHpForLevel(100)).toBe(398);
  });

  it("clamps out-of-range levels into 1..100", () => {
    expect(maxHpForLevel(0)).toBe(maxHpForLevel(1));
    expect(maxHpForLevel(-5)).toBe(maxHpForLevel(1));
    expect(maxHpForLevel(150)).toBe(maxHpForLevel(100));
  });

  it("truncates fractional levels", () => {
    expect(maxHpForLevel(50.9)).toBe(maxHpForLevel(50));
  });

  it("honors a custom scaling", () => {
    const hp = { base: 10, low: 1, high: 3, split: 10 };
    expect(maxHpForLevel(1, hp)).toBe(10);
    expect(maxHpForLevel(10, hp)).toBe(19); // 10 + 1 * 9
    expect(maxHpForLevel(12, hp)).toBe(25); // 10 + 1 * 9 + 3 * 2
  });
});
