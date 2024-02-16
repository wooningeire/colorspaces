import * as marked from "marked";

export type StringKey = keyof typeof strings;
export const NO_DESC = Symbol();

let getString: (key: string | StringKey, ...replacements: string[]) => string;
export default getString = (key: string | StringKey, ...replacements: string[]) => replacements.reduce(
  (acc, replacement) => acc.replace("{}", replacement),
  marked.parseInline(strings.hasOwnProperty(key) ? strings[key as keyof typeof strings] : `[missing text: \`${String(key)}\`]`),
);

const strings = {
  "general.socketDataTypeLabel": "**Data type**: ",
  "general.socketUnlinkTutorial": "*Double-click to detach links*",

  "label.nodeCategory.models": "Models",
  "label.nodeCategory.spaces": "Spaces",

  "label.node.srgb": "sRGB",
  "label.node.linearSrgb": "Linear sRGB",
  "label.node.explode": "Explode",
  "label.node.css": "CSS",
  
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
  "desc.node.sample": "Samples data from a single point in an image.",

  "desc.node.cssOutput": "CSS formats for an RGB color.",

  "desc.socket.illuminant": "The chromaticity of the color “white”. This varies under different viewing circumstances.",

  "desc.field.rgb.r": "**R**: Red light.",
  "desc.field.rgb.g": "**G**: Green light.",
  "desc.field.rgb.b": "**B**: Blue light.",

  "desc.field.lchab.l": "**L\\***: Perceived luminance. (0–100)",
  "desc.field.lchab.c": "**C\\***: “Colorfulness” (similar to saturation).",
  "desc.field.lchab.h": "**h**: Hue. (0–1)",

  "desc.field.oklchab.l": "**L\\***: Perceived luminance. (0–1)",
  "desc.field.oklchab.c": "**C\\***: “Colorfulness” (similar to saturation).",
  "desc.field.oklchab.h": "**h**: Hue. (0–1)",

  "desc.field.xyz.x": "**X**: Encodes some information about the stimulation of red (long) cones. (0–1)",
  "desc.field.xyz.y": "**Y**: Relative luminance, i.e. luminance relative to the white point. Encodes some information about the stimulation of green (medium) cones. (0–1)",
  "desc.field.xyz.z": "**Z**: Encodes some information about the stimulation of blue (short) cones. (0–1)",

  "desc.field.xyy.x": "**x**: One axis used to define chromaticity.",
  "desc.field.xyy.y": "**y**: Another axis used to define chromaticity.",
  "desc.field.xyy.lum": "**Y**: Relative luminance, i.e. luminance relative to the white point. (0–1)",

  "label.socketType.float": "Float",
  "desc.socketType.float.out": "A single number.",
  "desc.socketType.float.in": "A single number.",
  "label.socketType.vector": "Vector",
  "desc.socketType.vector.out": "A list of (usually 3) numbers with no color space data attached to it.",
  "desc.socketType.vector.in": "A list of (usually 3) numbers. This socket also accepts colors, but the associated color space will not affect the result of this node.",
  "label.socketType.vectorOrColor": "Vector or color",
  "desc.socketType.vectorOrColor.out": "A list of (usually 3) numbers which may or may not already be associated with a color space.",
  "desc.socketType.vectorOrColor.in": "A list of (usually 3) numbers which may or may not already be associated with a color space (values will be handled differently depending on this).",
  "label.socketType.colorCoords": "Color",
  "desc.socketType.colorCoords.out": "A list of (usually 3) coordinates in a color space.",
  "desc.socketType.colorCoords.in": "A list of (usually 3) coordinates in a color space.",
  "label.socketType.any": "Any",
  "desc.socketType.any.in": "This socket accepts any data type.",
  "desc.socketType.any.out": "The data type of this socket is not yet known. It will likely depend on the data type of one of the input sockets.",

  "error.import": "**Error occurred while importing tree**: ",
  "error.import.unknownNodeType": "Node type \"`{}`\" does not exist.",
  "error.import.unknownOverload": "Node type \"`{}`\" does not have a mode named \"`{}`\".",

  [NO_DESC]: "",
};