import {Vec2} from "../util";

export class Tree {
	readonly links: Link[] = [];
	readonly nodes: Node[] = [];

	linkSockets(src: Socket, dst: Socket) {
		if (src.isInput) throw new Error("Source is an input");
		if (dst.isOutput) throw new Error("Dest is an output");
		if (src.node === dst.node) throw new Error("Sockets belong to same node");

		this.links.push(new Link(src, dst));
	}
}

let i = 0;
export class Node {
	static readonly TYPE: symbol = Symbol();
	static readonly LABEL: string = "";

	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	readonly fields = [];

	readonly id = i++;

	// Note: If subclass constructor is called, `new.target` is the subclass
	constructor(
		public pos: Vec2=[0, 0],
		readonly type: symbol=new.target.TYPE,
		public label: string=new.target.LABEL,
	) {}
}

enum Type {
	UNKNOWN,
	COL_RAW,
	COL_TRANSFORMED,
}

export class Socket {
	static Type = Type;

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
		readonly type: Type,

		public label: string="",
	) {}

	get isOutput() {
		return !this.isInput;
	}
}

export class Link {
	constructor(
		/** Source socket. */
		readonly src: Socket,
		/** Destination socket. */
		readonly dst: Socket,
	) {}
}