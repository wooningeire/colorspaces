import { Node, SocketType, SocketFlag, NodeEvalContext, OutputDisplayType, InSocket, OutSocket, webglOuts } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";

import { Vec3 } from "@/util";
import { illuminantE } from "../colormanagement/spaces/col-xyz-xyy-illuminants";
import { getIlluminant, whitePointSocketOptions } from "./spaces";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace models {
  //TODO code duplication
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

  enum RgbMode {
    ToRgb = "to rgb",
    FromRgb = "from rgb",
  }
  export class HslNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "hsl";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    private static readonly inputSlots = WebglSlot.ins("hue", "saturation", "lightness", "rgb");

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => {
          const {hue, saturation, lightness} = HslNode.inputSlots;

          return [
            new InSocket(node, SocketType.Float, "Hue", {webglOutputMapping: {[webglOuts.val]: hue}}).flag(SocketFlag.Hue),
            new InSocket(node, SocketType.Float, "Saturation", {webglOutputMapping: {[webglOuts.val]: saturation}}),
            new InSocket(node, SocketType.Float, "Lightness", {webglOutputMapping: {[webglOuts.val]: lightness}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Vector, "RGB", context => cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Vec3) as Vec3),
        ],
        (ins, outs, context) => ({
          values: cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => {
          const {hue, saturation, lightness} = HslNode.inputSlots;
          
          return WebglVariables.template``({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`hslToRgb(${hue}, ${saturation}, ${lightness})`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.source`hslToRgb(${hue}, ${saturation}, ${lightness})`},
          });
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => {
          const {rgb} = HslNode.inputSlots;
          return [
            new InSocket(node, SocketType.Vector, "RGB", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Hue", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, SocketType.Float, "Saturation", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, SocketType.Float, "Lightness", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHsl(ins[0].inValue(context) as Vec3),
          labels: ["H", "S", "L"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => {
          const {rgb} = HslNode.inputSlots;

          const hsl = WebglSlot.out("hsl");

          return WebglVariables.template`vec3 ${hsl} = rgbToHsl(${rgb});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`${hsl}.x`}],
              [outs[1], {[webglOuts.val]: WebglTemplate.source`${hsl}.y`}],
              [outs[2], {[webglOuts.val]: WebglTemplate.source`${hsl}.z`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(hsl)},
          });
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }
  }

  export class HsvNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "hsv";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    private static readonly inputSlots = WebglSlot.ins("hue", "saturation", "value", "rgb");

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => {
          const {hue, saturation, value} = HsvNode.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "Hue", {webglOutputMapping: {[webglOuts.val]: hue}}).flag(SocketFlag.Hue),
            new InSocket(node, SocketType.Float, "Saturation", {webglOutputMapping: {[webglOuts.val]: saturation}}),
            new InSocket(node, SocketType.Float, "Value", {webglOutputMapping: {[webglOuts.val]: value}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Vector, "RGB", context => cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => {
          const {hue, saturation, value} = HsvNode.inputSlots;
          
          return WebglVariables.template``({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`hsvToRgb(${hue}, ${saturation}, ${value})`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.source`hsvToRgb(${hue}, ${saturation}, ${value})`},
          });
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => {
          const {rgb} = HsvNode.inputSlots;
          return [
            new InSocket(node, SocketType.Vector, "RGB", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Hue", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, SocketType.Float, "Saturation", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, SocketType.Float, "Value", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHsv(ins[0].inValue(context) as Vec3),
          labels: ["H", "S", "V"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => {
          const hsv = WebglSlot.out("hsv");

          return WebglVariables.template`vec3 {0:hsv} = rgbToHsv({rgb});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`${hsv}.x`}],
              [outs[1], {[webglOuts.val]: WebglTemplate.source`${hsv}.y`}],
              [outs[2], {[webglOuts.val]: WebglTemplate.source`${hsv}.z`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(hsv)},
          });
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }
  }

  export class HwbNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "hwb";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    private static readonly inputSlots = WebglSlot.ins("hue", "whiteness", "blackness", "rgb");

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => {
          const {hue, whiteness, blackness} = HwbNode.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "Hue", {webglOutputMapping: {[webglOuts.val]: hue}}).flag(SocketFlag.Hue),
            new InSocket(node, SocketType.Float, "Whiteness", {webglOutputMapping: {[webglOuts.val]: whiteness}}),
            new InSocket(node, SocketType.Float, "Blackness", {webglOutputMapping: {[webglOuts.val]: blackness}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Vector, "RGB", context => cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => {
          const {hue, whiteness, blackness} = HwbNode.inputSlots;

          return WebglVariables.template``({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`hsvToRgb(${hue}, ${whiteness}, ${blackness})`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.source`hsvToRgb(${hue}, ${whiteness}, ${blackness})`},
          });
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => {
          const {rgb} = HwbNode.inputSlots;
          return [
            new InSocket(node, SocketType.Vector, "RGB", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Hue", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, SocketType.Float, "Whiteness", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, SocketType.Float, "Blackness", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHwb(ins[0].inValue(context) as Vec3),
          labels: ["H", "W", "B"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => {
          const hwb = WebglSlot.out("hwb");

          const {rgb} = HwbNode.inputSlots;
          
          return WebglVariables.template`vec3 ${hwb} = rgbToHsl(${rgb});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`${hwb}.x`}],
              [outs[1], {[webglOuts.val]: WebglTemplate.source`${hwb}.y`}],
              [outs[2], {[webglOuts.val]: WebglTemplate.source`${hwb}.z`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(hwb)},
          });
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }
  }

  export class CmyNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cmy";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    private static readonly inputSlots = WebglSlot.ins("cyan", "yellow", "magenta", "rgb");

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => {
          const {cyan, magenta, yellow} = CmyNode.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "Cyan", {webglOutputMapping: {[webglOuts.val]: cyan}}).flag(SocketFlag.Rgb),
            new InSocket(node, SocketType.Float, "Magenta", {webglOutputMapping: {[webglOuts.val]: magenta}}).flag(SocketFlag.Rgb),
            new InSocket(node, SocketType.Float, "Yellow", {webglOutputMapping: {[webglOuts.val]: yellow}}).flag(SocketFlag.Rgb),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Vector, "RGB", context => cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => {
          const {cyan, magenta, yellow} = CmyNode.inputSlots;

          return WebglVariables.template``({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`cmyToRgb(${cyan}, ${magenta}, ${yellow})`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.source`cmyToRgb(${cyan}, ${magenta}, ${yellow})`},
          });
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => {
          const {rgb} = CmyNode.inputSlots;
          return [
            new InSocket(node, SocketType.Vector, "RGB", {webglOutputMapping: {[webglOuts.val]: rgb}}),
          ];
        },
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Cyan", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Rgb),
          new OutSocket(node, SocketType.Float, "Magenta", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[1]).flag(SocketFlag.Rgb),
          new OutSocket(node, SocketType.Float, "Yellow", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[2]).flag(SocketFlag.Rgb),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToCmy(ins[0].inValue(context) as Vec3),
          labels: ["C", "M", "Y"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => {
          const {rgb} = CmyNode.inputSlots;

          const cmy = WebglSlot.out("cmy");
          
          return WebglVariables.template`vec3 ${cmy} = rgbToCmy(${rgb});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.source`${cmy}.x`}],
              [outs[1], {[webglOuts.val]: WebglTemplate.source`${cmy}.y`}],
              [outs[2], {[webglOuts.val]: WebglTemplate.source`${cmy}.z`}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(cmy)},
          });
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }
  }

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
      this.width = 503;
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