import { WebglSlot } from "@/webgl-compute/WebglVariables";
import { InSocket, InSocketOptions, OutSocket, OutSocketOptions, Socket, SocketOptions, SocketType, Tree, socketTypeRestrictiveness, webglOuts } from "../Node";

/** Socket options to set up input and output sockets whose type changes (and which fires the appropriate events) when
 * its link type changes. This includes links being added or remvoved
 * @param syncedInSockets The sockets whose types to update when one of such sockets are linked to/unlinked from
 */
export const useDynamicallyTypedSockets = (
  syncedInSockets: () => InSocket[],
  syncedOutSockets: () => OutSocket[],
) => {
  const syncedSockets = function* () {
    yield* syncedInSockets();
    yield* syncedOutSockets();
  };

  const inferType = () => {
    let mostRestrictiveType = SocketType.Any;

    for (const socket of syncedSockets()) {
      const inferredType = (
        socket.isInput
            ? socket.links[0]?.src.type
            : socket.links[0]?.dst.type
      ) ?? SocketType.Any;
      if (socketTypeRestrictiveness.get(inferredType)! > socketTypeRestrictiveness.get(mostRestrictiveType)!) {
        mostRestrictiveType = inferredType;
      }
    }

    // let existingOutputSocket = outSocket.links[0]?.dst;
    // while (existingOutputSocket && existingOutputSocket.hasDynamicType) {
    //   existingOutputSocket = existingOutputSocket.node.outs[0].links[0]?.dst;
    // }
    // const existingOutputType = existingOutputSocket?.type ?? SocketType.Any;

    
    // let existingInputSocket = ins[0].links[0]?.src;
    // while (existingInputSocket && existingInputSocket.hasDynamicType) {
    //   // TODO this assumes the position of a Dynamic-type socket, which is not necessarily true for future node types
    //   existingInputSocket = existingInputSocket.node.ins[0].links[0]?.src;
    // }
    // let newType: SocketType = existingInputSocket?.type;

    // // There could be more links on this socket
    // if (!newType) {
    //   let existingOutputSocket = outs[0].links[0]?.dst;
    //   while (existingOutputSocket && existingOutputSocket.hasDynamicType) {
    //     existingOutputSocket = existingOutputSocket.node.outs[0].links[0]?.dst;
    //   }
    //   newType = existingOutputSocket?.type;
    // }
    
    // newType ??= SocketType.Any;

    // for (const socket of syncedSockets()) {
    //   socket.changeType(newType, tree);
    // }
    

    return mostRestrictiveType;
  };

  const updateType = (tree: Tree) => {
    for (const socket of syncedSockets()) {
      socket.changeType(inferType(), tree);
    }
  };

  return {
    inSocketOptions: <InSocketOptions<SocketType.Any>>{
      showFieldIfAvailable: false,
      hasDynamicType: true,
      onLink: (link, tree) => {
        updateType(tree);
      },
      onUnlink: (link, tree) => {
        updateType(tree);
      },
      onInputTypeChange: (newType, tree) => {
        updateType(tree);
      },
    },
    
    outSocketOptions: <OutSocketOptions<SocketType.Any>>{
      hasDynamicType: true,
      onLink: (link, tree) => {
        updateType(tree);
      },
      onUnlink: (link, tree) => {
        updateType(tree);
      },
      onOutputTypeChange: (newType, tree) => {
        updateType(tree);
      },
    },
  };
};


export const dynamicInSocketMapping = ({
  val,
  illuminant,
  xyz,
}: {
  val: WebglSlot,
  illuminant: WebglSlot,
  xyz: WebglSlot,
}) =>
    (socket: InSocket) => () => {
      switch (socket.effectiveType()) {
        case SocketType.Float:
        case SocketType.Integer:
        case SocketType.Vector:
        case SocketType.Bool:
          return {
            [webglOuts.val]: val,
          };

        case SocketType.VectorOrColor:
        case SocketType.ColorComponents:
          return {
            [webglOuts.val]: val,
            [webglOuts.illuminant]: illuminant,
            [webglOuts.xyz]: xyz,
          };
        
        default:
          return null;
      }
    };