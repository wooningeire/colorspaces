import {Color, Vec2} from "../util";

export class Tree {
	readonly links = new Set<Link>();
	readonly nodes = new Set<Node>();

	linkSockets(src: Socket, dst: Socket) {
		if (src.isInput) throw new Error("Source is an input");
		if (dst.isOutput) throw new Error("Dest is an output");
		if (src.node === dst.node) throw new Error("Sockets belong to same node");


		const existingDstLink = dst.links[0];
		if (existingDstLink) {
			this.unlinkWithoutEvents(existingDstLink);
		}


		const link = new Link(src, dst);

		src.links.push(link);
		dst.links.push(link);

		this.links.add(link);

		if (!existingDstLink) {
			src.node.onSocketLink(src);
			dst.node.onSocketLink(dst);
		}
	}

	private unlinkWithoutEvents(link: Link) {
		this.links.delete(link);
		link.src.links.splice(link.src.links.indexOf(link), 1);
		link.dst.links.splice(link.dst.links.indexOf(link), 1);
	}

	unlink(link: Link) {
		this.unlinkWithoutEvents(link);

		link.srcNode.onSocketUnlink(link.src);
		link.dstNode.onSocketUnlink(link.dst);
	}

	deleteNode(node: Node) {
		this.nodes.delete(node);

		[...node.ins, ...node.outs]
				.map(socket => socket.links)
				.flat()
				.forEach(link => this.unlink(link));
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

	output(...args: any[]): any {
		throw new TypeError("Abstract method; call on child class");
	}

	onSocketLink(socket: Socket) {}

	onSocketUnlink(socket: Socket) {}

	onDependencyUpdate() {} // doesn't do anything yet
}


export enum SocketType {
	Unknown,
	Float,
	RgbRaw,
	RgbRawOrColTransformed,
	ColTransformed,
	Dropdown,
	Image,
}
const St = SocketType;

export type SocketValue<St extends SocketType=any> =
		St extends SocketType.Float ? number :
		St extends SocketType.RgbRaw ? Color :
		St extends SocketType.ColTransformed ? Color :
		St extends SocketType.RgbRawOrColTransformed ? Color :
		St extends SocketType.Dropdown ? string :
		St extends SocketType.Image ? ImageData :
		never;

type SocketData<St extends SocketType=any> = 
		// St extends SocketType.Float ? {defaultValue?: SocketValue<St>} :
		St extends SocketType.Dropdown ? {
			options?: {
				value: string,
				text: string,
			}[],
		} :
		{};

type SocketOptions<St extends SocketType=any> = 
		{defaultValue: SocketValue<St>} &
		(St extends SocketType.Dropdown ? SocketData<St> :
		{});

export class Socket<St extends SocketType=any> {
	private static nextId = 0;
	readonly id = Socket.nextId++;

	static readonly Type = SocketType;
	private static readonly defaultValues = new Map<SocketType, SocketValue>([
		[St.Float, 0],
		[St.RgbRaw, [0, 0, 0]],
		[St.RgbRawOrColTransformed, [0, 0, 0]],
	]);

	private static readonly typeCanBeLinkedTo = new Map<SocketType, SocketType[]>([
		[St.RgbRaw, [St.RgbRaw, St.RgbRawOrColTransformed]],
		[St.ColTransformed, [St.ColTransformed, St.RgbRawOrColTransformed]],
	]);

	static canLinkTypeTo(srcType: SocketType, dstType: SocketType) {
		return this.typeCanBeLinkedTo.get(srcType)?.includes(dstType)
				?? srcType === dstType;
	}


	readonly links: Link[] = [];

	fieldValue: SocketValue<St>;//number | Color;

	readonly data: SocketData<St>

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
		readonly type: St,

		public label: string="",

		readonly showSocket: boolean=true,

		options: SocketOptions<St>=<SocketOptions<St>>{},
	) {
		const {defaultValue, ...data} = options;

		this.fieldValue = defaultValue ?? new.target.defaultValues.get(type) as SocketValue<St>,
		this.data = data;
	}

	get isOutput() {
		return !this.isInput;
	}

	get inValue(): SocketValue<St> {
		return this.links[0]?.srcNode.output() ?? this.fieldValue;
	}

	inValueFn(...args: any[]): SocketValue<St> {
		return this.links[0]?.srcNode.output(...args) ?? this.fieldValue;
	}

	get hasLinks() {
		return this.links.length > 0;
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