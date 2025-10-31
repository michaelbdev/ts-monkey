import { getBuiltinByName } from "../object/builtins";
import {
	ArrayObject,
	BuiltInObject,
	ErrorObject,
	type FunctionObject,
	IntegerObject,
	type InternalObject,
	NULL_OBJ,
	ObjectType,
	TRUE_OBJ,
} from "../object/object";
import type { Maybe } from "../utils/types";
import { applyFunction } from "./eval";

// the implementations of the first 5 are the same so we share them, but all functions with callbacks need  their own implementation specific to the env they are run e.g interpreter or vm
export const builtins: Record<string, BuiltInObject> = {
	len: getBuiltinByName("len")!,
	first: getBuiltinByName("first")!,
	last: getBuiltinByName("last")!,
	rest: getBuiltinByName("rest")!,
	push: getBuiltinByName("push")!,
	set: getBuiltinByName("set")!,
	map: new BuiltInObject(({ args }) => {
		if (args.length !== 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'map' function only accepts an array, got: ${arg?.type()}`,
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'map' second parameter must be a function, got: ${arg2?.type()}`,
			);
		}
		const result: Maybe<InternalObject>[] = [];
		for (const [i, el] of arg.elements.entries()) {
			const res = applyFunction(arg2, [el, new IntegerObject(i)]);
			if (res instanceof ErrorObject) {
				return res;
			}

			result.push(res);
		}

		return new ArrayObject(result);
	}),
	find: new BuiltInObject(({ args }) => {
		if (args.length !== 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'find' function only accepts an array, got: ${arg?.type()}`,
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'find' second parameter must be a function, got: ${arg2?.type()}`,
			);
		}
		for (const el of arg.elements) {
			const res = applyFunction(arg2, [el]);
			if (res instanceof ErrorObject) return res;

			if (res?.type() !== ObjectType.BOOLEAN_OBJ) {
				return new ErrorObject(
					`callback function to 'find' must evaluate to a boolean value. got: ${res?.type()}`,
				);
			}

			if (res?.inspect() === "true") {
				return el;
			}
		}
		return NULL_OBJ;
	}),
	reduce: new BuiltInObject(({ args }) => {
		if (args.length < 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2|3`,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;
		const arg3 = args[2] as Maybe<InternalObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'reduce' function only accepts an array, got: ${arg?.type()}`,
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'reduce' second parameter must be a function, got: ${arg2?.type()}`,
			);
		}
		const copy = arg.elements.slice();
		let result = arg3 ?? copy.shift();
		for (const el of copy) {
			result = applyFunction(arg2, [result, el]);
			if (result instanceof ErrorObject) return result;
		}
		return result;
	}),
	filter: new BuiltInObject(({ args }) => {
		if (args.length < 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2`,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'filter function only accepts an array. got ${arg?.type()}`,
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'filter' second parameter must be a function. got ${arg?.type()}`,
			);
		}
		const filtered: Maybe<InternalObject>[] = [];
		for (const [index, el] of arg.elements.entries()) {
			const res = applyFunction(arg2, [el, new IntegerObject(index)]);
			if (res instanceof ErrorObject) return res;
			if (res?.type() !== ObjectType.BOOLEAN_OBJ) {
				return new ErrorObject(
					`callback must evaluate to a boolean value. got ${res?.type()}`,
				);
			}
			if (res === TRUE_OBJ) {
				filtered.push(el);
			}
		}
		return new ArrayObject(filtered);
	}),
	puts: getBuiltinByName("puts")!,
};
