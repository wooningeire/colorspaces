import {StringKey, NO_DESC} from "../strings";
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

		if (existingDstLink && src !== existingDstLink.src) {
			existingDstLink.srcNode.onSocketUnlink(existingDstLink.src, existingDstLink, this);
		}


		const link = new Link(src, dst);

		src.links.push(link);
		dst.links.push(link);

		this.links.add(link);

		if (!existingDstLink) {
			dst.node.onSocketLink(dst, link, this);
			dst.node.onDependencyUpdate();
		}

		src.node.onSocketLink(src, link, this);
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
		link.dstNode.onDependencyUpdate();
	}

	deleteNode(node: Node) {
		this.nodes.delete(node);

		[...node.ins, ...node.outs]
				.map(socket => socket.links)
				.flat()
				.forEach(link => this.unlink(link));
	}
}

export enum OutputDisplayType {
	None,
	Float,
	Color,
}

export class Node {
	static readonly TYPE: symbol = Symbol();
	static readonly LABEL: string = "";

	static readonly DESC: StringKey = NO_DESC;

	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	private static nextId = 0;
	readonly id = Node.nextId++;
	
	static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.None;


	width = 140;
	canMove = true;
	canEditLinks = true;
	pos: Vec2 = [0, 0];
	setPos(pos: Vec2) { this.pos = pos; return this; }

	// Note: If subclass constructor is called, `new.target` is the subclass
	constructor(
		readonly type: symbol=new.target.TYPE,
		public label: string=new.target.LABEL,
	) {}

	output(context: NodeEvalContext={}): any {
		throw new TypeError("Abstract method / not implemented");
	}

	/**
	 * Called when a new link is added to any socket on this node, but not if the link is immediately replaced
	 */
	onSocketLink(socket: Socket, link: Link, tree: Tree) {
		const {duplicateLinks, allVisitedLinks} = this.findCyclicalLinks();
		for (const link of allVisitedLinks) {
			link.causesCircularDependency = duplicateLinks.has(link);
		}
	}

	// /**
	//  * Called when a link to any socket on this node is replaced with another
	//  */
	// onSocketReplace(socket: Socket, link: Link, tree: Tree) {
	// 	Node.prototype.onSocketLink.call(this, socket, link, tree);
	// }

	/**
	 * Called when a link is removed from any socket in this node, but not if the link is immediately replaced
	 * @param socket 
	 * @param link 
	 * @param tree 
	 */
	onSocketUnlink(socket: Socket, link: Link, tree: Tree) {
		Node.prototype.onSocketLink.call(this, socket, link, tree);
	}

	onDependencyUpdate() { // doesn't do anything yet
	}

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
		this.forEachInLink(link => {
			if (duplicateLinks.has(link)) {
				return;
			} else if (visitedLinks.has(link)) {
				duplicateLinks.add(link);
			} else {
				visitedLinks.add(link);
				allVisitedLinks.add(link);
			}

			link.srcNode.findCyclicalLinks(new Set(visitedLinks), duplicateLinks, allVisitedLinks);
		});

		return {
			duplicateLinks,
			allVisitedLinks,
		};
	}

	isAxisNode(): this is AxisNode {
		return "axes" in this;
	}

	getDependencyAxes(axes=new Set<number>()) {
		if (this.isAxisNode()) {
			this.axes.forEach(axis => axes.add(axis));
		}

		this.forEachInLink(link => {
			if (link.causesCircularDependency) return;
			link.srcNode.getDependencyAxes(axes);
		});
		return axes;
	}

	forEachInLink(fn: (link: Link) => void) {
		for (const socket of this.ins) {
			for (const link of socket.links) {
				fn(link);
			}
		}
	}
}

export interface AxisNode extends Node {
	readonly axes: number[];
}

export interface NodeEvalContext {
	readonly coords?: Vec2;
	readonly socket?: Socket;
}


export enum SocketType {
	Unknown,
	Any,
	Float,
	Integer,
	RgbRaw,
	RgbRawOrColTransformed,
	ColTransformed,
	Dropdown,
	Image,
}
const St = SocketType;

export type SocketValue<St extends SocketType=any> =
		St extends SocketType.Float ? number :
		St extends SocketType.Integer ? number :
		St extends SocketType.RgbRaw ? Color :
		St extends SocketType.ColTransformed ? Color :
		St extends SocketType.RgbRawOrColTransformed ? Color :
		St extends SocketType.Dropdown ? string :
		St extends SocketType.Image ? ImageData :
		never;

type SliderProps = {
	hasBounds?: boolean,
	min?: number,
	max?: number,
	step?: number,
	unboundedChangePerPixel?: number,
};

type SocketData<St extends SocketType=any> =
		St extends SocketType.Dropdown ? {
			options?: {
				value: string,
				text: string,
			}[],
		} :
		St extends SocketType.Float ? {
			sliderProps?: SliderProps,
		} :
		St extends SocketType.RgbRaw ? {
			sliderProps?: SliderProps[],
		} :
		St extends SocketType.RgbRawOrColTransformed ? {
			sliderProps?: SliderProps[],
		} :
		{};

type SocketOptions<St extends SocketType=any> =
		{
			defaultValue?: SocketValue<St>,
			fieldText?: StringKey[],
		} & SocketData<St>;

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
		this.data = data as any as SocketData<St>;
	}

	get isOutput() {
		return !this.isInput;
	}

	inValue(context: NodeEvalContext={}): SocketValue<St> {
		return this.links[0]?.causesCircularDependency
				? this.fieldValue
				: (this.links[0]?.src.outValue(context) as SocketValue<St>) ?? this.fieldValue;
	}

	outValue(context: NodeEvalContext={}): SocketValue<St> {
		const newContext = {
			...context,
			socket: this,
		};

		return this.node.output(newContext);
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