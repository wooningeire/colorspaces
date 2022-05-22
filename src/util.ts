export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Color = Vec3;

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


export const clearTextSelection = () => {
	getSelection()?.removeAllRanges();
};


export const pipe = (...fns: Function[]) =>
		(...args: any[]) =>
				fns.reduce((currentValue: any, fn: Function) => [fn(...currentValue)], args);

export const curry = null;


export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;