import { Tree, Node, SocketValue, Socket } from "@/models/Node";
import { images, models, math, organization, spaces, externals } from "@/models/nodetypes";
import { c } from "vitest/dist/reporters-5f784f42";

export const downloadNodeTree = (tree: Tree) => {
    const fileString = serializeNodeTree(tree);

    const blob = new Blob([fileString], {type: "text/plain"});
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nodetree.json";
    anchor.click();

    URL.revokeObjectURL(url);
};

export const importNodeTree = (tree: Tree, fileString: string) => {
    deserializeNodeTree(tree, fileString);
};


interface SerializedTree {
    nodes: SerializedNode[],
    links: SerializedLink[],
};

interface SerializedNode {
    type: string,
    socketFieldValues: Exclude<SocketValue, ImageData>[],
    pos: [number, number],
};

interface SerializedLink {
    srcNodeIndex: number,
    srcSocketIndex: number,
    dstNodeIndex: number,
    dstSocketIndex: number,
};

// TODO: handle overloads
const serializeNodeTree = (tree: Tree) => {
    const serializedTree: SerializedTree = {
        nodes: [],
        links: [],
    };

    const nodesToIndices = new Map<Node, number>();
    const socketsToIndices = new Map<Socket, number>();

    let nodeIndex = 0;
    for (const node of tree.nodes) {
        const socketFieldValues = [];

        let inSocketIndex = 0;
        for (const socket of node.ins) {
            socketFieldValues.push(socket.fieldValue);

            socketsToIndices.set(socket, inSocketIndex);

            inSocketIndex++;
        }

        let outSocketIndex = 0;
        for (const socket of node.outs) {
            socketsToIndices.set(socket, outSocketIndex);

            outSocketIndex++;
        }

        serializedTree.nodes.push({
            type: (node.constructor as typeof Node).TYPE.description!,
            socketFieldValues: node.ins.map(socket => socket.fieldValue instanceof ImageData ? "" : socket.fieldValue),
            pos: node.pos,
        });

        nodesToIndices.set(node, nodeIndex);

        nodeIndex++;
    }

    for (const link of tree.links) {
        serializedTree.links.push({
            srcNodeIndex: nodesToIndices.get(link.srcNode)!,
            srcSocketIndex: socketsToIndices.get(link.src)!,
            dstNodeIndex: nodesToIndices.get(link.dstNode)!,
            dstSocketIndex: socketsToIndices.get(link.dst)!,
        });
    }

    return JSON.stringify(serializedTree);
};

const deserializeNodeTree = async (tree: Tree, fileString: string) => {
    tree.clear();

    const serializedTree: SerializedTree = JSON.parse(fileString);
    const namesToConstructors = new Map<string, new (...args: any[]) => Node>(
        [models, spaces, math, images, externals, organization]
                .flatMap(namespace => Object.entries(namespace))
    );

    const nodes = [];
    for (const serializedNode of serializedTree.nodes) {
        const node = new (namesToConstructors.get(serializedNode.type)!)()
                .setPos(serializedNode.pos);

        for (const [i, fieldValue] of serializedNode.socketFieldValues.entries()) {
            node.ins[i].fieldValue = fieldValue;
        }

        tree.nodes.add(node);
        nodes.push(node);
    }

    // await Promise.resolve(); // wait a tick so that nodes have been mounted
    // TODO this is a display issue and probably should not rely on the import code

    for (const serializedLink of serializedTree.links) {
        tree.linkSockets(
            nodes[serializedLink.srcNodeIndex].outs[serializedLink.srcSocketIndex],
            nodes[serializedLink.dstNodeIndex].ins[serializedLink.dstSocketIndex],
        );
    }
};