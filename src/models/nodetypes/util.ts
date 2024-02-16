import { InSocket, OutSocket, SocketOptions, SocketType as St } from "../Node";

/** Socket options to set up an input socket that changes its type (and fires the appropriate events) when its input
 * type changes, including links being added or remvoved
 */
export const volatileInSocketOptions = (ins: InSocket[], outs: OutSocket[]) => (<SocketOptions<St.Any>>{
  showFieldIfAvailable: false,
  hasVolatileType: true,
  onLink: (link, tree) => {
    ins[0].changeType(link.src.type, tree);
    outs[0].changeType(link.src.type, tree);
  },
  onUnlink: (link, tree) => {
    let existingOutputSocket = outs[0].links[0]?.dst;
    while (existingOutputSocket && existingOutputSocket.hasVolatileType) {
      existingOutputSocket = existingOutputSocket.node.outs[0].links[0]?.dst;
    }
    const existingOutputType = existingOutputSocket?.type ?? St.Any;

    ins[0].changeType(existingOutputType, tree);
    outs[0].changeType(existingOutputType, tree);
  },
  onInputTypeChange: (newType, tree) => {
    ins[0].changeType(newType, tree);
    outs[0].changeType(newType, tree);
  },
});

/** Socket options to set up an output socket that changes its type (and fires the appropriate events) when its output
 * type changes, including links being added or remvoved
 */
export const volatileOutSocketOptions = (ins: InSocket[], outs: OutSocket[]) => (<SocketOptions<St.Any>>{
  hasVolatileType: true,
  onLink: (link, tree) => {
    ins[0].changeType(link.src.type, tree);
    outs[0].changeType(link.src.type, tree);
  },
  onUnlink: (link, tree) => {
    let existingInputSocket = ins[0].links[0]?.src;
    while (existingInputSocket && existingInputSocket.hasVolatileType) {
      // TODO this assumes the position of a volatile-type socket, which is not necessarily true for future node types
      existingInputSocket = existingInputSocket.node.ins[0].links[0]?.src;
    }
    let newType: St = existingInputSocket?.type;

    // There could be more links on this socket
    if (!newType) {
      let existingOutputSocket = outs[0].links[0]?.dst;
      while (existingOutputSocket && existingOutputSocket.hasVolatileType) {
        existingOutputSocket = existingOutputSocket.node.outs[0].links[0]?.dst;
      }
      newType = existingOutputSocket?.type;
    }
    
    newType ??= St.Any;

    ins[0].changeType(newType, tree);
    outs[0].changeType(newType, tree);
  },
  onOutputTypeChange: (newType, tree) => {
    // Prioritize an existing input type rather than an output type

    let existingInputSocket = ins[0].links[0]?.src;
    while (existingInputSocket && existingInputSocket.hasVolatileType) {
      // TODO ditto
      existingInputSocket = existingInputSocket.node.ins[0].links[0]?.src;
    }
    const existingInputType = existingInputSocket?.type;
    if (existingInputSocket !== undefined && existingInputType !== newType) return;

    ins[0].changeType(newType, tree);
    outs[0].changeType(newType, tree);
  },
})