import { type Instructions, OpCodes, make } from "../code/code";
import { Bytecode } from "../compiler/compiler";
import type { Maybe } from "../utils/types";
import { VM } from "../vm/vm";
import {
	ArrayObject,
	BooleanObject,
	BuiltInObject,
	type ClosureObject,
	ErrorObject,
	HashObject,
	IntegerObject,
	type InternalObject,
	NULL_OBJ,
	ObjectType,
	StringObject,
	TRUE_OBJ,
} from "./object";

export const builtins: { name: string; builtin: BuiltInObject }[] = [
	{
		name: "len",
		builtin: new BuiltInObject(({ args }) => {
			if (args.length !== 1) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
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
					);
			}
		}),
	},
	{
		name: "puts",
		builtin: new BuiltInObject(({ args }) => {
			args.forEach((arg) => console.log(arg?.inspect()));
			return NULL_OBJ;
		}),
	},
	{
		name: "first",
		builtin: new BuiltInObject(({ args }) => {
			if (args.length !== 1) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
				);
			}
			const arg = args[0] as ArrayObject;
			if (arg?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'first' function only accepts an array, got: ${arg.type()}`,
				);
			}
			return arg.elements[0] || NULL_OBJ;
		}),
	},
	{
		name: "last",
		builtin: new BuiltInObject(({ args }) => {
			if (args.length !== 1) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
				);
			}
			const arg = args[0] as ArrayObject;
			if (arg?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'last' function only accepts an array, got: ${arg.type()}`,
				);
			}
			return arg.elements.at(-1) || NULL_OBJ;
		}),
	},
	{
		name: "rest",
		builtin: new BuiltInObject(({ args }) => {
			if (args.length !== 1) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
				);
			}
			const arg = args[0] as ArrayObject;
			if (arg?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'rest' function only accepts an array, got: ${arg.type()}`,
				);
			}
			return new ArrayObject(arg.elements.slice(1));
		}),
	},
	{
		name: "push",
		builtin: new BuiltInObject(({ args }) => {
			if (args.length !== 2) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=2`,
				);
			}
			const arg = args[0] as ArrayObject;
			if (arg?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'push' function only accepts an array, got: ${arg.type()}`,
				);
			}
			//const clone = arg.elements.slice();
			//clone.push(args[1]);

			arg.elements.push(args[1]);
			return args[0];
		}),
	},
	{
		name: "map",
		builtin: new BuiltInObject((obj) => {
			const { args, bytecode, globals } = assertEnvironment(obj);

			if (args.length !== 2) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
				);
			}
			const arr = args[0] as Maybe<ArrayObject>;
			const closure = args[1] as Maybe<ClosureObject>;
			const callback = closure?.fn;

			if (arr?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'map' function only accepts an array, got: ${arr?.type()}`,
				);
			}

			if (callback?.type() !== ObjectType.COMPILED_FUNCTION_OBJ) {
				return new ErrorObject(
					`'map' second parameter must be a function, got: ${callback?.type()}`,
				);
			}
			const result = [];
			const ins = replaceReturnWithPop(callback.instructions);
			for (let i = 0; i < arr.elements.length; i++) {
				const el = arr.elements[i];
				const vm2 = new VM(new Bytecode(ins, bytecode.constants), globals);
				vm2.push(el);
				vm2.push(new IntegerObject(i));
				vm2.run();
				result.push(vm2.lastPoppedElement());
			}

			return new ArrayObject(result);
		}),
	},
	{
		name: "find",
		builtin: new BuiltInObject((obj) => {
			const { args, bytecode, globals } = assertEnvironment(obj);

			if (args.length !== 2) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=1`,
				);
			}
			const arr = args[0] as Maybe<ArrayObject>;
			const closure = args[1] as Maybe<ClosureObject>;
			const callback = closure?.fn;

			if (arr?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'find' function only accepts an array, got: ${arr?.type()}`,
				);
			}
			if (callback?.type() !== ObjectType.COMPILED_FUNCTION_OBJ) {
				return new ErrorObject(
					`'find' second parameter must be a function, got: ${callback?.type()}`,
				);
			}
			const instructions = replaceReturnWithPop(callback.instructions);
			for (const el of arr.elements) {
				const vm2 = newVMForBuiltins(instructions, bytecode.constants, globals);
				vm2.push(el);
				vm2.run();
				const res = vm2.lastPoppedElement();
				if (res?.type() !== ObjectType.BOOLEAN_OBJ) {
					return new ErrorObject(
						`callback function to 'find' must evaluate to a boolean value. got: ${res?.type()}`,
					);
				}
				if (res === TRUE_OBJ) {
					return el;
				}
			}
			return NULL_OBJ;
		}),
	},
	{
		name: "reduce",
		builtin: new BuiltInObject((obj) => {
			const { args, bytecode, globals } = assertEnvironment(obj);

			if (args.length < 2) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=2|3`,
				);
			}
			const arr = args[0] as Maybe<ArrayObject>;
			const closure = args[1] as Maybe<ClosureObject>;
			const callback = closure?.fn;
			const arg3 = args[2] as Maybe<InternalObject>;

			if (arr?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'reduce' function only accepts an array, got: ${arr?.type()}`,
				);
			}
			if (callback?.type() !== ObjectType.COMPILED_FUNCTION_OBJ) {
				return new ErrorObject(
					`'reduce' second parameter must be a function, got: ${callback?.type()}`,
				);
			}
			const copy = arr.elements.slice();
			const instructions = replaceReturnWithPop(callback.instructions);

			let result = arg3 ?? copy.shift();

			for (const el of copy) {
				const vm2 = newVMForBuiltins(instructions, bytecode.constants, globals);
				vm2.push(result);
				vm2.push(el);
				vm2.run();
				result = vm2.lastPoppedElement();
			}

			return result;
		}),
	},
	{
		name: "filter",
		builtin: new BuiltInObject((obj) => {
			const { args, bytecode, globals } = assertEnvironment(obj);
			if (args.length < 2) {
				return new ErrorObject(
					`wrong number of arguments. got=${args.length}, want=2`,
				);
			}
			const arr = args[0] as Maybe<ArrayObject>;
			const closure = args[1] as Maybe<ClosureObject>;
			const callback = closure?.fn;
			if (arr?.type() !== ObjectType.ARRAY_OBJ) {
				return new ErrorObject(
					`'filter function only accepts an array. got ${arr?.type()}`,
				);
			}
			if (callback?.type() !== ObjectType.COMPILED_FUNCTION_OBJ) {
				return new ErrorObject(
					`'filter' second parameter must be a function. got ${arr?.type()}`,
				);
			}
			const filtered: Maybe<InternalObject>[] = [];
			const instructions = replaceReturnWithPop(callback.instructions);

			for (const [index, el] of arr.elements.entries()) {
				const vm2 = newVMForBuiltins(instructions, bytecode.constants, globals);
				vm2.push(el);
				vm2.push(new IntegerObject(index));
				vm2.run();
				const res = vm2.lastPoppedElement();
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
	},
	{
		name: "set",
		builtin: new BuiltInObject(({ args }) => {
			const hashmap = args[0] as HashObject;
			const key = args[1] as Maybe<InternalObject>;
			const value = args[2] as Maybe<InternalObject>;
			if (!(hashmap instanceof HashObject)) {
				return new ErrorObject(
					`set's first argument must be a hashmap, got ${args[0]?.type()}`,
				);
			}
			if (
				!(
					key instanceof IntegerObject ||
					key instanceof BooleanObject ||
					key instanceof StringObject
				)
			) {
				return new ErrorObject("not a valid hash key");
			}
			hashmap.pairs.set(key.value, { key, value });
			return NULL_OBJ;
		}),
	},
];

export function getBuiltinByName(name: string) {
	return builtins.find((b) => b.name === name)?.builtin;
}
function replaceReturnWithPop(a: Uint8Array) {
	const noReturn = a.slice(0, a.length - 1);
	const newArr = new Uint8Array(noReturn.length + 1);
	newArr.set(noReturn);
	newArr.set(make(OpCodes.OpPop), noReturn.length);
	return newArr;
}

function assertEnvironment(
	obj:
		| {
				env: "vm";
				bytecode: Bytecode;
				globals: Maybe<InternalObject>[];
				args: Maybe<InternalObject>[];
		  }
		| { env: "interpreter"; args: Maybe<InternalObject>[] },
) {
	if (obj.env !== "vm")
		throw new Error(
			"Called by wrong environment. This built in function should only be called by the vm environment",
		);
	return obj;
}
function newVMForBuiltins(
	instructions: Instructions,
	constants: Maybe<InternalObject>[],
	globals: Maybe<InternalObject>[],
) {
	return new VM(new Bytecode(instructions, constants), globals);
}
