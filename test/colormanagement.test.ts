import It from "./iter";

import {Color} from "@/util";
import * as cm from "@/models/colormanagement";

describe("sRGB", () => {
	test("inversion functions are accurate", () => {
		const origColor = [0.1, 0.75, 0.5];
		const newColor = cm.srgbToLinear(cm.linearToSrgb(origColor as Color));

		console.log(origColor, newColor);

		for (const [oldC, newC] of It.zip(origColor, newColor)) {
			expect(newC).toBeCloseTo(oldC, 6);
		}

	});
});