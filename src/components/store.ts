import {ref, reactive} from "vue";

import {Tree, Node} from "@/models/Node";

export const tree = reactive(new Tree());

export const isDraggingNodeFromNodeTray = ref(false);
export const currentlyDraggedNodeConstructor = ref(null as any as new <T extends Node>() => T);