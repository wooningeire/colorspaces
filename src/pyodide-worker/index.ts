// import {pyodide, colour} from "./load_colour";

// Workaround due to error in Vite: https://github.com/rwasm/vite-plugin-rsw/issues/25#issuecomment-1049274571=
// @ts-ignore
globalThis.HTMLElement = class {};
// @ts-ignore
globalThis.customElements = {get() {return [];}};

const {pyodide, colour} = await import("./load-colour");

postMessage(colour.XYZ_to_Lab(pyodide.runPython("[1,2,3]")).toJs().toString());

export default undefined;