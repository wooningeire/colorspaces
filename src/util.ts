export type Vec2 = [number, number];
type Vec3 = [number, number, number];
export type Color = Vec3;

type Rgb = Vec3;
type Srgb = Vec3;
type LinearSrgb = Vec3;
type Xyz = Vec3;
type Xyy = Vec3;
type Xy = Vec2;

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


export type ModifierKeys = {
	shift: boolean,
	ctrl: boolean,
	alt: boolean,
	meta: boolean,
};