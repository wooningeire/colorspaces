import { WebglSlot, WebglTemplate } from "$/webgl-compute/WebglVariables";
import { InSocket, InSocketOptions, OutSocket, OutSocketOptions, Socket, SocketOptions, SocketType, Tree, socketTypeRestrictiveness, socketTypeToStdOut, webglStdOuts } from "$/node";

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
    let mostRestrictiveType = SocketType.DynamicAny;

    for (const socket of syncedSockets()) {
      for (const link of socket.links) {
        const inferredType = (socket.isInput ? link.src.type : link.dst.type) ?? SocketType.DynamicAny;
        if (socketTypeRestrictiveness.get(inferredType)! > socketTypeRestrictiveness.get(mostRestrictiveType)!) {
          mostRestrictiveType = inferredType;
        }
      }
    }

    return mostRestrictiveType;
  };

  const updateType = () => {
    for (const socket of syncedSockets()) {
      socket.changeType(inferType());
    }
  };

  return {
    inSocketOptions: (slot: WebglSlot) => <InSocketOptions<SocketType.DynamicAny>>{
      showFieldIfAvailable: false,
      hasDynamicType: true,
      onLink: link => {
        updateType();
      },
      onUnlink: link => {
        updateType();
      },
      onInputTypeChange: newType => {
        updateType();
      },
      webglOutputMapping: dynamicInSocketMapping(slot),
    },
    
    outSocketOptions: (template: WebglTemplate=WebglTemplate.empty()) => <OutSocketOptions<SocketType.DynamicAny>>{
      hasDynamicType: true,
      onLink: link => {
        updateType();
      },
      onUnlink: link => {
        updateType();
      },
      onOutputTypeChange: newType => {
        updateType();
      },
      webglOutputs: dynamicOutSocketOutputs(template),
    },
  };
};


export const dynamicInSocketMapping = (slot: WebglSlot) =>
    (socket: InSocket) => () => {
      const effectiveType = socket.effectiveType();
      if (!socketTypeToStdOut.has(effectiveType)) throw new Error("invalid type for dynamic socket");
      return {[
        socketTypeToStdOut.get(effectiveType)!]: slot,
      };
    };

export const dynamicOutSocketOutputs = (template: WebglTemplate=WebglTemplate.empty()) =>
    (socket: OutSocket) => () => {
      if (!socketTypeToStdOut.has(socket.type)) throw new Error("invalid type for dynamic socket");

      return {
        [socketTypeToStdOut.get(socket.type)!]: template,
      };
    };

export const vectorOrColorInSocketMapping = ({
  colorSlot,
  vectorSlot,
}: {
  colorSlot: WebglSlot,
  vectorSlot: WebglSlot,
}) =>
    (socket: InSocket) => () => socket.effectiveType() === SocketType.Color
        ? {[webglStdOuts.color]: colorSlot}
        : {[webglStdOuts.vector]: vectorSlot};