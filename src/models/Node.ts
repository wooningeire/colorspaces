import {Vector} from "../util";

export class Tree {
	readonly links: Link[] = [];
	readonly nodes: Node[] = [];
}

let i = 0;
export class Node {
	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	readonly id = i++;

	pos: Vector = [];

	constructor(
		readonly type: symbol,
		public label: string="",
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