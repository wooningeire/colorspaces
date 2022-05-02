import {Color, Vec2} from "../util";

export class Tree {
	readonly links = new Set<Link>();
	readonly nodes: Node[] = [];

	linkSockets(src: Socket, dst: Socket) {
		if (src.isInput) throw new Error("Source is an input");
		if (dst.isOutput) throw new Error("Dest is an output");
		if (src.node === dst.node) throw new Error("Sockets belong to same node");

		const link = new Link(src, dst);

		const existingDstLink = dst.links[0];
		this.links.delete(existingDstLink);
		dst.links.pop();

		src.links.push(link);
		dst.links.push(link);

		this.links.add(link);
	}
}

let i = 0;
export class Node {
	static readonly TYPE: symbol = Symbol();
	static readonly LABEL: string = "";

	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	readonly fields: Field[] = [];

	color: Color = [1, 1, 1]; // temp

	readonly id = i++;

	// Note: If subclass constructor is called, `new.target` is the subclass
	constructor(
		public pos: Vec2=[0, 0],
		readonly type: symbol=new.target.TYPE,
		public label: string=new.target.LABEL,
	) {}

	srgbOutput(): Color {
		throw new TypeError("Not implemented");
	}
}

enum SocketType {
	UNKNOWN,
	COL_RAW,
	COL_TRANSFORMED,
}

export class Socket {
	static readonly Type = SocketType;

	readonly links: Link[] = [];

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
		readonly type: SocketType,

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


let j = 0;
export class Field {
	readonly id = j++;

	value = 0;

	constructor(
		public label: string="",
	) {}
}