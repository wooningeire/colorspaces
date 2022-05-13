import {createApp} from "vue";
import Root from "./components/Root.vue";

import "./pyodide/index";

const app = createApp(Root);
app.mount("main");