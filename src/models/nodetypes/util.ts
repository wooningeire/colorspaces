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


export const dynamicInSocketMapping = ({val}: {val: WebglSlot}) =>
    (socket: InSocket) => () => ({[webglOuts.val]: val});