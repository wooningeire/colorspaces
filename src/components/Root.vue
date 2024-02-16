<script lang="ts" setup>
import {ref, reactive, onMounted, provide, Ref} from "vue";

import TheNodeTree from "./TheNodeTree.vue";
import TheNodeTray from "./TheNodeTray.vue";
import TheToolbar from "./TheToolbar.vue";
import TheSettingsPanel from "./TheSettingsPanel.vue";

import {Node} from "@/models/Node";

import {Vec2} from "@/util";

import {tree, tooltipController, errorPopupController} from "./store";
import ObjectTooltip from "./ObjectTooltip.vue";
import ErrorPopup from "./ErrorPopup.vue";


const treeVue = ref(null as InstanceType<typeof TheNodeTree> | null);
const nodeTreeCentererEl = ref<HTMLDivElement | null>(null);


const viewportPos = reactive([0, 0]);
const viewportScale = ref(1);
const screenToViewport = (screenPos: number[]) => screenPos.map((coord, i) => (coord / viewportScale.value - viewportPos[i]));
provide("treeViewportPos", viewportPos);
provide("treeViewportScale", viewportScale);
provide("screenToViewport", screenToViewport);


const addNode = <T extends Node>(
  nodeConstructor: new () => T,
  screenPos: Vec2=[
    nodeTreeCentererEl.value!.offsetLeft + nodeTreeCentererEl.value!.offsetWidth / 2,
    nodeTreeCentererEl.value!.offsetTop + nodeTreeCentererEl.value!.offsetHeight / 2,
  ] as Vec2
) => {
  const node = new nodeConstructor().setPos(screenToViewport(screenPos) as Vec2);
  tree.nodes.add(node);
  treeVue.value!.selectNode(node);
};
</script>

<template>
  <TheNodeTree ref="treeVue"
      @add-node="addNode" />
  <div class="node-tree-centerer"
      ref="nodeTreeCentererEl"></div>
  <TheNodeTray @add-node="addNode" />

  <TheToolbar />

  <div class="tooltips">
    <ObjectTooltip :text="tooltipController.text"
        :pos="tooltipController.pos" />
  </div>
  <ErrorPopup :text="errorPopupController.text" />

  <TheSettingsPanel />
</template>

<style lang="scss">
* {
  box-sizing: border-box;
}

:root {
  --node-border-color: #ffffff3f;
  --col-invalid-input: #f57;

  --font-mono: Ubunto Mono, monospace;
}

body {
  margin: 0;
  font-family: Atkinson Hyperlegible, Overpass, sans-serif;
  font-weight: 300;
  overscroll-behavior: none;
}

input,
button,
select {
  font-family: inherit;
}
div {
  user-select: none;
}

main {
  width: 100vw;
  height: 100vh;
  display: grid;
  align-items: center;
  grid-template-rows: 1fr max(20vh, 18em);
  grid-template-columns: 8em 1fr auto;

  --grid-size: 16px;

  background:
      linear-gradient(0deg, #0000000f 2px, #0000 2px),
      linear-gradient(90deg, #0000000f 2px, #0000 2px),
      radial-gradient(circle, #4a514e, #2f3432 80%, #1f2321);
  background-size:
      var(--grid-size) var(--grid-size),
      var(--grid-size) var(--grid-size),
      100%;

  color: #fff;

  > .node-tree {
    grid-area: 1/1 / -1/-1;
  }

  > .node-tree-centerer {
    grid-area: 1/1 / 1/-1;
    height: 100%;
    pointer-events: none;
  }

  > .toolbar {
    grid-area: 2/1;
  }

  > .node-tray {
    grid-area: 2/2;
    z-index: 1;
  }

  > .settings-panel {
    grid-area: 2/3;
    z-index: 1;
  }

  > .tooltips {
    grid-area: 1/1 / -1/-1;
    width: 100%;
    height: 100%;
    position: absolute;
    
    pointer-events: none;

    z-index: 1;
  }
}

button {
  background: #000000cf;
  border: none;
  color: #ffffff7f;
  cursor: pointer;
  transition: all 0.1s ease;

  border-radius: 0.5em;

  &:hover {
    background: #ffffff3f;
    color: #fff;
  }
}
</style>