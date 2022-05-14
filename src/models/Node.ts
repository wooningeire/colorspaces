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

	unlink(link: Link) {
		this.links.delete(link);
		link.src.links.splice(link.src.links.indexOf(link), 1);
		link.dst.links.splice(link.dst.links.indexOf(link), 1);
	}
}

export class Node {
	static readonly TYPE: symbol = Symbol();
	static readonly LABEL: string = "";

	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	readonly fields: Field[] = [];

	private static nextId = 0;
	readonly id = Node.nextId++;

	// Note: If subclass constructor is called, `new.target` is the subclass
	constructor(
		public pos: Vec2=[0, 0],
		readonly type: symbol=new.target.TYPE,
		public label: string=new.target.LABEL,
	) {}

	output(): Color {
		throw new TypeError("Abstract method; call on child class");
	}
}

enum SocketType {
	Unknown,
	ColRaw,
	ColTransformed,
	Float,
	RgbRaw,
}

export class Socket {
	static readonly Type = SocketType;
	private static readonly defaultValues = new Map<SocketType, number | Color>([
		[SocketType.Float, 0],
		[SocketType.RgbRaw, [0, 0, 0]],
	]);

	readonly links: Link[] = [];

	fieldValue: any;//number | Color;

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
		readonly type: SocketType,

		public label: string="",

		readonly showSocket: boolean=true,
	) {
		this.fieldValue = new.target.defaultValues.get(type);
	}

	get isOutput() {
		return !this.isInput;
	}

	get inValue(): any {
		return this.links[0]?.srcNode.output() ?? this.fieldValue;
	}
}

export class Link {
	private static nextId = 0;
	readonly id = Link.nextId++;

	constructor(
		/** Source socket. */
		readonly src: Socket,
		/** Destination socket. */
		readonly dst: Socket,
	) {}

	get srcNode() {
		return this.src.node;
	}

	get dstNode() {
		return this.dst.node;
	}
}


export class Field {
	private static nextId = 0;
	readonly id = Field.nextId++;

	value = 0;

	constructor(
		public label: string="",
	) {}
}