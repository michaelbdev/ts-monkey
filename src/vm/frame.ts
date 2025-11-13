import type { ClosureObject } from "../object/object";

export class Frame {
	public ip = -1;
	constructor(
		public closure: ClosureObject,
		public basePointer: number,
		public argCount: number,
	) {}
	get instructions() {
		return this.closure.fn.instructions;
	}
}
