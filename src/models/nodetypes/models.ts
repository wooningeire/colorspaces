import { Node, SocketType, SocketFlag, NodeEvalContext, OutputDisplayType, InSocket, OutSocket, webglOuts, Socket } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";

import { Vec3 } from "@/util";
import { illuminantE } from "../colormanagement/spaces/col-xyz-xyy-illuminants";
import { getIlluminant, whitePointSocketOptions } from "./spaces";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace models {
  export class RgbNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rgb";

    private static readonly inputSlots = WebglSlot.ins("red", "green", "blue");

    constructor() {
      super();

      const {red, green, blue} = RgbNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Float, "Red", {webglOutputMapping: {[webglOuts.val]: red}}).flag(SocketFlag.Rgb),
        new InSocket(this, SocketType.Float, "Green", {webglOutputMapping: {[webglOuts.val]: green}}).flag(SocketFlag.Rgb),
        new InSocket(this, SocketType.Float, "Blue", {webglOutputMapping: {[webglOuts.val]: blue}}).flag(SocketFlag.Rgb),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "RGB", context => this.ins.map(socket => socket.inValue(context)) as Vec3),
      );
    }

    displayValues(context: NodeEvalContext): Vec3 {
      return this.ins.map(socket => socket.inValue(context)) as Vec3;
    }

    webglGetBaseVariables(): WebglVariables {
      const {red, green, blue} = RgbNode.inputSlots;

      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.source`vec3(${red}, ${green}, ${blue})`}],
        ])
      });
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
  
  const createRgbNodeType = ({
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

    socketLabels: string[],
    nodeDisplayLabels: string[],
    socketFlags?: SocketFlag[],

    toRgb: Conversion,
    fromRgb: Conversion,
  }) => {
    const inputSlots = WebglSlot.ins("x", "y", "z");
    const {x, y, z} = inputSlots;
    const toRgbOutputMapping = {[webglOuts.val]: WebglTemplate.concat`${toRgb.webglConversionFunction}(vec3(${x}, ${y}, ${z}))`};
  
    const rgb = WebglSlot.in("rgb");
    const internal = WebglSlot.out("internal");

    return class extends NodeWithOverloads<RgbOverloadMode> {
      static readonly TYPE = Symbol(name);
      static readonly id = id;
      static readonly outputDisplayType = outputDisplayType;
  
      static readonly overloadGroup = new OverloadGroup(new Map<RgbOverloadMode, Overload>([
        [RgbOverloadMode.ToRgb, new Overload(
          "To RGB",
          node => Object.values(inputSlots).map(
            (slot, i) => 
                new InSocket(node, SocketType.Float, socketLabels[i], {webglOutputMapping: {[webglOuts.val]: slot}}).flag(socketFlags[i]),
          ),
          (node, ins) => [
            new OutSocket(node, SocketType.Vector, "RGB", context => toRgb.convert(ins.map(socket => socket.inValue(context)) as Vec3) as Vec3),
          ],
          (ins, outs, context) => ({
            values: toRgb.convert(ins.map(socket => socket.inValue(context)) as Vec3),
            labels: ["R", "G", "B"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          }),
          (ins, outs, context) => WebglVariables.template``({
            socketOutVariables: new Map([
              [outs[0], toRgbOutputMapping],
            ]),
            nodeOutVariables: toRgbOutputMapping,
          }),
        )],
  
        [RgbOverloadMode.FromRgb, new Overload(
          "From RGB",
          node => [
            new InSocket(node, SocketType.Vector, "RGB", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ],
          (node, ins) => Object.values(inputSlots).map(
            (slot, i) => 
                new OutSocket(node, SocketType.Float, socketLabels[i], context => fromRgb.convert(ins[0].inValue(context) as Vec3)[i]).flag(socketFlags[i])
          ),
          (ins, outs, context) => ({
            values: fromRgb.convert(ins[0].inValue(context) as Vec3),
            labels: nodeDisplayLabels,
            flags: socketFlags,
          }),
          (ins, outs, context) => WebglVariables.templateConcat`vec3 ${internal} = ${fromRgb.webglConversionFunction}(${rgb});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`${internal}.x`}],
              [outs[1], {[webglOuts.val]: WebglTemplate.source`${internal}.y`}],
              [outs[2], {[webglOuts.val]: WebglTemplate.source`${internal}.z`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(internal)},
          }),
        )],
      ]));

      constructor() {
        super(RgbOverloadMode.ToRgb);
      }
    }
  };

  export const HslNode = createRgbNodeType({
    name: "HslNode",
    id: "hsl",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["Hue", "Saturation", "Lightness"],
    nodeDisplayLabels: ["H", "S", "L"],
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

  export const HsvNode = createRgbNodeType({
    name: "HsvNode",
    id: "hsv",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["Hue", "Saturation", "Value"],
    nodeDisplayLabels: ["H", "S", "V"],
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

  export const HwbNode = createRgbNodeType({
    name: "HwbNode",
    id: "hwb",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["Hue", "Whiteness", "Blackness"],
    nodeDisplayLabels: ["H", "W", "B"],
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

  export const CmyNode = createRgbNodeType({
    name: "CmyNode",
    id: "cmy",
    outputDisplayType: OutputDisplayType.Vec,

    socketLabels: ["Cyan", "Magenta", "Yellow"],
    nodeDisplayLabels: ["C", "M", "Y"],
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

  export class SpectralPowerDistributionNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "spectralPowerDistribution";

    width = 503;

    distribution: number[] =
      Array(830 - 360 + 1).fill(0)
          .map((_, x) => Math.exp(-(((x - 235) / 90)**2)));

    colorMatchingDataset: "2deg" | "10deg" = "2deg";

    constructor() {
      super();
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "XYZ", context => this.computeXyz()),
        new OutSocket(this, SocketType.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(), illuminantE)),
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

    webglGetBaseVariables(): WebglVariables {
      const unif = WebglSlot.out("unif");

      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.slot(unif)}],
          [this.outs[1], {
            [webglOuts.val]: WebglTemplate.slot(unif),
            [webglOuts.illuminant]: WebglTemplate.string("illuminant2_E"),
            [webglOuts.xyz]: WebglTemplate.slot(unif),
          }],
        ]),
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

    constructor() {
      super();
      
      const {wavelength, power} = WavelengthNode.inputSlots;

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Float, "Wavelength (nm)", {
          sliderProps: {
            softMin: 360,
            softMax: 830,
            step: 1,
          },
          defaultValue: 510,
          webglOutputMapping: {[webglOuts.val]: wavelength},
        })),
        (this.powerSocket = new InSocket(this, SocketType.Float, "Relative power", {
          sliderProps: {
            hasBounds: false,
          },
          defaultValue: 1,
          webglOutputMapping: {[webglOuts.val]: power},
        })),
        (this.datasetSocket = new InSocket(this, SocketType.Dropdown, "Dataset", {
          showSocket: false,
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "CIE 2° observer (1931)"},
            {value: "10deg", text: "CIE 10° observer (1964)"},
          ],
          valueChangeRequiresShaderReload: true,
        })),
      );
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "XYZ", context => this.computeXyz(context)),
        new OutSocket(this, SocketType.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(context), illuminantE)),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.singleWavelength(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")]
          .map(comp => comp * this.powerSocket.inValue(context)) as Vec3;
    }

    private static readonly inputSlots = WebglSlot.ins("wavelength", "power");

    webglGetBaseVariables(): WebglVariables {
      const xyz = WebglSlot.out("xyz");

      const {wavelength, power} = WavelengthNode.inputSlots;

      const arrayName = this.datasetSocket.fieldValue === "2deg"
          ? "cmf2"
          : "cmf10";

      return WebglVariables.templateConcat`vec3 ${xyz} = ${arrayName}[int(round(${wavelength})) - 360] * ${power};`({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.slot(xyz)}],
          [this.outs[1], {
            [webglOuts.val]: WebglTemplate.slot(xyz),
            [webglOuts.illuminant]: WebglTemplate.string("illuminant2_E"),
            [webglOuts.xyz]: WebglTemplate.slot(xyz),
          }],
        ]),
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

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Float, "Temperature (K)", {
          sliderProps: {
            hasBounds: false,
            unboundedChangePerPixel: 10,
          },
          defaultValue: 1750,
          webglOutputMapping: {[webglOuts.val]: temperature},
        })),
        (this.datasetSocket = new InSocket(this, SocketType.Dropdown, "Dataset", {
          showSocket: false,
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "CIE 2° observer (1931)"},
            {value: "10deg", text: "CIE 10° observer (1964)"},
          ],
        })),
      );
      
      this.outs.push(
        new OutSocket(this, SocketType.Vector, "XYZ", context => this.computeXyz(context)),
        new OutSocket(this, SocketType.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(context), illuminantE)),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as Vec3;
    }

    private static readonly inputSlots = WebglSlot.ins("temperature");

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {temperature} = BlackbodyNode.inputSlots;
      const xyz = WebglSlot.out("xyz");

      const funcName = this.datasetSocket.fieldValue === "2deg"
          ? "blackbodyTemp2ToXyz"
          : "blackbodyTemp10ToXyz";

      return WebglVariables.templateConcat`vec3 ${xyz} = ${funcName}(${temperature});`({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.slot(xyz)}],
          [this.outs[1], {
            [webglOuts.val]: WebglTemplate.slot(xyz),
            [webglOuts.illuminant]: WebglTemplate.string("illuminant2_E"),
            [webglOuts.xyz]: WebglTemplate.slot(xyz),
          }],
        ]),
      });
    }
  }

  export class StandardIlluminantNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "standardIlluminant";

    private readonly whitePointSocket: InSocket<SocketType.Dropdown>;

    constructor() {
      super();

      this.ins.push(
        (this.whitePointSocket = new InSocket(this, SocketType.Dropdown, "White point", whitePointSocketOptions)),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "XYZ", context => [...cm.Xyz.from(this.getIlluminant(context))] as Vec3),
        new OutSocket(this, SocketType.Vector, "xyY", context => [...cm.Xyy.from(this.getIlluminant(context))] as Vec3),
        new OutSocket(this, SocketType.ColorCoords, "Color", context => cm.Xyz.from(this.getIlluminant(context))),
      );
    }

    private getIlluminant(context: NodeEvalContext) {
      return getIlluminant(this.whitePointSocket, context);
    }

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {xyz, xyy} = WebglSlot.outs("xyz", "xyy");
      
      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.slot(xyz)}],
          [this.outs[1], {[webglOuts.val]: WebglTemplate.slot(xyy)}],
          [this.outs[2], {
            [webglOuts.val]: WebglTemplate.slot(xyz),
            [webglOuts.illuminant]: WebglTemplate.string("illuminant2_E"),
            [webglOuts.xyz]: WebglTemplate.slot(xyz),
          }],
        ]),
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