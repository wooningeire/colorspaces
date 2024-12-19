import {Tree, Node} from "$/node/";
import {models, spaces, externals} from "$/node-types/";
import * as cm from "$/color-management/";
import { StringKey } from "$/strings";


//#region Node tree
export const tree = $state(new Tree());

//#region Node tree nodes setup
export interface DeviceNodes {
  transformNode: externals.DeviceTransformNode;
  postprocessingNode: externals.DevicePostprocessingNode;
  environmentNode: externals.EnvironmentNode;
  visionNode: externals.VisionNode;
}


export const deviceNodes = <DeviceNodes>{};
const dn = deviceNodes;
[
  new spaces.SrgbNode().setPos([500, 250]),
  // (dn.transformNode = new externals.DeviceTransformNode().setPos([1000, 100])),
  // (dn.postprocessingNode = new externals.DevicePostprocessingNode().setPos([1200, 100])),
  // (dn.environmentNode = new externals.EnvironmentNode().setPos([1200, 250])),
  // (dn.visionNode = new externals.VisionNode().setPos([1200, 400])),
].forEach(tree.nodes.add, tree.nodes);

// tree.linkSockets(dn.transformNode.outs[0], dn.postprocessingNode.ins[0]);
// tree.linkSockets(dn.postprocessingNode.outs[0], dn.environmentNode.ins[0]);
// tree.linkSockets(dn.environmentNode.outs[0], dn.visionNode.ins[0]);
//#endregion
//#endregion

export const selectedNodes = new Set<Node>();


//#region Modifier keys
export const modifierKeys = {
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
};

const updateModifierKeys = (event: KeyboardEvent) => {
  Object.assign(modifierKeys, {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  });
};

addEventListener("keydown", updateModifierKeys);
addEventListener("keyup", updateModifierKeys);
//#endregion


//#region Dragging nodes from the node tray
export const isDraggingNodeFromNodeTray = $state(false);
export const currentlyDraggedNodeConstructor = $state(null as any as new <T extends Node>() => T);
//#endregion


//#region Global settings
export const settings = $state(<{
  deviceSpace: typeof cm.Col,
  rgbScale: number,
  hueScale: number,
  outOfGamutAlpha: number,
  imaginaryColorAlpha: number,
}>{
  deviceSpace: cm.Srgb,
  rgbScale: 1,
  hueScale: 1,
  outOfGamutAlpha: 0.25,
  imaginaryColorAlpha: 0.25,
});
//#endregion


//#region Tooltip
type Tooltip = {
  key: StringKey,
  pos: {
    left?: string,
    right?: string,
    top?: string,
    bottom?: string,
  },
};
const tooltips = new Set<Tooltip>();

export const tooltipController = $state({
  text: "",
  pos: {},

  showTooltip(text: string, pos: object) {
    this.text = text;
    this.pos = pos;
  },

  hideTooltip() {
    this.text = "";
    this.pos = {};
  },
});
//#endregion

//#region Error popup
export const errorPopupController = $state({
  text: "",

  async showPopup(text: string) {
    this.text = "";
    await Promise.resolve();
    this.text = text;
  },

  hidePopup() {
    this.text = "";
  },
})
//#endregion

export class SocketHitbox extends HTMLElement {

}