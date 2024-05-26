import { errorPopupController } from "@/components/store";
import { Tree, Node, SocketValue, Socket } from "$/node/";
import { NodeWithOverloads } from "$/node/Overload";
import * as nodeTypes from "$/node-types";
import getString from "$/strings";

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
  try {
    deserializeNodeTree(tree, fileString);
  } catch (error) {
    tree.clear();
    errorPopupController.showPopup(`${getString("error.import")}<br />
${(error as Error).message}`);
  }
};


interface SerializedTree {
  /** Version of the file format; should follow semver */
  fileFormatVersion: number[],
  nodes: SerializedNode[],
  links: SerializedLink[],
};

interface SerializedNode {
  type: string,
  socketFieldValues: Exclude<SocketValue, ImageData>[],
  pos: [number, number],
  width: number,
};

interface SerializedLink {
  srcNodeIndex: number,
  srcSocketIndex: number,
  dstNodeIndex: number,
  dstSocketIndex: number,
};

const serializeNodeTree = (tree: Tree) => {
  const serializedTree: SerializedTree = {
    fileFormatVersion: [0, 0, 0],
    nodes: [],
    links: [],
  };

  const nodesToIndices = new Map<Node, number>();
  const socketsToIndices = new Map<Socket, number>();

  let nodeIndex = 0;
  for (const node of tree.nodes) {
    const socketFieldValues = [];

    // Track socket indices

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

    // Construct the serialized node

    serializedTree.nodes.push({
      type: (node.constructor as typeof Node).TYPE.description!,
      socketFieldValues: node.ins.map(socket => socket.fieldValue instanceof ImageData ? "" : socket.fieldValue),
      pos: node.pos,
      width: node.width,
    });

    nodesToIndices.set(node, nodeIndex);
    nodeIndex++;
  }

  for (const link of tree.links()) {
    serializedTree.links.push({
      srcNodeIndex: nodesToIndices.get(link.srcNode)!,
      srcSocketIndex: socketsToIndices.get(link.src)!,
      dstNodeIndex: nodesToIndices.get(link.dstNode)!,
      dstSocketIndex: socketsToIndices.get(link.dst)!,
    });
  }

  return JSON.stringify(serializedTree);
};

const deserializeNodeTree = (tree: Tree, fileString: string) => {
  tree.clear();

  const serializedTree: SerializedTree = JSON.parse(fileString);
  const namesToConstructors = new Map<string, new (...args: any[]) => Node>(
    Object.values(nodeTypes).flatMap(namespace => Object.entries(namespace))
  );

  const nodes = [];
  for (const serializedNode of serializedTree.nodes) {
    const nodeConstructor = namesToConstructors.get(serializedNode.type);
    if (!nodeConstructor) {
      throw new Error(getString("error.import.unknownNodeType", serializedNode.type));
    }

    const node = new nodeConstructor()
        .setPos(serializedNode.pos)
        .setWidth(serializedNode.width);

    if (node instanceof NodeWithOverloads) {
      // Handle the overload dropdown socket
      node.ins[0].fieldValue = serializedNode.socketFieldValues[0];
      try {
        node.overloadManager.handleModeChange();
      } catch (error) {
        throw new Error(getString("error.import.unknownOverload", serializedNode.type, node.overloadManager.mode));
      }

      for (let i = 1; i < serializedNode.socketFieldValues.length; i++) {
        node.ins[i].fieldValue = serializedNode.socketFieldValues[i];
      }
    } else {
      for (const [i, fieldValue] of serializedNode.socketFieldValues.entries()) {
        node.ins[i].fieldValue = fieldValue;
      }
    }

    tree.nodes.add(node);
    nodes.push(node);
  }

  for (const serializedLink of serializedTree.links) {
    Socket.linkSockets(
      nodes[serializedLink.srcNodeIndex].outs[serializedLink.srcSocketIndex],
      nodes[serializedLink.dstNodeIndex].ins[serializedLink.dstSocketIndex],
    );
  }
};