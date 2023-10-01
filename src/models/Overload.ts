import { Node, NodeEvalContext, Socket, SocketType as St, Tree } from "./Node";

export class Overload<T> {
    constructor(
        readonly label: string,
        readonly ins: (node: Node) => Socket[],
        readonly outs: (node: Node) => Socket[],
        readonly evaluate: (ins: Socket[], outs: Socket[], context: NodeEvalContext) => T,
        private readonly maintainExistingLinks = false,
    ) {}
}

export class OverloadGroup<Mode extends string> {
    constructor(
        private readonly modes: Map<Mode, Overload<any>>,
    ) {}

    buildDropdown(node: Node, defaultMode: Mode) {
        return new Socket(node, true, Socket.Type.Dropdown, "", false, {
            options: [...this.modes].map(([mode, overload]) => (
                {value: mode, text: overload.label}
            )),
            defaultValue: defaultMode,
        });
    }

    getOverload(mode: Mode) {
        return this.modes.get(mode)!;
    }
}

export class OverloadManager<Mode extends string> {
    readonly dropdown: Socket<St.Dropdown>;
    private ins: Socket[];
    private outs: Socket[];

    constructor(
        private readonly node: Node,
        defaultMode: Mode,
        private readonly overloadGroup: OverloadGroup<Mode>,
    ) {
        this.dropdown = overloadGroup.buildDropdown(node, defaultMode);

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
        return this.overload.evaluate(this.ins, this.outs, context);
    }

    handleModeChange(tree: Tree) {
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