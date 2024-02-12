import { Node, NodeEvalContext, Socket, SocketType as St, Tree } from "./Node";

/** A collection of input/output sockets, as well as a function to compute outputs from the inputs' values */
export class Overload<OutputType, NodeType extends Node=any, InSockets extends Socket[]=any, OutSockets extends Socket[]=any> {
    constructor(
        readonly label: string,
        readonly ins: (node: NodeType) => [...InSockets],
        readonly outs: (node: NodeType) => [...OutSockets],
        readonly evaluate: (ins: InSockets, outs: OutSockets, context: NodeEvalContext, node: NodeType) => OutputType,
        private readonly maintainExistingLinks = false,
    ) {}
}

/** Descriptor of a set of overloads, usually to store those specific to a certain subclass of Node */
export class OverloadGroup<Mode extends string, NodeType extends Node=any> {
    constructor(
        private readonly modes: Map<Mode, Overload<any, NodeType>>,
    ) {}

    buildDropdown(node: NodeType, defaultMode: Mode, overloadManager: OverloadManager<Mode>) {
        return new Socket(node, true, Socket.Type.Dropdown, "", false, {
            options: [...this.modes].map(([mode, overload]) => (
                {value: mode, text: overload.label}
            )),
            defaultValue: defaultMode,
            onValueChange: tree => overloadManager.handleModeChange(tree),
        });
    }

    getOverload(mode: Mode) {
        return this.modes.get(mode)!;
    }
}

/** Stores the currently selected overload of a Node instance, as well as obtains the current output evaluation
 * function when needed and updates the sockets when the selected overload changes
 */
export class OverloadManager<Mode extends string> {
    readonly dropdown: Socket<St.Dropdown>;
    private ins: Socket[];
    private outs: Socket[];

    constructor(
        private readonly node: Node,
        defaultMode: Mode,
        private readonly overloadGroup: OverloadGroup<Mode>,
    ) {
        this.dropdown = overloadGroup.buildDropdown(node, defaultMode, this);

        const overload = overloadGroup.getOverload(defaultMode);
        this.ins = overload.ins(node);
        this.outs = overload.outs(node);
    }

    setSockets() {
        this.node.ins.push(this.dropdown);
        this.node.ins.push(...this.ins);
        this.node.outs.push(...this.outs);
    }

    evaluate(context: NodeEvalContext) {
        return this.overload.evaluate(this.ins, this.outs, context, this.node);
    }

    handleModeChange(tree: Tree) {
        /* 
        const deleteSocketsUntilLength = (targetLength: number) => {
            while (this.valueSockets.length > targetLength) {
                this.ins.pop();
                const oldSocket = this.valueSockets.pop();
                oldSocket?.links.forEach(link => tree.unlink(link));
            }
        };
        */

        const nIns = this.ins.length;
        const nOuts = this.outs.length;
        for (let i = 0; i < nIns; i++) {
            const oldSocket = this.node.ins.pop();
            oldSocket?.links.forEach(link => tree.unlink(link));
        }

        for (let i = 0; i < nOuts; i++) {
            const oldSocket = this.node.outs.pop();
            oldSocket?.links.forEach(link => tree.unlink(link));
        }

        this.ins = this.overload.ins(this.node);
        this.outs = this.overload.outs(this.node);
        this.node.ins.push(...this.ins);
        this.node.outs.push(...this.outs);
    }

    get mode() {
        return this.dropdown.inValue() as Mode;
    }

    get overload() {
        return this.overloadGroup.getOverload(this.mode);
    }
}