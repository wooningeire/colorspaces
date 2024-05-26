import It from "$/iter";

import {Vec3} from "$/util";
import * as cm from ".";
import {describe, expect, test} from "vitest";

describe("sRGB", () => {
  test("inversion functions are accurate", () => {
    const origColor = [0.1, 0.75, 0.5];
    const newColor = cm.Srgb.from(cm.LinearSrgb.from(new cm.Srgb(origColor as Vec3)));

    console.log(origColor, newColor);

    for (const [oldC, newC] of It.zip(origColor, newColor)) {
      expect(newC).toBeCloseTo(oldC, 6);
    }

  });
});