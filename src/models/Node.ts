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

		src.node.onSocketLink(src, link, this);
		if (!existingDstLink) {
			dst.node.onSocketLink(dst, link, this);
		}
	}

	private unlinkWithoutEvents(link: Link) {
		this.links.delete(link);
		link.src.links.splice(link.src.links.indexOf(link), 1);
		link.dst.links.splice(link.dst.links.indexOf(link), 1);
	}

	unlink(link: Link) {
		this.unlinkWithoutEvents(link);

		link.srcNode.onSocketUnlink(link.src, link, this);
		link.dstNode.onSocketUnlink(link.dst, link, this);
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

	width = 140;

	// Note: If subclass constructor is called, `new.target` is the subclass
	constructor(
		public pos: Vec2=[0, 0],
		readonly type: symbol=new.target.TYPE,
		public label: string=new.target.LABEL,
	) {}

	output(...contextArgs: number[]): any {
		throw new TypeError("Abstract method / not implemented");
	}

	onSocketLink(socket: Socket, link: Link, tree: Tree) {
		const {duplicateLinks, allVisitedLinks} = this.findCyclicalLinks();
		for (const link of allVisitedLinks) {
			link.causesCircularDependency = duplicateLinks.has(link);
		}
	}

	onSocketUnlink(socket: Socket, link: Link, tree: Tree) {
		Node.prototype.onSocketLink.call(this, socket, link, tree);
	}

	onDependencyUpdate() {} // doesn't do anything yet

	// Eventually adapted into `findCyclicalLinks`
	/* hasCircularDependency(visitedNodes=new Set<Node>()): boolean {
		if (visitedNodes.has(this)) return true;
		visitedNodes.add(this);

		for (const socket of this.ins) {
			for (const link of socket.links) {
				const cyclesFound = link.srcNode.hasCircularDependency(new Set(visitedNodes));
				if (cyclesFound) return true;
			}
		}

		return false;
	}

	getCyclicalNodes(visitedNodes=new Set<Node>(), duplicateNodes=new Set<Node>()): Set<Node> {
		if (duplicateNodes.has(this)) {
			return duplicateNodes;
		} else if (visitedNodes.has(this)) {
			duplicateNodes.add(this);
		} else {
			visitedNodes.add(this);
		}

		for (const socket of this.ins) {
			for (const link of socket.links) {
				link.srcNode.getCyclicalNodes(new Set(visitedNodes), duplicateNodes);
			}
		}

		return duplicateNodes;
	} */

	findCyclicalLinks(visitedLinks=new Set<Link>(), duplicateLinks=new Set<Link>(), allVisitedLinks=new Set<Link>()) {
		for (const socket of this.ins) {
			for (const link of socket.links) {
				if (duplicateLinks.has(link)) {
					continue;
				} else if (visitedLinks.has(link)) {
					duplicateLinks.add(link);
				} else {
					visitedLinks.add(link);
					allVisitedLinks.add(link);
				}

				link.srcNode.findCyclicalLinks(new Set(visitedLinks), duplicateLinks, allVisitedLinks);
			}
		}

		return {
			duplicateLinks,
			allVisitedLinks,
		};
	}
}


export enum SocketType {
	Unknown,
	Any,
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
		return dstType === St.Any
				|| (this.typeCanBeLinkedTo.get(srcType)?.includes(dstType)
				?? srcType === dstType);
	}


	readonly links: Link[] = [];

	fieldValue: SocketValue<St>;//number | Color;

	readonly data: SocketData<St>

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
		public type: St,

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

	inValue(...contextArgs: number[]): SocketValue<St> {
		return this.links[0]?.causesCircularDependency
				? this.fieldValue
				: this.links[0]?.srcNode.output(...contextArgs) ?? this.fieldValue;
	}

	get hasLinks() {
		return this.links.length > 0;
	}
}

export class Link {
	private static nextId = 0;
	readonly id = Link.nextId++;

	/**
	 * Set in the event listener of a node.
	 */
	causesCircularDependency = false;

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