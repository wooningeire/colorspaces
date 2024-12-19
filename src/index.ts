import { mount } from 'svelte';
import Root from './components/Root.svelte';
import "./index.scss";

const app = mount(Root, {
    target: document.querySelector("main")!,
});

export default app;

// const colourWorker = new Worker(new URL("./pyodide-worker/index.ts", import.meta.url), {type: "module"});
// colourWorker.addEventListener("message", console.log);