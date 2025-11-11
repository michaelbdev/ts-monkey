export type Instructions = Uint8Array;
export type OpCode = number;

export enum OpCodes {
	OpConstant,
	OpAdd,
	OpPop,
	OpSub,
	OpMult,
	OpDiv,
	OpRem,
	OpTrue,
	OpFalse,
	OpOr,
	OpAnd,
	OpEqual,
	OpNotEqual,
	OpGreaterThan,
	OpGreaterThanOrEqual,
	OpMinus,
	OpBang,
	OpJump,
	OpJumpNotTruthy,
	OpNull,
	OpSetGlobal,
	OpGetGlobal,
	OpArray,
	OpHash,
	OpIndex,
	OpCall,
	OpReturnValue,
	OpReturn,
	OpSetLocal,
	OpGetLocal,
	OpGetBuiltin,
	OpClosure,
	OpGetFree,
	OpFor,
	OpPopFrame,
	OpArgCount,
}
type Definition = {
	name: string;
	char?: string;
	// num of bytes each operand takes up so [1,2] would be a 1 byte (8 bit) operand followed by a 2 byte (16 bit) operand e.g [255,65535]
	operandWidths: number[];
};

export const definitionsMap: Record<OpCodes, Definition> = {
	[OpCodes.OpConstant]: {
		name: OpCodes[OpCodes.OpConstant],
		operandWidths: [2],
	},
	[OpCodes.OpAdd]: {
		name: OpCodes[OpCodes.OpAdd],
		char: "+",
		operandWidths: [],
	},
	[OpCodes.OpPop]: {
		name: OpCodes[OpCodes.OpPop],
		operandWidths: [],
	},
	[OpCodes.OpSub]: {
		name: OpCodes[OpCodes.OpSub],
		char: "-",
		operandWidths: [],
	},
	[OpCodes.OpMult]: {
		name: OpCodes[OpCodes.OpMult],
		char: "*",
		operandWidths: [],
	},
	[OpCodes.OpDiv]: {
		name: OpCodes[OpCodes.OpDiv],
		char: "/",

		operandWidths: [],
	},

	[OpCodes.OpTrue]: {
		name: OpCodes[OpCodes.OpTrue],
		operandWidths: [],
	},
	[OpCodes.OpFalse]: {
		name: OpCodes[OpCodes.OpFalse],
		operandWidths: [],
	},
	[OpCodes.OpEqual]: {
		name: OpCodes[OpCodes.OpEqual],
		char: "==",

		operandWidths: [],
	},
	[OpCodes.OpNotEqual]: {
		name: OpCodes[OpCodes.OpNotEqual],
		char: "!=",

		operandWidths: [],
	},
	[OpCodes.OpGreaterThan]: {
		name: OpCodes[OpCodes.OpGreaterThan],
		char: ">",
		operandWidths: [],
	},
	[OpCodes.OpGreaterThanOrEqual]: {
		name: OpCodes[OpCodes.OpGreaterThanOrEqual],
		char: ">=",
		operandWidths: [],
	},
	[OpCodes.OpMinus]: {
		name: OpCodes[OpCodes.OpMinus],
		char: "-",
		operandWidths: [],
	},
	[OpCodes.OpBang]: {
		name: OpCodes[OpCodes.OpBang],
		char: "!",
		operandWidths: [],
	},
	[OpCodes.OpJump]: {
		name: OpCodes[OpCodes.OpJump],
		operandWidths: [2],
	},
	[OpCodes.OpJumpNotTruthy]: {
		name: OpCodes[OpCodes.OpJumpNotTruthy],
		operandWidths: [2],
	},
	[OpCodes.OpNull]: {
		name: OpCodes[OpCodes.OpNull],
		operandWidths: [],
	},
	[OpCodes.OpSetGlobal]: {
		name: OpCodes[OpCodes.OpSetGlobal],
		operandWidths: [2],
	},
	[OpCodes.OpGetGlobal]: {
		name: OpCodes[OpCodes.OpGetGlobal],
		operandWidths: [2],
	},
	[OpCodes.OpArray]: {
		name: OpCodes[OpCodes.OpArray],
		operandWidths: [2],
	},
	// operand is number of key value _pairs_ a hash has
	[OpCodes.OpHash]: {
		name: OpCodes[OpCodes.OpHash],
		operandWidths: [2],
	},
	[OpCodes.OpIndex]: {
		name: OpCodes[OpCodes.OpIndex],
		operandWidths: [],
	},
	[OpCodes.OpOr]: {
		name: OpCodes[OpCodes.OpOr],
		char: "||",

		operandWidths: [],
	},
	[OpCodes.OpAnd]: {
		name: OpCodes[OpCodes.OpAnd],
		char: "&&",
		operandWidths: [],
	},
	[OpCodes.OpCall]: {
		name: OpCodes[OpCodes.OpCall],
		operandWidths: [1],
	},
	[OpCodes.OpReturnValue]: {
		name: OpCodes[OpCodes.OpReturnValue],
		operandWidths: [],
	},
	[OpCodes.OpReturn]: {
		name: OpCodes[OpCodes.OpReturn],
		operandWidths: [],
	},
	[OpCodes.OpSetLocal]: {
		name: OpCodes[OpCodes.OpSetLocal],
		operandWidths: [1],
	},
	[OpCodes.OpGetLocal]: {
		name: OpCodes[OpCodes.OpGetLocal],
		operandWidths: [1],
	},
	[OpCodes.OpGetBuiltin]: {
		name: OpCodes[OpCodes.OpGetBuiltin],
		operandWidths: [1],
	},
	[OpCodes.OpClosure]: {
		name: OpCodes[OpCodes.OpClosure],
		operandWidths: [2, 1],
	},
	[OpCodes.OpGetFree]: {
		name: OpCodes[OpCodes.OpGetFree],
		operandWidths: [1],
	},
	[OpCodes.OpFor]: {
		name: OpCodes[OpCodes.OpFor],
		// this is essentially an opclosure and opcall combined.
		//operands: constant index, number of 'args' which refers to item and index where index could be left off so will always be either 1 or 2 args, free variables
		operandWidths: [2, 1, 1],
	},
	[OpCodes.OpPopFrame]: {
		name: OpCodes[OpCodes.OpPopFrame],
		operandWidths: [],
	},
	[OpCodes.OpRem]: {
		name: OpCodes[OpCodes.OpRem],
		char: "%",
		operandWidths: [],
	},
	[OpCodes.OpArgCount]: {
		name: OpCodes[OpCodes.OpArgCount],
		operandWidths: [],
	},
};
export const lookupOpCode = (opcode: OpCodes) => {
	const def = definitionsMap[opcode];
	if (!def) {
		throw new Error(`opcode undefined ${opcode}`);
	}
	return def;
};

