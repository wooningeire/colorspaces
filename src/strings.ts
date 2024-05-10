import * as marked from "marked";

export type StringKey = keyof typeof strings;
export const NO_DESC = Symbol();

let getString: (key: string | StringKey, ...replacements: string[]) => string;
export default getString = (key: string | StringKey, ...replacements: string[]) =>
  marked.parseInline(strings.hasOwnProperty(key) ? strings[key as keyof typeof strings] : `[missing text: \`${String(key)}\`]`)
      .replaceAll(/\{(\d+)\}/g, (match, slotIndex) => replacements[Number(slotIndex)]);

const cite = (index: number, url: string, archivedUrl: string) => `<small>[${index}] ${url} ([archived](${archivedUrl}))</small>`;

const strings = {
  "general.socketDataTypeLabel": "**Data type**: ",
  "general.socketUnlinkTutorial": "*Double-click to detach links*",

  "label.nodeCategory.models": "Models",
  "label.nodeCategory.spaces": "Spaces",

  "label.node.rgb": "RGB",
  "label.node.hsl": "HSL",
  "label.node.hsv": "HSV",
  "label.node.hwb": "HWB",
  "label.node.cmy": "CMY",
  "label.node.lxy": "Lxy",
  "label.node.lch": "LCh",
  "label.node.spectralPowerDistribution": "Spectral power distribution",
  "label.node.wavelength": "Wavelength",
  "label.node.blackbody": "Blackbody",
  "label.node.standardIlluminant": "Standard illuminant",

  "label.node.srgb": "sRGB",
  "label.node.linearSrgb": "Linear sRGB",
  "label.node.xyz": "XYZ",
  "label.node.xyy": "xyY",
  "label.node.lab": "L\\*a\\*b\\*",
  "label.node.luv": "L\\*u\\*v\\*",
  "label.node.oklab": "Oklab",
  "label.node.linearAdobeRgb": "Linear Adobe RGB 1998",
  "label.node.adobeRgb": "Adobe RGB 1998",
  "label.node.rec709": "Rec. 709",

  "label.node.vectorArithmetic": "Vector arithmetic",
  "label.node.arithmetic": "Arithmetic",
  "label.node.vector": "Vector",
  "label.node.splitVector": "Split vector",
  "label.node.colorDifference": "Color difference",
  "label.node.contrastRatio": "Contrast ratio",
  "label.node.randomFloat": "Random float",

  "label.node.gradient": "Gradient",
  "label.node.imageFile": "Image file",
  "label.node.sample": "Sample",

  "label.node.cssOutput": "CSS output",
  "label.node.chromaticityPlot": "Chromaticity plot",
  "label.node.imagePlot": "Image plot",
  "label.node.sampleHexCodes": "Sample hex codes",

  "label.node.conditional": "Conditional",

  "label.node.reroute": "Reroute",


  "label.socket.color": "Color",
  "label.socket.illuminant": "White point",

  "label.button.deleteNodes": "Delete selected nodes",

  "desc.node.rgb": "A color model defined by amounts of red, green, and blue light added together.",
  "desc.node.hsl": "Describes RGB colors by their hue, saturation, and lightness.",
  "desc.node.hsv": "Describes RGB colors by their hue, saturation, and value/brightness.",
  "desc.node.hwb": "Describes RGB colors by their hue, whiteness, and blackness.",
  "desc.node.cmy": "Describes RGB colors by subtracting amounts of their opposites (cyan, yellow, and magenta).",
  "desc.node.lxy": "Describes colors by their lightness and two chroma axes, x (red–green) and y (yellow–blue), which come from human opponent-process color vision.",
  "desc.node.lch": "A variant of Lxy that uses hue (h) and colorfulness (C) to define colors, similar to HSV.",
  "desc.node.vector": "A general set of three numbers, for input to color spaces.",
  "desc.node.spectralPowerDistribution": "Describes colors by the range of wavelengths that make them up.",
  "desc.node.standardIlluminant": `A collection of common definitions for the color “white”. Human eyes will adjust under different viewing circumstances, so different chromaticities and hues could be considered “white” (chromatic adaptation / white balance).<sup>[1]</sup><br /><br />${cite(1, "https://yuhaozhu.com/blog/chromatic-adaptation.html", "https://web.archive.org/web/20240226042830/https://yuhaozhu.com/blog/chromatic-adaptation.html")}`,

  "desc.node.srgb": "The default color space in most images. Each component scales almost directly with perceived brightness.",
  "desc.node.linearSrgb": "A variant of sRGB that scales directly with physical light power.",
  "desc.node.xyz": `Or “CIEXYZ”, or “CIE 1931 XYZ”. A color space that is commonly used as a basis for defining other color spaces and converting between them. Similar to RGB spaces, colors are represented as amounts of three “primary” colors added together, but the selected primaries are imaginary (physically impossible) and were merely mathematically convenient for computations in the 1930s. Despite this, combinations of these imaginary colors can represent existant colors. (The convenience was that it can represent the colors of all pure wavelengths of light, and therefore also their sums, using nonnegative coordinates—something that is impossible to do with any triplet of primaries that actually exist.)<sup>[1]</sup><br /><br />It is derived from the CIE RGB color space, which actually uses existant colors for its primaries. The Y axis has been specifically selected to represent luminance, or an approximation of brightness, which can be calculated through some weighted combination of any RGB primaries.<sup>[1]</sup><br /><br />${cite(1, "https://graphics.stanford.edu/courses/cs148-10-summer/docs/2010--kerr--cie_xyz.pdf", "https://web.archive.org/web/20230829180313/https://graphics.stanford.edu/courses/cs148-10-summer/docs/2010--kerr--cie_xyz.pdf")}`,
  "desc.node.xyy": "A variant of XYZ that separates chromaticity (xy) and relative luminance (Y).",
  "desc.node.lab": "Or “CIELAB”. An attempted *perceptually uniform* color space, defined by perceived luminance (L\\*) and color axes for green, red, blue, and yellow.",
  "desc.node.luv": "Or “CIELUV”.",
  "desc.node.rec709": "RGB space with the same gamut as sRGB, but a different gamma correction function. Commonly used in videos.",
  
  "desc.node.splitVector": "Accesses the individual components of a vector or color.",
  "desc.node.contrastRatio": "Compares the relative luminance between two colors.",

  "desc.node.gradient": "Generates a range of numbers.",
  "desc.node.imageFile": "Reads RGB data from a local image file.",
  "desc.node.sample": "Samples data from a single point in an image.",

  "desc.node.cssOutput": "CSS formats for an RGB color.",

  "desc.socket.illuminant": `The chromaticity of the color “white”, or often the color of the light that illuminates an environment. Human eyes will adjust under different viewing circumstances, so different chromaticities and hues could be considered “white” (chromatic adaptation / white balance).<sup>[1]</sup><br /><br />${cite(1, "https://yuhaozhu.com/blog/chromatic-adaptation.html", "https://web.archive.org/web/20240226042830/https://yuhaozhu.com/blog/chromatic-adaptation.html")}`,

  "desc.field.rgb.r": "**R**: Red light.",
  "desc.field.rgb.g": "**G**: Green light.",
  "desc.field.rgb.b": "**B**: Blue light.",

  "desc.field.lchab.l": "**L\\***: Perceived luminance. (0–100)",
  "desc.field.lchab.c": "**C\\***: Colorfulness (similar to saturation).",
  "desc.field.lchab.h": "**h**: Hue. (0–1)",

  "desc.field.oklchab.l": "**L\\***: Perceived luminance. (0–1)",
  "desc.field.oklchab.c": "**C\\***: Colorfulness (similar to saturation).",
  "desc.field.oklchab.h": "**h**: Hue. (0–1)",

  "desc.field.xyz.x": "**X**: Imaginary color. (0–1)",
  "desc.field.xyz.y": "**Y**: Relative luminance, i.e. how bright the color appears relative to white. (0–1)",
  "desc.field.xyz.z": "**Z**: Imaginary color that somewhat correlates with blue. (0–1)",

  "desc.field.xyy.x": "**x**: One axis used to define chromaticity.",
  "desc.field.xyy.y": "**y**: Another axis used to define chromaticity.",
  "desc.field.xyy.lum": "**Y**: Relative luminance, i.e. luminance relative to the white point. (0–1)",

  "label.socketType.float": "Float",
  "desc.socketType.float.out": "A single number.",
  "desc.socketType.float.in": "A single number.",
  "label.socketType.bool": "Bool",
  "desc.socketType.bool.out": "A true or false value.",
  "desc.socketType.bool.in": "A true or false value.",
  "label.socketType.vector": "Vector",
  "desc.socketType.vector.out": "A list of (usually 3) numbers with no color space data attached to it.",
  "desc.socketType.vector.in": "A list of (usually 3) numbers. This socket also accepts colors, but the associated color space and white point will not affect the result of this node.",
  "label.socketType.vectorOrColor": "Vector or color",
  "desc.socketType.vectorOrColor.out": "A list of (usually 3) numbers which may or may not already be associated with a color space.",
  "desc.socketType.vectorOrColor.in": "A list of (usually 3) numbers which may or may not already be associated with a color space (values will be handled differently depending on this).",
  "label.socketType.colorCoords": "Color",
  "desc.socketType.colorCoords.out": "A list of (usually 3) coordinates in a color space.",
  "desc.socketType.colorCoords.in": "A list of (usually 3) coordinates in a color space.",
  "label.socketType.any": "Any",
  "desc.socketType.any.in": "This socket accepts any data type.",
  "desc.socketType.any.out": "The data type of this socket is not yet known. It will likely depend on the data type of one of the input sockets.",
  "label.socketType.unknown": "Unknown",

  "error.import": "**Error occurred while importing tree**: ",
  "error.import.unknownNodeType": "Node type \"`{0}`\" does not exist.",
  "error.import.unknownOverload": "Node type \"`{0}`\" does not have a mode named \"`{1}`\".",

  [NO_DESC]: "",
};