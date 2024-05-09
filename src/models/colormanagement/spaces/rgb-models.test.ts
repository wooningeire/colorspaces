import { describe, expect, test } from "vitest";
import { hslToRgb, hsvToRgb, rgbToHsl, rgbToHsv } from "../rgb-models";
import { Vec3 } from "@/util";

const rgbs: Vec3[] = [
  [0, 0, 0],
  [0.232, 0.123, 0.991],
  [0.288, 0.541, 0.745],
  [0.410, 1, 0.933],
  [0.5, 0.5, 0.1],
];

describe("HSL", () => {
  test("inversions are accurate", () => {
    const flatRgbs = rgbs.flat();

    for (const [i, n] of rgbs.flatMap(rgb => hslToRgb(rgbToHsl(rgb))).entries()) {
      expect(n).toBeCloseTo(flatRgbs[i]);
    }
  });
});

describe("HSV", () => {
  test("inversions are accurate", () => {
    const flatRgbs = rgbs.flat();

    for (const [i, n] of rgbs.flatMap(rgb => hsvToRgb(rgbToHsv(rgb))).flat().entries()) {
      expect(n).toBeCloseTo(flatRgbs[i]);
    }
  });
});