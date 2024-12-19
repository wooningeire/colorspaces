<script lang="ts">
// import TheNodeTree from "./TheNodeTree.vue";
// import TheNodeTray from "./TheNodeTray.vue";
// import TheToolbar from "./TheToolbar.vue";
// import TheSettingsPanel from "./TheSettingsPanel.vue";

import {Node, NodeUpdateSource} from "$/node/";

import {type Vec2} from "$/util";

import {tree, tooltipController, errorPopupController} from "./store.svelte";
// import ObjectTooltip from "./ObjectTooltip.vue";
// import ErrorPopup from "./ErrorPopup.vue";


// let treeVue = $state<TheNodeTree | null>(null);
let nodeTreeCentererEl = $state<HTMLDivElement | null>(null);


let viewportPos = $state([0, 0]);
let viewportScale = $state(1);
const screenToViewport = (screenPos: number[]) => screenPos.map((coord, i) => (coord / viewportScale - viewportPos[i]));
// provide("treeViewportPos", viewportPos);
// provide("treeViewportScale", viewportScale);
// provide("screenToViewport", screenToViewport);


const addNode = <T extends Node>(
  nodeConstructor: new () => T,
  screenPos: Vec2=[
    nodeTreeCentererEl!.offsetLeft + nodeTreeCentererEl!.offsetWidth / 2,
    nodeTreeCentererEl!.offsetTop + nodeTreeCentererEl!.offsetHeight / 2,
  ] as Vec2
) => {
  const node = new nodeConstructor().setPos(screenToViewport(screenPos) as Vec2);
  tree.nodes.add(node);
  // treeVue.value!.selectNode(node);
};
</script>

<!--
<TheNodeTree
  bind:this={treeVue}
  on:add-node={addNode}
/>
<div
  class="node-tree-centerer"
  bind:this={nodeTreeCentererEl}
></div>
<TheNodeTray on:add-node={addNode} />

<TheToolbar on:delete-node={() => treeVue?.reloadOutputs(true, NodeUpdateSource.TreeReload)} />

<div class="tooltips">
  <ObjectTooltip
    text={tooltipController.text}
    pos={tooltipController.pos}
  />
</div>
<ErrorPopup text={errorPopupController.text} />

<TheSettingsPanel /> -->
