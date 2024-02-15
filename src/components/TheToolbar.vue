<script lang="ts" setup>
import { Tree } from "@/models/Node";
import {tree, selectedNodes} from "./store";
import {downloadNodeTree, importNodeTree} from "@/file-management/node-tree-io";
import { ref } from "vue";

const deleteSelectedNodes = () => {
  selectedNodes.forEach(node => {
    if (!node.canMove) return;
    tree.deleteNode(node);
  });
};

addEventListener("keydown", event => {
  if (!["delete","backspace"].includes(event.key.toLowerCase())) return;
  deleteSelectedNodes();
});

const fileSelector = ref<HTMLInputElement | null>(null);
const onFileSelectorChange = () => {
  if (!fileSelector.value?.files?.length) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    importNodeTree(tree as Tree, reader.result as string);
  });
  reader.readAsText(fileSelector.value!.files[0]);
};
</script>

<template>
  <div class="toolbar">
    <button @click="deleteSelectedNodes">Delete selected nodes</button>
    <button @click="downloadNodeTree(tree as Tree)">Export node tree</button>
    <button @click="fileSelector!.click">Import node tree</button>
  </div>
  <input type="file"
      ref="fileSelector"
      @change="onFileSelectorChange" />
</template>

<style lang="scss">
.toolbar {
  margin: 0 1em;
  // height: 100%;

  display: flex;
  align-self: start;
  flex-flow: column;
  box-shadow: 0 4px 40px #0000003f;

  z-index: 1;

  background: #000000cf;
  border-radius: 0.5em;
  overflow: hidden;

  button {
    padding: 0.5em;
    position: relative;

    border-radius: 0;
    background: none;

    &:hover {
      background: #ffffff3f;
      color: #fff;
    }

    + button::before {
      content: " ";
      background: #3f3f3f;
      position: absolute;
      top: -1px;
      left: 1em;
      right: 1em;
      height: 2px;
    }
  }

  + input {
    display: none;
  }
}
</style>