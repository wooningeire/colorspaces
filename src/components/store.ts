import {ref, reactive} from "vue";

import {Tree, Node} from "@/models/Node";
import {models, spaces, externals} from "@/models/nodetypes";
import * as cm from "@/models/colormanagement";


//#region Node tree
export const tree = reactive(new Tree());

//#region Node tree nodes setup
export interface DeviceNodes {
	transformNode: externals.DeviceTransformNode;
	postprocessingNode: externals.DevicePostprocessingNode;
	environmentNode: externals.EnvironmentNode;
	visionNode: externals.VisionNode;
}


export const deviceNodes = reactive(<DeviceNodes>{});
const dn = deviceNodes;
[
	new spaces.SrgbNode().setPos([450, 50]),
	(dn.transformNode = new externals.DeviceTransformNode().setPos([1000, 100])),
	(dn.postprocessingNode = new externals.DevicePostprocessingNode().setPos([1200, 100])),
	(dn.environmentNode = new externals.EnvironmentNode().setPos([1200, 250])),
	(dn.visionNode = new externals.VisionNode().setPos([1200, 400])),
].forEach(tree.nodes.add, tree.nodes);

tree.linkSockets(dn.transformNode.outs[0], dn.postprocessingNode.ins[0]);
tree.linkSockets(dn.postprocessingNode.outs[0], dn.environmentNode.ins[0]);
tree.linkSockets(dn.environmentNode.outs[0], dn.visionNode.ins[0]);
//#endregion
//#endregion

export const selectedNodes = reactive(new Set<Node>());


//#region Modifier keys
export const modifierKeys = reactive({
	ctrl: false,
	shift: false,
	alt: false,
	meta: false,
});

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
export const isDraggingNodeFromNodeTray = ref(false);
export const currentlyDraggedNodeConstructor = ref(null as any as new <T extends Node>() => T);
//#endregion


//#region Global settings
export const settings = <{
	deviceSpace: typeof cm.Col,
}>{
	deviceSpace: cm.Srgb,
};
//#endregion


//#region Tooltip
export const tooltipData = reactive({
	text: "",
	visible: false,
	pos: {},

	showTooltip(text: string, pos: object) {
		this.text = text;
		this.visible = true;
		this.pos = pos;
	},

	hideTooltip() {
		this.text = "";
		this.visible = false;
		this.pos = {};
	},
});
//#endregion

export class SocketHitbox extends HTMLElement {

}