export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

enum ColorType {
  Rgb,
  Hsl,
  Hsv,
  Cmy,
  Srgb,
  LinearSrgb,
  Xyz,
  Xyy,
  Xy,
}
const Ct = ColorType;

type ColorData<Ct extends ColorType> =
    Ct extends ColorType.Xy ? Vec2 : Vec3;

const Col = <Ct extends ColorType>(data: ColorData<Ct>, type: Ct) => ({data, type});
type Col<Ct extends ColorType> = ReturnType<typeof Col>;

const convert = (col: Col<ColorType.Rgb>, targetType: ColorType) => {

};



/**
 * querySelector shorthand
 */
export const qs = (selector: string, context: Element | Document | DocumentFragment=document) => context.querySelector(selector);


type Handler = (event: any) => void; //TypeScript workaround

export class Listen {
  private constructor(
    readonly target: EventTarget,
    readonly type: string,
    readonly handler: Handler, //EventListener,
    readonly options?: AddEventListenerOptions,
  ) {}
  
  static for(target: EventTarget, type: string, handler: Handler /* EventListener */, options?: AddEventListenerOptions) {
    target.addEventListener(type, handler, options);
    return new this(target, type, handler, options);
  }

  detach() {
    this.target.removeEventListener(this.type, this.handler, this.options);
  }
}


export const mod = (a: number, b: number) => (a % b + b) % b;
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));


export const clearTextSelection = () => {
  getSelection()?.removeAllRanges();
};


export const pipe = (...fns: Function[]) =>
    (...args: any[]) =>
        fns.reduce((currentValue: any, fn: Function) => [fn(...currentValue)], args);

export class Option<T> {
  static readonly None = new Option(null) as Option<any>;
  
  static Some<T>(value: T) {
    return new Option(value);
  }

  private constructor(private value: T) {}

  getElse(alt: T): T {
    return this === Option.None ? alt : this.value;
  }
}


export const to255 = (channel: number) => Math.round(clamp(channel, 0, 1) * 255);
export const toHex = (channel: number) => to255(channel).toString(16).padStart(2, "0");
export const toHex3 = (channel: number) => Math.round(clamp(channel, 0, 1) * 15).toString(16);


const matrixDotVector3 = (matrix: number[][], vector: number[]) => [
  matrix[0][0]*vector[0] + matrix[0][1]*vector[1] + matrix[0][2] * vector[2],
  matrix[1][0]*vector[0] + matrix[1][1]*vector[1] + matrix[1][2] * vector[2],
  matrix[2][0]*vector[0] + matrix[2][1]*vector[1] + matrix[2][2] * vector[2],
];


export const assert = (value: boolean) => {
  if (!value) {
    throw new Error("assertion failed");
  }
};