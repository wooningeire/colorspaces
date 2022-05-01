export type Vec2 = [number, number];

export const qs = (selector: string, context: Element | Document | DocumentFragment=document) => context.querySelector(selector);