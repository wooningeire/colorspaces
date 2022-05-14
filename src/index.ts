import {createApp} from "vue";
import Root from "./components/Root.vue";

createApp(Root).mount("main");

// const colourWorker = new Worker(new URL("./pyodide-worker/index.ts", import.meta.url), {type: "module"});
// colourWorker.addEventListener("message", console.log);