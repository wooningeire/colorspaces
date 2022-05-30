import * as marked from "marked";

export default (key: keyof typeof strings) => strings[key] !== undefined ? marked.parseInline(strings[key]) : `[no text: ${key}]`;

const strings = {
	"label.nodeCategory.models": "Models",

	"label.node.srgb": "sRGB",
	"label.node.linearSrgb": "Linear sRGB",
	"label.node.explode": "Explode",
	
	"label.socket.color": "Color",
	"label.socket.illuminant": "White point",

	"label.button.deleteNodes": "Delete selected nodes",

	"desc.node.srgb": "The default color space in most images and displays. Each component scales linearly with perceived brightness.",
	"desc.node.linearSrgb": "A variant of sRGB that scales linearly with physical light power.",
	"desc.node.xyz": "A color space whose components correspond with each type of the eye's cone cells.",
	"desc.node.xyy": "A variant of XYZ that separates *chromaticity* and *luminance*.",
	"desc.node.lchab": "A variant of L\\*a\\*b\\* that uses *hue* and *colorfulness* to define colors.",
	"desc.node.explode": "Gets the individual components of a vector or color.",

	"desc.field.lchab.l": "Perceived luminance.",
	"desc.field.lchab.c": "“Colorfulness” (similar to saturation).",
	"desc.field.lchab.h": "Hue. (0–1)",
};