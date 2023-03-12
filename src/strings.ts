import * as marked from "marked";

export type StringKey = keyof typeof strings;
export const NO_DESC = Symbol();

export default (key: string | StringKey) => marked.parseInline(strings[key] ?? `[missing text: \`${String(key)}\`]`);

const strings = {
	"label.nodeCategory.models": "Models",
	"label.nodeCategory.spaces": "Spaces",

	"label.node.srgb": "sRGB",
	"label.node.linearSrgb": "Linear sRGB",
	"label.node.explode": "Explode",
	
	"label.socket.color": "Color",
	"label.socket.illuminant": "White point",

	"label.button.deleteNodes": "Delete selected nodes",

	"desc.node.rgb": "A color model defined by amounts of red, green, and blue light added together.",
	"desc.node.hsl": "Describes RGB colors by their hue, saturation, and lightness.",
	"desc.node.hsv": "Describes RGB colors by their hue, saturation, and value/brightness.",
	"desc.node.hwb": "Describes RGB colors by their hue, whiteness, and blackness.",
	"desc.node.cmy": "Describes RGB colors by subtracting amounts of their opposites (cyan, yellow, and magenta).",
	"desc.node.vector": "A general set of three numbers, for input to color spaces.",
	"desc.node.spectralPowerDistribution": "Describes colors by the range of wavelengths that make them up.",

	"desc.node.srgb": "The default color space in most images. Each component scales almost directly with perceived brightness.",
	"desc.node.linearSrgb": "A variant of sRGB that scales directly with physical light power.",
	"desc.node.xyz": "A color space that corresponds somewhat with each type of the human eye's cone cells. Commonly used as a basis for defining other color spaces and converting between them.",
	"desc.node.xyy": "A variant of XYZ that separates chromaticity (xy) and relative luminance (Y).",
	"desc.node.lab": "An attempted *perceptually uniform* color space, defined by perceived luminance (L\\*) and color axes for green, red, blue, and yellow.",
	"desc.node.lchab": "A variant of L\\*a\\*b\\* that uses hue (h) and colorfulness (C\\*) to define colors, somewhat similar to HSV.",
	"desc.node.lchuv": "A variant of L\\*u\\*v\\* that uses hue (h) and colorfulness (C\\*) to define colors, somewhat similar to HSV.",
	"desc.node.rec709": "RGB space with the same gamut as sRGB, but a different gamma correction function. Commonly used in videos.",
	"desc.node.explode": "Accesses the individual components of a vector or color.",
	"desc.node.contrastRatio": "Compares the relative luminance between two colors.",
	"desc.node.gradient": "Generates a range of numbers.",
	"desc.node.imageFile": "Reads RGB data from a local image file.",

	"desc.socket.illuminant": "The chromaticity of the color “white”. This varies under different viewing circumstances.",

	"desc.field.lchab.l": "**L\\***: Perceived luminance. (0–100)",
	"desc.field.lchab.c": "**C\\***: “Colorfulness” (similar to saturation).",
	"desc.field.lchab.h": "**h**: Hue. (0–1)",

	"desc.field.xyz.x": "**X**: Encodes some information about the stimulation of red (long) cones. (0–1)",
	"desc.field.xyz.y": "**Y**: Relative luminance, i.e. luminance relative to the white point. Encodes some information about the stimulation of green (medium) cones. (0–1)",
	"desc.field.xyz.z": "**Z**: Encodes some information about the stimulation of blue (short) cones. (0–1)",

	"desc.field.xyy.x": "**x**: One axis used to define chromaticity.",
	"desc.field.xyy.y": "**y**: Another axis used to define chromaticity.",
	"desc.field.xyy.lum": "**Y**: Relative luminance, i.e. luminance relative to the white point. (0–1)",

	[NO_DESC]: "",
};