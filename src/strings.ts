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

  
  "label.rgb": "RGB",
  "label.hsl": "HSL",
  "label.hsv": "HSV",
  "label.hwb": "HWB",
  "label.cmy": "CMY",
  "label.lxy": "Lxy",
  "label.lch": "LCh",
  "label.xyz": "XYZ",
  "label.xyy": "xyY",

  "label.rgb.r": "R",
  "label.rgb.g": "G",
  "label.rgb.b": "B",
  "label.xyz.x": "X",
  "label.xyz.y": "Y",
  "label.xyz.z": "Z",
  "label.xyy.x": "x",
  "label.xyy.y": "y",
  "label.cielxy.l": "L*",
  "label.cielab.a": "a*",
  "label.cielab.b": "b*",
  "label.cieluv.u": "u*",
  "label.cieluv.v": "v*",
  "label.lxy.l": "l",
  "label.lab.a": "a",
  "label.lab.b": "b",


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
  "label.node.cielab": "L\\*a\\*b\\*",
  "label.node.cieluv": "L\\*u\\*v\\*",
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

  "label.node.conditional": "Conditional",
  "label.node.compareFloats": "Compare floats",

  "label.node.gradient": "Gradient",
  "label.node.imageFile": "Image file",
  "label.node.sample": "Sample",

  "label.node.cssOutput": "CSS output",
  "label.node.chromaticityPlot": "Chromaticity plot",
  "label.node.imagePlot": "Image plot",
  "label.node.sampleHexCodes": "Sample hex codes",

  "label.node.reroute": "Reroute",


  "label.socket.value": "Value",
  "label.socket.vector": "Vector",
  "label.socket.color": "Color",
  "label.socket.colors": "Colors",
  "label.socket.illuminant": "White point",
  "label.socket.min": "Min",
  "label.socket.max": "Max",
  "label.socket.start": "Start",
  "label.socket.end": "End",
  "label.socket.alpha": "Alpha",
  "label.socket.width": "Width",
  "label.socket.height": "Height",
  "label.socket.scalar": "Scalar",
  "label.socket.x": "X",
  "label.socket.y": "Y",
  "label.socket.1": "1",
  "label.socket.2": "2",
  "label.socket.3": "3",

  "label.socket.red": "Red",
  "label.socket.green": "Green",
  "label.socket.blue": "Blue",
  "label.socket.hue": "Hue",
  "label.socket.saturation": "Saturation",
  "label.socket.lightness": "Lightness",
  "label.socket.hsv.value": "Value",
  "label.socket.whiteness": "Whiteness",
  "label.socket.blackness": "Blackness",
  "label.socket.cyan": "Cyan",
  "label.socket.magenta": "Magenta",
  "label.socket.yellow": "Yellow",
  "label.socket.colorfulness": "Colorfulness",
  "label.socket.redGreen": "Red–green",
  "label.socket.yellowBlue": "Yellow–blue",

  "label.socket.rgbOrColor": "RGB or color",
  "label.socket.lxyOrColor": "Lxy or color",
  "label.socket.xyyOrColor": "xyY or color",
  "label.socket.xyzOrColor": "XYZ or color",
  "label.socket.labOrColor": "L*a*b* or color",
  "label.socket.vectorOrColor": "Vector or color",

  "label.socket.addOperand": "Addend",
  "label.socket.multiplyOperand": "Factor",
  "label.socket.subtractOperand1": "Minuend",
  "label.socket.subtractOperand2": "Subtrahend",
  "label.socket.divideOperand1": "Dividend",
  "label.socket.divideOperand2": "Divisor",
  "label.socket.addOut": "Sum",
  "label.socket.multiplyOut": "Product",
  "label.socket.subtractOut": "Difference",
  "label.socket.divideOut": "Quotient",
  "label.socket.blendAmount": "Blend amount",
  "label.socket.cmfDataset": "Color-matching function dataset",
  "label.socket.wavelength": "Wavelength (nm)",
  "label.socket.normalizeCoordinates": "Normalize coordinates",

  "label.overload.lerp": "Lerp",
  "label.overload.add": "Add",
  "label.overload.subtract": "Subtract",
  "label.overload.screen": "Screen",


  "label.overload.toRgb": "To RGB",
  "label.overload.fromRgb": "From RGB",
  "label.overload.toLxy": "To Lxy",
  "label.overload.fromLxy": "From Lxy",
  "label.socket.wavelength.relativePower": "Relative power",
  "label.socket.blackbody.temperature": "Temperature (K)",

  "label.overload.fromVector": "From vector",
  "label.overload.fromValues": "From values",

  "label.overload.vectorArithmetic.componentwiseMultiply": "Componentwise multiply",
  "label.overload.vectorArithmetic.componentwiseDivide": "Componentwise divide",
  "label.overload.vectorArithmetic.scalarMultiply": "Scalar multiply",
  "label.overload.vectorArithmetic.distance": "Distance",
  "label.socket.vectorArithmetic.distance": "Distance",
  "label.overload.arithmetic.multiply": "Multiply",
  "label.overload.arithmetic.divide": "Divide",
  "label.overload.arithmetic.power": "Power",
  "label.socket.arithmetic.powerBase": "Base",
  "label.socket.arithmetic.powerExponent": "Exponent",
  "label.socket.arithmetic.powerOut": "Power",
  "label.overload.arithmetic.mapRange": "Map range",
  "label.socket.arithmetic.mapRange.sourceValue": "Source value",
  "label.socket.arithmetic.mapRange.sourceMin": "Source min",
  "label.socket.arithmetic.mapRange.sourceMax": "Source max",
  "label.socket.arithmetic.mapRange.targetMin": "Target min",
  "label.socket.arithmetic.mapRange.targetMax": "Target max",
  "label.overload.arithmetic.floor": "Floor",
  "label.overload.arithmetic.sine": "Sine",
  "label.overload.arithmetic.cosine": "Cosine",
  "label.overload.arithmetic.tangent": "Tangent",
  "label.overload.arithmetic.arcsine": "Arcsine",
  "label.overload.arithmetic.arccosine": "Arccosine",
  "label.overload.arithmetic.arctangent": "Arctangent",
  "label.overload.arithmetic.arctangent2": "Two-argument arctangent",
  "label.overload.arithmetic.hypotenuse": "Hypotenuse",
  "label.socket.arithmetic.hypotenuse": "Hypotenuse",
  "label.overload.arithmetic.quantize": "Quantize",
  "label.socket.arithmetic.quantize.nSegments": "# segments",
  "label.overload.colorDifference.deltaE1976": "ΔE* 1976",
  "label.overload.colorDifference.deltaE2000": "ΔE* 2000",
  "label.socket.colorDifference.difference": "Difference",
  "label.socket.colorDifference.sampleLabOrColor": "Sample L*a*b* or color",
  "label.socket.colorDifference.targetLabOrColor": "Target L*a*b* or color",
  "label.socket.contrastRatio.ratio": "Ratio",
  "label.socket.contrastRatio.aaaBody?": "Passes AAA body text?",
  "label.socket.contrastRatio.aaaLarge?": "Passes AAA large text?",
  "label.socket.contrastRatio.aaBody?": "Passes AA body text?",
  "label.socket.contrastRatio.aaLarge?": "Passes AA large text?",
  "label.socket.contrastRatio.aaUi?": "Passes AA graphical elements?",
  "label.overload.randomFloat.floatSeed": "Float seed",
  "label.overload.randomFloat.vectorSeed": "Vector seed",
  "label.socket.randomFloat.integersOnly?": "Integers only?",
  "label.socket.randomFloat.seed": "Seed",

  "label.socket.gradient.axis": "Axis",
  "label.socket.gradient.from": "From",
  "label.socket.gradient.to": "To",
  "label.socket.gradient.values": "Values",
  "label.socket.imageFile.file": "File",
  "label.socket.sample.source": "Source",

  "label.overload.cssOutput.rgbVector": "RGB vector",
  "label.overload.cssOutput.color": "Color",
  "label.overload.chromaticityPlot.fromColor": "From colors",
  "label.overload.chromaticityPlot.fromXy": "From xy",


  "label.cmfDataset.2deg": "CIE 2° observer (1931)",
  "label.cmfDataset.10deg": "CIE 10° observer (1964)",

  "label.standardIlluminant.2deg.a": "CIE 2° / A",
  "label.standardIlluminant.2deg.b": "CIE 2° / B",
  "label.standardIlluminant.2deg.c": "CIE 2° / C",
  "label.standardIlluminant.2deg.d50": "CIE 2° / D50",
  "label.standardIlluminant.2deg.d55": "CIE 2° / D55",
  "label.standardIlluminant.2deg.d60": "CIE 2° / D60",
  "label.standardIlluminant.2deg.d65": "CIE 2° / D65",
  "label.standardIlluminant.2deg.d75": "CIE 2° / D75",
  "label.standardIlluminant.2deg.e": "CIE 2° / E",
  "label.standardIlluminant.10deg.a": "CIE 10° / A",
  "label.standardIlluminant.10deg.b": "CIE 10° / B",
  "label.standardIlluminant.10deg.c": "CIE 10° / C",
  "label.standardIlluminant.10deg.d50": "CIE 10° / D50",
  "label.standardIlluminant.10deg.d55": "CIE 10° / D55",
  "label.standardIlluminant.10deg.d60": "CIE 10° / D60",
  "label.standardIlluminant.10deg.d65": "CIE 10° / D65",
  "label.standardIlluminant.10deg.d75": "CIE 10° / D75",
  "label.standardIlluminant.10deg.e": "CIE 10° / E",


  "label.button.deleteNodes": "Delete selected nodes",

  "desc.node.rgb": "A color model defined by amounts of red, green, and blue light added together.",
  "desc.node.hsl": "Describes RGB colors by their hue, saturation, and lightness.",
  "desc.node.hsv": "Describes RGB colors by their hue, saturation, and value/brightness.",
  "desc.node.hwb": "Describes RGB colors by their hue, whiteness, and blackness.",
  "desc.node.cmy": "Describes RGB colors by subtracting amounts of their opposites (cyan, yellow, and magenta).",
  "desc.node.lxy": "Describes colors by their lightness and two chroma axes, x (red–green) and y (yellow–blue), which are derived from human opponent-process color vision.",
  "desc.node.lch": "A variant of Lxy that uses hue (h) and colorfulness (C) to define colors, similar to HSL.",
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

  "desc.node.conditional": "Selects one of two values depending on whether a condition is true.",
  "desc.node.compareFloats": "Outputs the result of a comparison between two numbers.",

  "desc.node.gradient": "Generates a range of numbers.",
  "desc.node.imageFile": "Reads RGB data from a local image file.",
  "desc.node.sample": "Samples data from a single point in an image.",

  "desc.node.cssOutput": "CSS formats for an RGB color.",


  "desc.socket.illuminant": `The chromaticity of the color “white”, or often the color of the light that illuminates an environment. Human eyes will adjust under different viewing circumstances, so different chromaticities and hues could be considered “white” (chromatic adaptation / white balance).<sup>[1]</sup><br /><br />${cite(1, "https://yuhaozhu.com/blog/chromatic-adaptation.html", "https://web.archive.org/web/20240226042830/https://yuhaozhu.com/blog/chromatic-adaptation.html")}`,

  "desc.socket.imageFileRgb": "The RGB color data from the image file.",
  "desc.socket.imageFileAlpha": "The color transparency information from the image file.",
  "desc.socket.imageFileWidth": "The width of the image file.",
  "desc.socket.imageFileHeight": "The height of the image file.",


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
  "label.socketType.colorComponents": "Color",
  "desc.socketType.colorComponents.out": "A list of (usually 3) coordinates in a color space.",
  "desc.socketType.colorComponents.in": "A list of (usually 3) coordinates in a color space.",
  "label.socketType.any": "Any",
  "desc.socketType.any.in": "This socket accepts any data type.",
  "desc.socketType.any.out": "The data type of this socket is not yet known. It will likely depend on the data type of one of the input sockets.",
  "label.socketType.unknown": "Unknown",
  
  "label.socketAttr.constant": "**Constant**",
  "desc.socketAttr.constant.in": "If the input data to this socket is an image rather than a single value, this socket will always only use one value from the input data.",
  "desc.socketAttr.constant.out": "This socket's outptut data will always only consist of a single value rather than an image, regardless of the inputs.",

  "error.import": "**Error occurred while importing tree**: ",
  "error.import.unknownNodeType": "Node type \"`{0}`\" does not exist.",
  "error.import.unknownOverload": "Node type \"`{0}`\" does not have a mode named \"`{1}`\".",

  [NO_DESC]: "",
};