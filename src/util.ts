export type Vec2 = [number, number];
export type Color = [number, number, number];

export const qs = (selector: string, context: Element | Document | DocumentFragment=document) => context.querySelector(selector);

export class Listen {
	private constructor(
		readonly target: EventTarget,
		readonly type: string,
		readonly handler: EventListener,
		readonly options: AddEventListenerOptions,
	) {}
	
	static for(target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions) {
		target.addEventListener(type, handler, options);
		return new this(target, type, handler, options);
	}

	detach() {
		this.target.removeEventListener(this.type, this.handler, this.options);
	}
}