import {Vec2} from "../util";

export class Tree {
	readonly links: Link[] = [];
	readonly nodes: Node[] = [];
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

export class Socket {
	constructor(
		readonly node: Node,
		readonly isInput: boolean,

		public label: string="",
	) {}
}

export class Link {
	/** Source socket. */
	src: Socket;
	/** Destination socket. */
	dst: Socket;
}