export function make(opcode: OpCodes, ...operands: number[]) {
	const def = definitionsMap[opcode];
	if (!def) return new Uint8Array();
	let instructionLen = 1;
	def.operandWidths.forEach((w) => {
		instructionLen += w;
	});
	const buffer = new ArrayBuffer(instructionLen);
	const dv = new DataView(buffer);

	dv.setUint8(0, opcode);

	let offset = 1;

	operands.forEach((o, i) => {
		const width = def.operandWidths[i];
		switch (width) {
			case 2:
				dv.setUint16(offset, o);
				break;
			case 1:
				dv.setUint8(offset, o);
		}

		offset += width;
	});
	return new Uint8Array(dv.buffer);
}
export function readOperands(def: Definition, ins: Instructions) {
	const dv = new DataView(ins.buffer);
	const operands: number[] = [];
	let offset = 0;
	def.operandWidths.forEach((w, i) => {
		switch (w) {
			case 2:
				operands[i] = dv.getUint16(offset);
				break;
			case 1:
				operands[i] = dv.getUint8(offset);
				break;
			default:
				break;
		}
		offset += w;
	});
	return [operands, offset] as const;
}

export function stringify(instructions: Uint8Array) {
	const res = [];
	let i = 0;
	while (i < instructions.length) {
		const def = lookupOpCode(instructions[i]);
		const [ops, read] = readOperands(def, instructions.slice(i + 1));
		res.push(`${i.toString().padStart(4, "0")} ${formatInstruction(def, ops)}`);
		i += 1 + read;
	}
	return res.join("\n");
}
const formatInstruction = (def: Definition, ops: number[]) => {
	if (def.operandWidths.length !== ops.length) {
		throw new Error(
			`operand lengths don't match: ${def.name} expects ${def.operandWidths.length} operands, got ${ops.length}`,
		);
	}
	return `${def.name} ${ops.join(" ")}`;
};

export function readUint16(arr: Instructions, offset = 0): number {
	const highByte = arr[offset];
	const lowByte = arr[offset + 1];
	return (highByte << 8) | lowByte;
}

export function readUint8(arr: Instructions, offset = 0): number {
	return arr[offset];
}
