// import {pyodide, colour} from "./load_colour";

// Workaround due to error in Vite: https://github.com/rwasm/vite-plugin-rsw/issues/25#issuecomment-1049274571=
// @ts-ignore
globalThis.HTMLElement = class {};
// @ts-ignore
globalThis.customElements = {get() {return [];}};
// @ts-ignore
globalThis.document = {querySelectorAll() {return {length: 0};}};

const {pyodide, colour} = await import("./load-colour");

const list = (...elements: any[]) => pyodide.globals.get("list")(elements);

postMessage(colour.XYZ_to_Lab(list(1, 2, 3)).toJs().toString());

export default undefined;