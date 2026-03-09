import {
	ArrayObject,
	BooleanObject,
	BuiltInObject,
	ErrorObject,
	type FunctionObject,
	HashObject,
	IntegerObject,
	type InternalObject,
	NULL_OBJ,
	ObjectType,
	StringObject,
	TRUE_OBJ,
} from "../object/object";
import type { Maybe } from "../utils/types";
import { applyFunction } from "./eval";

export const builtins: Record<string, BuiltInObject> = {
	len: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 1) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
				span,
			);
		}
		const arg = args[0];
		switch (arg?.type()) {
			case ObjectType.STRING_OBJ:
				return new IntegerObject(arg!.inspect().length);

			case ObjectType.ARRAY_OBJ:
				return new IntegerObject((arg as ArrayObject).elements.length);
			default:
				return new ErrorObject(
					`argument to 'len' not supported, got ${args[0]!.type()}`,
					argSpans[0],
				);
		}
	}),

	first: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 1) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
				span,
			);
		}
		const arg = args[0] as ArrayObject;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'first' function only accepts an array, got: ${arg.type()}`,
				argSpans[0],
			);
		}
		return arg.elements[0] || NULL_OBJ;
	}),

	last: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 1) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
				span,
			);
		}
		const arg = args[0] as ArrayObject;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'last' function only accepts an array, got: ${arg.type()}`,
				argSpans[0],
			);
		}
		return arg.elements.at(-1) || NULL_OBJ;
	}),
	rest: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 1) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=1`,
				span,
			);
		}
		const arg = args[0] as ArrayObject;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'rest' function only accepts an array, got: ${arg.type()}`,
				argSpans[0],
			);
		}
		return new ArrayObject(arg.elements.slice(1));
	}),
	push: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2`,
				span,
			);
		}
		const arg = args[0] as ArrayObject;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'push' function only accepts an array, got: ${arg.type()}`,
				argSpans[0],
			);
		}
		const clone = arg.elements.slice();
		clone.push(args[1]);

		return new ArrayObject(clone);
	}),
	set: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, argSpans } = obj;
		const hashmap = args[0] as HashObject;
		const key = args[1] as Maybe<InternalObject>;
		const value = args[2] as Maybe<InternalObject>;
		if (!(hashmap instanceof HashObject)) {
			return new ErrorObject(
				`set's first argument must be a hashmap, got ${args[0]?.type().toLowerCase()}`,
				argSpans[0],
			);
		}
		if (
			!(
				key instanceof IntegerObject ||
				key instanceof BooleanObject ||
				key instanceof StringObject
			)
		) {
			return new ErrorObject(
				`not a valid hash key: ${key?.type().toLowerCase()}`,
				argSpans[1],
			);
		}
		hashmap.pairs.set(key.value, { key, value });
		return NULL_OBJ;
	}),

	map: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2`,
				span,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'map' function only accepts an array, got: ${arg?.type()}`,
				argSpans[0],
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'map' second parameter must be a function, got: ${arg2?.type()}`,
				argSpans[1],
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
	find: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length !== 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2`,
				span,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'find' function only accepts an array, got: ${arg?.type()}`,
				argSpans[0],
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'find' second parameter must be a function, got: ${arg2?.type()}`,
				argSpans[1],
			);
		}
		for (const el of arg.elements) {
			const res = applyFunction(arg2, [el]);
			if (res instanceof ErrorObject) return res;

			if (res?.type() !== ObjectType.BOOLEAN_OBJ) {
				return new ErrorObject(
					`callback function to 'find' must evaluate to a boolean value. got: ${res?.type()}`,
					arg2.body.span,
				);
			}

			if (res?.inspect() === "true") {
				return el;
			}
		}
		return NULL_OBJ;
	}),
	reduce: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length < 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2|3`,
				span,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;
		const arg3 = args[2] as Maybe<InternalObject>;

		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'reduce' function only accepts an array, got: ${arg?.type()}`,
				argSpans[0],
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'reduce' second parameter must be a function, got: ${arg2?.type()}`,
				argSpans[1],
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
	filter: new BuiltInObject((obj) => {
		if (obj.env !== "interpreter") return;
		const { args, span, argSpans } = obj;
		if (args.length < 2) {
			return new ErrorObject(
				`wrong number of arguments. got=${args.length}, want=2`,
				span,
			);
		}
		const arg = args[0] as Maybe<ArrayObject>;
		const arg2 = args[1] as Maybe<FunctionObject>;
		if (arg?.type() !== ObjectType.ARRAY_OBJ) {
			return new ErrorObject(
				`'filter function only accepts an array. got ${arg?.type()}`,
				argSpans[0],
			);
		}
		if (arg2?.type() !== ObjectType.FUNCTION_OBJ) {
			return new ErrorObject(
				`'filter' second parameter must be a function. got ${arg?.type()}`,
				argSpans[1],
			);
		}
		const filtered: Maybe<InternalObject>[] = [];
		for (const [index, el] of arg.elements.entries()) {
			const res = applyFunction(arg2, [el, new IntegerObject(index)]);
			if (res instanceof ErrorObject) return res;
			if (res?.type() !== ObjectType.BOOLEAN_OBJ) {
				return new ErrorObject(
					`callback must evaluate to a boolean value. got ${res?.type()}`,
					arg2.body.span,
				);
			}
			if (res === TRUE_OBJ) {
				filtered.push(el);
			}
		}
		return new ArrayObject(filtered);
	}),
	puts: new BuiltInObject(({ args }) => {
		console.log(args.map((arg) => arg?.inspect()).join(" "));
		return NULL_OBJ;
	}),
};
