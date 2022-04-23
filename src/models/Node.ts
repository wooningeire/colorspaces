import {Vector} from "../util";

export class Tree {
	readonly links: Link[] = [];
	readonly nodes: Node[] = [];
}

export class Node {
	readonly ins: Socket[] = [];
	readonly outs: Socket[] = [];

	pos: Vector = [];

	readonly label: string;

	constructor() {
		
	}
}

export class Socket {
	readonly label: string;

	constructor(
		readonly node: Node,
		readonly isInput: boolean,
	) {

	}
}

export class Link {
	/** Source socket. */
	src: Socket;
	/** Destination socket. */
	dst: Socket;
}