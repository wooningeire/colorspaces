import { WebglSlot, WebglTemplate, WebglVariables } from "$/webgl-compute/WebglVariables";
import { Node, SocketType, NodeEvalContext, OutputDisplayType, SocketFlag, InSocket, webglStdOuts } from "$/node";
import { Overload, OverloadGroup, NodeWithOverloads } from "$/node/Overload";
import * as cm from "$/color-management";


export enum ChromaticityPlotMode {
  Color = "from color",
  Xy = "from xy",
}
export namespace output {
  enum CssOutputMode {
    RgbVector = "rgbVector",
    Color = "color",
  }
  export class CssOutputNode extends NodeWithOverloads<CssOutputMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cssOutput";
    static readonly outputDisplayType = OutputDisplayType.Css;

    static readonly overloadGroup = new OverloadGroup(new Map<CssOutputMode, Overload>([
      [CssOutputMode.RgbVector, new Overload(
        "label.overload.cssOutput.rgbVector",
        node => [
          new InSocket(node, SocketType.Vector, "label.rgb").flag(SocketFlag.Rgb),
        ],
        node => [],
        (ins, outs, context) => ({
          values: ins[0].inValue(context),
          labels: [],
          flags: [],
        }),
      )],
      [CssOutputMode.Color, new Overload(
        "label.overload.cssOutput.color",
        node => [
          new InSocket(node, SocketType.Color, "label.socket.color"),
        ],
        node => [],
        (ins, outs, context) => ({
          values: ins[0].inValue(context),
          labels: [],
          flags: [],
        }),
      )],
    ]));

    constructor() {
      super(CssOutputMode.RgbVector);
      this.width = 275;
    }
  }
  export class ChromaticityPlotNode extends NodeWithOverloads<ChromaticityPlotMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "chromaticityPlot";

    static readonly overloadGroup = new OverloadGroup(new Map<ChromaticityPlotMode, Overload>([
      [ChromaticityPlotMode.Color, new Overload(
        "label.overload.chromaticityPlot.fromColor",
        node => [
          new InSocket(node, SocketType.Color, "label.socket.colors"),
        ],
        node => [],
      )],

      [ChromaticityPlotMode.Xy, new Overload(
        "label.overload.chromaticityPlot.fromXy",
        node => [
          new InSocket(node, SocketType.Float, "label.xyy.x", {
            defaultValue: cm.illuminantsXy["2deg"]["D65"][0],
          }),
          new InSocket(node, SocketType.Float, "label.xyy.y", {
            defaultValue: cm.illuminantsXy["2deg"]["D65"][1],
          }),
        ],
        node => [],
      )],
    ]));

    constructor() {
      super(ChromaticityPlotMode.Color);
      this.width = 200;
    }
  }

  export class ImagePlotNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "imagePlot";
    static readonly outputDisplayType = OutputDisplayType.Custom;

    readonly normalizeCoordsSocket: InSocket<SocketType.Bool>;
    readonly alphaSocket: InSocket<SocketType.Float>;
    readonly widthSocket: InSocket<SocketType.Integer>;
    readonly heightSocket: InSocket<SocketType.Integer>;

    width = 240;

    private static readonly inputSlots = WebglSlot.ins("color", "alpha");

    constructor() {
      super();

      const {color, alpha} = ImagePlotNode.inputSlots;

      this.ins.push(
        (this.normalizeCoordsSocket = new InSocket(this, SocketType.Bool, "label.socket.normalizeCoordinates", {
          showSocket: false,
          defaultValue: true,
        })),
        new InSocket(this, SocketType.Color, "label.socket.colors", {
          webglOutputMappingStatic: {
            [webglStdOuts.color]: color,
          },
        }),
        (this.alphaSocket = new InSocket(this, SocketType.Float, "label.socket.alpha", {
          defaultValue: 1,
          webglOutputMappingStatic: {
            [webglStdOuts.float]: alpha,
          },
        })),
        (this.widthSocket = new InSocket(this, SocketType.Integer, "label.socket.width", {
          defaultValue: 240,
          constant: true,
          sliderProps: {
            hasBounds: false,
            min: 1,
          },
        })),
        (this.heightSocket = new InSocket(this, SocketType.Integer, "label.socket.height", {
          defaultValue: 240,
          constant: true,
          sliderProps: {
            hasBounds: false,
            min: 1,
          },
        })),
      );
    }

    display(context: NodeEvalContext) {
      return {
        values: this.ins[1].inValue(context),
        labels: [],
        flags: [],
      };
    }
    
    webglOutputs() {
      const {color, alpha} = ImagePlotNode.inputSlots;

      return {
        [webglStdOuts.color]: WebglTemplate.slot(color),
        [webglStdOuts.alpha]: WebglTemplate.slot(alpha),
      };
    }
  }

  export class SampleHexCodesNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "sampleHexCodes";
    static readonly outputDisplayType = OutputDisplayType.Custom;

    readonly colorsSocket: InSocket<SocketType.Color>;
    readonly scaleXSocket: InSocket<SocketType.Float>;
    readonly scaleYSocket: InSocket<SocketType.Float>;
    readonly nSegmentsXSocket: InSocket<SocketType.Integer>;
    readonly nSegmentsYSocket: InSocket<SocketType.Integer>;
    readonly fitRangeXSocket: InSocket<SocketType.Bool>;
    readonly fitRangeYSocket: InSocket<SocketType.Bool>;
    readonly clampSocket: InSocket<SocketType.Bool>;

    width = 600;

    constructor() {
      super();
      this.ins.push(
        (this.colorsSocket = new InSocket(this, SocketType.Color, "label.socket.colors")),
        (this.scaleXSocket = new InSocket(this, SocketType.Float, "label.socket.sampleHexCodes.scaleX", {
          defaultValue: 1,
          sliderProps: {
            hasBounds: false,
          },
        })),
        (this.nSegmentsXSocket = new InSocket(this, SocketType.Integer, "label.socket.sampleHexCodes.nSegmentsX", {
          defaultValue: 4,
          constant: true,
          sliderProps: {
            hasBounds: false,
            min: 1,
            max: 25,
            step: 1,
          },
        })),
        (this.fitRangeXSocket = new InSocket(this, SocketType.Bool, "label.socket.sampleHexCodes.fitRangeX?", {
          defaultValue: true,
          desc: "desc.socket.arithmetic.quantize.fitRange?",
        })),
        (this.scaleYSocket = new InSocket(this, SocketType.Float, "label.socket.sampleHexCodes.scaleY", {
          defaultValue: 1,
          sliderProps: {
            hasBounds: false,
          },
        })),
        (this.nSegmentsYSocket = new InSocket(this, SocketType.Integer, "label.socket.sampleHexCodes.nSegmentsY", {
          defaultValue: 4,
          constant: true,
          sliderProps: {
            hasBounds: false,
            min: 1,
            max: 25,
            step: 1,
          },
        })),
        (this.fitRangeYSocket = new InSocket(this, SocketType.Bool, "label.socket.sampleHexCodes.fitRangeY?", {
          defaultValue: true,
          desc: "desc.socket.arithmetic.quantize.fitRange?",
        })),
        (this.clampSocket = new InSocket(this, SocketType.Bool, "label.socket.sampleHexCodes.clampOutOfGamutColors", {
          defaultValue: false,
          constant: true,
        })),
      );
    }
  }
}