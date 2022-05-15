import {createApp} from "vue";
import Root from "./components/Root.vue";

const app = createApp(Root);
app.config.unwrapInjectedRef = true; // https://vuejs.org/guide/components/provide-inject.html#working-with-reactivity
app.mount("main");

// const colourWorker = new Worker(new URL("./pyodide-worker/index.ts", import.meta.url), {type: "module"});
// colourWorker.addEventListener("message", console.log);