import { Node, SocketType, SocketFlag, NodeEvalContext, OutputDisplayType, InSocket, OutSocket, webglOuts, Socket } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";

import { Vec3 } from "@/util";
import { illuminantE } from "../colormanagement/spaces/col-xyz-xyy-illuminants";
import { getIlluminant, whitePointSocketOptions } from "./spaces";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { StringKey } from "@/strings";

export namespace models {
  export class RgbNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rgb";

    private static readonly inputSlots = WebglSlot.ins("red", "green", "blue");

    constructor() {
      super();

      const {red, green, blue} = RgbNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Float, "label.socket.red", {webglOutputMapping: {[webglOuts.val]: red}}).flag(SocketFlag.Rgb),
        new InSocket(this, SocketType.Float, "label.socket.green", {webglOutputMapping: {[webglOuts.val]: green}}).flag(SocketFlag.Rgb),
        new InSocket(this, SocketType.Float, "label.socket.blue", {webglOutputMapping: {[webglOuts.val]: blue}}).flag(SocketFlag.Rgb),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.socket.blue", context => this.ins.map(socket => socket.inValue(context)) as Vec3, {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`vec3(${red}, ${green}, ${blue})`}),
        }),
      );
    }

    displayValues(context: NodeEvalContext): Vec3 {
      return this.ins.map(socket => socket.inValue(context)) as Vec3;
    }

    webglBaseVariables(): WebglVariables {
      return WebglVariables.empty({node: this});
    }
  }

  enum RgbOverloadMode {
    ToRgb = "to rgb",
    FromRgb = "from rgb",
  }

  type Conversion = {
    convert: (rgb: Vec3) => Vec3,
    webglConversionFunction: string,
  };
  
  const createConverterNodeType = ({
    name,
    id,
    outputDisplayType,
    
    socketLabels,
    nodeDisplayLabels,
    socketFlags=[SocketFlag.None, SocketFlag.None, SocketFlag.None],
    toRgb,
    fromRgb,
  }: {
    name: string,
    id: string,
    outputDisplayType: OutputDisplayType,

    socketLabels: StringKey[],
    nodeDisplayLabels: StringKey[],
    socketFlags?: SocketFlag[],

    toRgb: Conversion,
    fromRgb: Conversion,
  }) => {
    const inputSlots = WebglSlot.ins("x", "y", "z");
    const {x, y, z} = inputSlots;
    const toRgbOutputs = {[webglOuts.val]: WebglTemplate.concat`${toRgb.webglConversionFunction}(vec3(${x}, ${y}, ${z}))`};
  
    const rgb = WebglSlot.in("rgb");
    const internal = WebglSlot.out("internal");

    return class extends NodeWithOverloads<RgbOverloadMode> {
      static readonly TYPE = Symbol(name);
      static readonly id = id;
      static readonly outputDisplayType = outputDisplayType;
  
      static readonly overloadGroup = new OverloadGroup(new Map<RgbOverloadMode, Overload>([
        [RgbOverloadMode.ToRgb, new Overload(
          "label.overload.toRgb",
          node => Object.values(inputSlots).map(
            (slot, i) => 
                new InSocket(node, SocketType.Float, socketLabels[i], {webglOutputMapping: {[webglOuts.val]: slot}}).flag(socketFlags[i]),
          ),
          (node, ins) => [
            new OutSocket(node, SocketType.Vector, "label.rgb", context => toRgb.convert(ins.map(socket => socket.inValue(context)) as Vec3) as Vec3, {
              webglOutputs: socket => () => toRgbOutputs,
            }),
          ],
          (ins, outs, context) => ({
            values: toRgb.convert(ins.map(socket => socket.inValue(context)) as Vec3),
            labels: ["label.rgb.r", "label.rgb.g", "label.rgb.b"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          }),
          (ins, outs, context, node) => WebglVariables.empty({node}),
          () => toRgbOutputs,
        )],
  
        [RgbOverloadMode.FromRgb, new Overload(
          "label.overload.fromRgb",
          node => [
            new InSocket(node, SocketType.Vector, "label.rgb", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ],
          (node, ins) => Object.values(inputSlots).map(
            (slot, i) => 
                new OutSocket(node, SocketType.Float, socketLabels[i], context => fromRgb.convert(ins[0].inValue(context) as Vec3)[i], {
                  webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.concat`${internal}.${["x", "y", "z"][i]}`}),
                }).flag(socketFlags[i])
          ),
          (ins, outs, context) => ({
            values: fromRgb.convert(ins[0].inValue(context) as Vec3),
            labels: nodeDisplayLabels,
            flags: socketFlags,
          }),
          (ins, outs, context, node) => WebglVariables.templateConcat`vec3 ${internal} = ${fromRgb.webglConversionFunction}(${rgb});`({
            node,
          }),
          () => ({[webglOuts.val]: WebglTemplate.slot(internal)}),
        )],
      ]));

      constructor() {
        super(RgbOverloadMode.ToRgb);
      }
    }
  };

  export const HslNode = createConverterNodeType({
    name: "HslNode",
    id: "hsl",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["label.socket.hue", "label.socket.saturation", "label.socket.lightness"],
    nodeDisplayLabels: ["label.hxy.h", "label.hsx.s", "label.hsl.l"],
    socketFlags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
    toRgb: {
      convert: cm.hslToRgb,
      webglConversionFunction: "hslToRgb",
    },
    fromRgb: {
      convert: cm.rgbToHsl,
      webglConversionFunction: "rgbToHsl",
    },
  });

  export const HsvNode = createConverterNodeType({
    name: "HsvNode",
    id: "hsv",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["label.socket.hue", "label.socket.saturation", "label.socket.hsv.value"],
    nodeDisplayLabels: ["label.hxy.h", "label.hsx.s", "label.hsv.v"],
    socketFlags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
    toRgb: {
      convert: cm.hsvToRgb,
      webglConversionFunction: "hsvToRgb",
    },
    fromRgb: {
      convert: cm.rgbToHsv,
      webglConversionFunction: "rgbToHsv",
    },
  });

  export const HwbNode = createConverterNodeType({
    name: "HwbNode",
    id: "hwb",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["label.socket.hue", "label.socket.whiteness", "label.socket.blackness"],
    nodeDisplayLabels: ["label.hxy.h", "label.hwb.w", "label.hwb.b"],
    socketFlags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
    toRgb: {
      convert: cm.hwbToRgb,
      webglConversionFunction: "hwbToRgb",
    },
    fromRgb: {
      convert: cm.rgbToHwb,
      webglConversionFunction: "rgbToHwb",
    },
  });

  export const CmyNode = createConverterNodeType({
    name: "CmyNode",
    id: "cmy",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["label.socket.cyan", "label.socket.magenta", "label.socket.yellow"],
    nodeDisplayLabels: ["label.cmy.c", "label.cmy.m", "label.cmy.y"],
    toRgb: {
      convert: cm.cmyToRgb,
      webglConversionFunction: "cmyToRgb",
    },
    fromRgb: {
      convert: cm.rgbToCmy,
      webglConversionFunction: "rgbToCmy",
    },
  });

  /* export class XyzModelNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "XYZ (model)";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, SocketType.Float, "X"),
        new InSocket(this, SocketType.Float, "Y"),
        new InSocket(this, SocketType.Float, "Z"),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "XYZ"),
      );
    }

    output(context: NodeEvalContext): Color {
      return this.ins.map(socket => socket.inValue(context)) as Color;
    }
  } */


  enum LxyOverloadMode {
    ToLxy = "to lxy",
    FromLxy = "from lxy",
  }
  
  export class LxyNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "lxy";

    private static readonly inputSlots = WebglSlot.ins("lightness", "redGreen", "yellowBlue");

    constructor() {
      super();

      const {lightness, redGreen, yellowBlue} = LxyNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Float, "label.socket.lightness", {
          webglOutputMapping: {[webglOuts.val]: lightness},
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Float, "label.socket.redGreen", {
          webglOutputMapping: {[webglOuts.val]: redGreen},
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Float, "label.socket.yellowBlue", {
          webglOutputMapping: {[webglOuts.val]: yellowBlue},
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.lxy", context => this.ins.map(socket => socket.inValue(context)) as Vec3, {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`vec3(${lightness}, ${redGreen}, ${yellowBlue})`}),
        }),
      );
    }

    displayValues(context: NodeEvalContext): Vec3 {
      return this.ins.map(socket => socket.inValue(context)) as Vec3;
    }

    webglBaseVariables(): WebglVariables {
      return WebglVariables.empty({node: this});
    }
  }

  export const LchNode = (() => {
    const socketLabels = ["label.socket.lightness", "label.socket.colorfulness", "label.socket.hue"] as StringKey[];

    const inputSlots = WebglSlot.ins("lightness", "colorfulness", "hue");
    const {lightness, colorfulness, hue} = inputSlots;
    const toLxyOutputs = {[webglOuts.val]: WebglTemplate.source`lchToLxy(vec3(${lightness}, ${colorfulness}, ${hue}))`};
  
    const lxy = WebglSlot.in("lxy");
    const internal = WebglSlot.out("internal");

    return class LchNode extends NodeWithOverloads<LxyOverloadMode> {
      static readonly TYPE = Symbol(this.name);
      static readonly id = "lch";
      static readonly outputDisplayType = OutputDisplayType.Vec;
  
      static readonly overloadGroup = new OverloadGroup(new Map<LxyOverloadMode, Overload>([
        [LxyOverloadMode.ToLxy, new Overload(
          "label.overload.toLxy",
          node => [
            new InSocket(node, SocketType.Float, socketLabels[0], {
              webglOutputMapping: {[webglOuts.val]: lightness},
              sliderProps: {
                hasBounds: false,
              },
            }),
            new InSocket(node, SocketType.Float, socketLabels[1], {
              webglOutputMapping: {[webglOuts.val]: colorfulness},
              sliderProps: {
                hasBounds: false,
              },
            }),
            new InSocket(node, SocketType.Float, socketLabels[2], {
              webglOutputMapping: {[webglOuts.val]: hue},
            }).flag(SocketFlag.Hue),
          ],
          (node, ins) => [
            new OutSocket(node, SocketType.Vector, "label.lxy", context => cm.lchToLxy(ins.map(socket => socket.inValue(context)) as Vec3) as Vec3, {
              webglOutputs: socket => () => toLxyOutputs,
            }),
          ],
          (ins, outs, context) => ({
            values: cm.lchToLxy(ins.map(socket => socket.inValue(context)) as Vec3),
            labels: ["label.lxy.l", "label.lxy.x", "label.lxy.y"] as StringKey[],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          }),
          (ins, outs, context, node) => WebglVariables.empty({node}),
          () => toLxyOutputs,
        )],
  
        [LxyOverloadMode.FromLxy, new Overload(
          "label.overload.fromLxy",
          node => [
            new InSocket(node, SocketType.Vector, "label.lxy", {
              webglOutputMapping: {[webglOuts.val]: lxy},
              sliderProps: [
                {
                  hasBounds: false,
                },
                {
                  hasBounds: false,
                },
                {
                  hasBounds: false,
                },
              ],
            }),
          ] as [InSocket<SocketType.Vector>],
          (node, ins) => Object.values(inputSlots).map(
            (slot, i) => 
                new OutSocket(node, SocketType.Float, socketLabels[i], context => cm.lxyToLch(ins[0].inValue(context) as Vec3)[i], {
                  webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.concat`${internal}.${["x", "y", "z"][i]}`}),
                })
          ),
          (ins, outs, context) => ({
            values: cm.lxyToLch(ins[0].inValue(context) as Vec3),
            labels: ["label.lxy.l", "label.lch.c", "label.lch.h"] as StringKey[],
            flags: [SocketFlag.None, SocketFlag.None, SocketFlag.Hue],
          }),
          (ins, outs, context, node) => WebglVariables.templateConcat`vec3 ${internal} = lxyToLch(${lxy});`({
            node,
          }),
          () => ({[webglOuts.val]: WebglTemplate.slot(internal)}),
        )],
      ]));

      constructor() {
        super(LxyOverloadMode.ToLxy);
      }
    };
  })();

  export class SpectralPowerDistributionNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "spectralPowerDistribution";

    width = 503;

    distribution: number[] =
      Array(830 - 360 + 1).fill(0)
          .map((_, x) => Math.exp(-(((x - 235) / 90)**2)));

    colorMatchingDataset: "2deg" | "10deg" = "2deg";

    private static readonly outputSlots = WebglSlot.outs("unif");

    constructor() {
      super();

      const {unif} = SpectralPowerDistributionNode.outputSlots;
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.xyz", context => this.computeXyz(), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(unif)}),
        }),
        new OutSocket(this, SocketType.ColorComponents, "label.socket.color", context => new cm.Xyz(this.computeXyz(), illuminantE), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`Color(${unif}, illuminant2_E, ${unif})`}),
        }),
      );
    }

    private cachedOutput: Vec3 | null = null;
    private computeXyz() {
      return this.cachedOutput
          ?? (this.cachedOutput = [...cm.spectralPowerDistribution(this.distribution, this.colorMatchingDataset)] as any as Vec3);
    }

    flushCache() {
      this.cachedOutput = null;
    }

    webglBaseVariables(): WebglVariables {
      const {unif} = SpectralPowerDistributionNode.outputSlots;

      return WebglVariables.empty({
        node: this,
        preludeTemplate: WebglTemplate.source`uniform vec3 ${unif};`,
        uniforms: new Map([
          [WebglTemplate.slot(unif), {
            set: (gl, unif) => {
              // we can bake this value from the CPU for now. If sockets are introduced, this must be GPU-computed
              gl.uniform3fv(unif, this.computeXyz());
            },
            dependencySockets: [],
            dependencyNodes: [this],
          }],
        ]),
      });
    }
  }

  export class WavelengthNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "wavelength";

    private readonly inSocket: InSocket<SocketType.Float>;
    private readonly powerSocket: InSocket<SocketType.Float>;
    private readonly datasetSocket: InSocket<SocketType.Dropdown>;

    private static readonly inputSlots = WebglSlot.ins("wavelength", "power");
    private static readonly outputSlots = WebglSlot.outs("xyz");

    constructor() {
      super();
      
      const {wavelength, power} = WavelengthNode.inputSlots;
      const {xyz} = WavelengthNode.outputSlots;

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Float, "label.socket.wavelength", {
          sliderProps: {
            softMin: 360,
            softMax: 830,
            step: 1,
          },
          defaultValue: 510,
          webglOutputMapping: {[webglOuts.val]: wavelength},
        })),
        (this.powerSocket = new InSocket(this, SocketType.Float, "label.socket.wavelength.relativePower", {
          sliderProps: {
            hasBounds: false,
          },
          defaultValue: 1,
          webglOutputMapping: {[webglOuts.val]: power},
        })),
        (this.datasetSocket = new InSocket(this, SocketType.Dropdown, "label.socket.cmfDataset", {
          showSocket: false,
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "label.cmfDataset.2deg"},
            {value: "10deg", text: "label.cmfDataset.10deg"},
          ],
          valueChangeRequiresShaderReload: true,
        })),
      );
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.xyz", context => this.computeXyz(context), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(xyz)}),
        }),
        new OutSocket(this, SocketType.ColorComponents, "label.socket.color", context => new cm.Xyz(this.computeXyz(context), illuminantE), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`Color(${xyz}, illuminant2_E, ${xyz})`}),
        }),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.singleWavelength(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")]
          .map(comp => comp * this.powerSocket.inValue(context)) as Vec3;
    }

    webglBaseVariables(): WebglVariables {
      const {wavelength, power} = WavelengthNode.inputSlots;
      const {xyz} = WavelengthNode.outputSlots;

      const arrayName = this.datasetSocket.fieldValue === "2deg"
          ? "cmf2"
          : "cmf10";

      return WebglVariables.templateConcat`vec3 ${xyz} = ${arrayName}[int(round(${wavelength})) - 360] * ${power};`({
        node: this,
      });
    }
  }

  export class BlackbodyNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "blackbody";

    private readonly inSocket: InSocket<SocketType.Float>;
    private readonly datasetSocket: InSocket<SocketType.Dropdown>;

    constructor() {
      super();

      const {temperature} = BlackbodyNode.inputSlots;
      const {xyz} = BlackbodyNode.outputSlots;

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Float, "label.socket.blackbody.temperature", {
          sliderProps: {
            hasBounds: false,
            unboundedChangePerPixel: 10,
          },
          defaultValue: 1750,
          webglOutputMapping: {[webglOuts.val]: temperature},
        })),
        (this.datasetSocket = new InSocket(this, SocketType.Dropdown, "label.socket.cmfDataset", {
          showSocket: false,
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "label.cmfDataset.2deg"},
            {value: "10deg", text: "label.cmfDataset.10deg"},
          ],
        })),
      );
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.xyz", context => this.computeXyz(context), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(xyz)}),
        }),
        new OutSocket(this, SocketType.ColorComponents, "label.socket.color", context => new cm.Xyz(this.computeXyz(context), illuminantE), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`Color(${xyz}, illuminant2_E, ${xyz})`}),
        }),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as Vec3;
    }

    private static readonly inputSlots = WebglSlot.ins("temperature");
    private static readonly outputSlots = WebglSlot.outs("xyz");

    webglBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {temperature} = BlackbodyNode.inputSlots;
      const {xyz} = BlackbodyNode.outputSlots;

      const funcName = this.datasetSocket.fieldValue === "2deg"
          ? "blackbodyTemp2ToXyz"
          : "blackbodyTemp10ToXyz";

      return WebglVariables.templateConcat`vec3 ${xyz} = ${funcName}(${temperature});`({
        node: this,
      });
    }
  }

  export class StandardIlluminantNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "standardIlluminant";

    private readonly whitePointSocket: InSocket<SocketType.Dropdown>;

    private static readonly outputSlots = WebglSlot.outs("xyz", "xyy");

    constructor() {
      super();

      const {xyz, xyy} = StandardIlluminantNode.outputSlots;

      this.ins.push(
        (this.whitePointSocket = new InSocket(this, SocketType.Dropdown, "label.socket.illuminant", whitePointSocketOptions)),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.xyz", context => [...cm.Xyz.from(this.getIlluminant(context))] as Vec3, {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(xyz)}),
        }),
        new OutSocket(this, SocketType.Vector, "label.xyy", context => [...cm.Xyy.from(this.getIlluminant(context))] as Vec3, {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(xyy)}),
        }),
        new OutSocket(this, SocketType.ColorComponents, "label.socket.color", context => cm.Xyz.from(this.getIlluminant(context)), {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`Color(${xyz}, illuminant2_E, ${xyz})`}),
        }),
      );
    }

    private getIlluminant(context: NodeEvalContext) {
      return getIlluminant(this.whitePointSocket, context);
    }

    webglBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {xyz, xyy} = StandardIlluminantNode.outputSlots;
      
      return WebglVariables.empty({
        node: this,
        preludeTemplate: WebglTemplate.source`uniform vec3 ${xyz};
uniform vec3 ${xyy};`,
        uniforms: new Map([
          [WebglTemplate.slot(xyz), {
            set: (gl, unif) => {
              const illuminant = getIlluminant(this.whitePointSocket, context);
              gl.uniform3fv(unif, cm.Xyz.from(illuminant));
            },
            dependencySockets: [this.whitePointSocket],
            dependencyNodes: [],
          }],
          [WebglTemplate.slot(xyy), {
            set: (gl, unif) => {
              const illuminant = getIlluminant(this.whitePointSocket, context);
              gl.uniform3fv(unif, cm.Xyy.from(illuminant));
            },
            dependencySockets: [this.whitePointSocket],
            dependencyNodes: [],
          }],
        ]),
      });
    }
  }
}