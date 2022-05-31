import * as marked from "marked";

export type StringKey = keyof typeof strings;
export const NO_DESC = Symbol();

export default (key: StringKey) => marked.parseInline(strings[key] ?? `[missing text: \`${String(key)}\`]`);

const strings = {
	"label.nodeCategory.models": "Models",

	"label.node.srgb": "sRGB",
	"label.node.linearSrgb": "Linear sRGB",
	"label.node.explode": "Explode",
	
	"label.socket.color": "Color",
	"label.socket.illuminant": "White point",

	"label.button.deleteNodes": "Delete selected nodes",

	"desc.node.srgb": "The default color space in most images. Each component scales linearly with perceived brightness.",
	"desc.node.linearSrgb": "A variant of sRGB that scales linearly with physical light power.",
	"desc.node.xyz": "A color space whose components correspond with each type of the eye's cone cells.",
	"desc.node.xyy": "A variant of XYZ that separates chromaticity (xy) and relative luminance (Y).",
	"desc.node.lchab": "A variant of L\\*a\\*b\\* that uses *hue* and *colorfulness* to define colors, somewhat similar to HSV.",
	"desc.node.lchuv": "A variant of L\\*u\\*v\\* that uses *hue* and *colorfulness* to define colors, somewhat similar to HSV.",
	"desc.node.rec709": "RGB space with the same gamut as sRGB, but a different gamma correction function. Commonly used in videos.",
	"desc.node.explode": "Accesses the individual components of a vector or color.",
	"desc.node.contrastRatio": "Compares the relative luminance between two colors.",
	"desc.node.gradient": "Generates a range of numbers.",
	"desc.node.imageFile": "Reads RGB data from a local image file.",

	"desc.field.lchab.l": "Perceived luminance.",
	"desc.field.lchab.c": "“Colorfulness” (similar to saturation).",
	"desc.field.lchab.h": "Hue. (0–1)",

	[NO_DESC]: "",
};