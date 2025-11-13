import {
	ArrayLiteral,
	BlockStatement,
	BooleanLiteral,
	CallExpression,
	ExpressionStatement,
	ForStatement,
	FunctionLiteral,
	HashLiteral,
	Identifier,
	IfExpression,
	IndexExpression,
	InfixExpression,
	IntegerLiteral,
	LetStatement,
	type Node,
	PrefixExpression,
	Program,
	ReturnStatement,
	StringLiteral,
} from "../ast/ast";
import { type Instructions, OpCodes, make } from "../code/code";
import { builtins } from "../object/builtins";
import {
	CompiledFunctionObject,
	ErrorObject,
	IntegerObject,
	type InternalObject,
	StringObject,
} from "../object/object";
import type { Span } from "../token/token";
import type { Maybe } from "../utils/types";
import { SymbolScope, SymbolTable, type SymbolType } from "./symbol-table";

export class Compiler {
	public scopeIndex = 0;
	public scopes: CompilationScope[] = [
		{
			instructions: new Uint8Array(),
			lastInstruction: undefined,
			previousInstruction: undefined,
		},
	];
	public spanMap = new Map<number, Span>();
	constructor(
		private constants: Maybe<InternalObject>[] = [],
		public symbolTable: SymbolTable = new SymbolTable(),
	) {
		builtins.forEach((b, i) => symbolTable.defineBuiltin(i, b.name));
	}

	compile(node: Maybe<Node>) {
		if (node instanceof Program) {
			for (const statement of node.statements) {
				this.compile(statement);
			}
		}
		if (node instanceof ExpressionStatement) {
			this.compile(node.expression);
			this.emit(OpCodes.OpPop, node.span);
		}
		if (node instanceof BooleanLiteral) {
			if (node.value) {
				this.emit(OpCodes.OpTrue, node.span);
			} else {
				this.emit(OpCodes.OpFalse, node.span);
			}
		}
		if (node instanceof InfixExpression) {
			const span = {
				...node.span!,
				operatorSpan: node.token.span,
				rhsSpan: node.rightExpr?.span,
			};
			if (node.operator === "<") {
				this.compile(node.rightExpr);
				this.compile(node.leftExpr);
				this.emit(OpCodes.OpGreaterThan, span);
				return null;
			}
			if (node.operator === "<=") {
				this.compile(node.rightExpr);
				this.compile(node.leftExpr);
				this.emit(OpCodes.OpGreaterThanOrEqual, span);
				return null;
			}
			this.compile(node.leftExpr);
			this.compile(node.rightExpr);
			switch (node.operator) {
				case "+":
					this.emit(OpCodes.OpAdd, span);
					break;

				case "-":
					this.emit(OpCodes.OpSub, span);
					break;

				case "*":
					this.emit(OpCodes.OpMult, span);
					break;
				case "/":
					this.emit(OpCodes.OpDiv, span);
					break;
				case "%": {
					this.emit(OpCodes.OpRem, span);
					break;
				}

				case "==":
					this.emit(OpCodes.OpEqual, span);
					break;

				case "!=":
					this.emit(OpCodes.OpNotEqual, span);
					break;

				case ">":
					this.emit(OpCodes.OpGreaterThan, span);
					break;
				case ">=":
					this.emit(OpCodes.OpGreaterThanOrEqual, span);
					break;

				case "||":
					this.emit(OpCodes.OpOr, span);
					break;
				case "&&":
					this.emit(OpCodes.OpAnd, span);
					break;
				default:
					break;
			}
		}
		if (node instanceof IfExpression) {
			this.compile(node.condition);
			const jumpNotTruthyPos = this.emit(
				OpCodes.OpJumpNotTruthy,
				node.span,
				9999,
			);

			this.symbolTable = SymbolTable.newBlockScope(this.symbolTable);
			this.compile(node.consequence);
			this.symbolTable = this.symbolTable.outer!;

			if (this.lastInstructionIs(OpCodes.OpPop)) {
				this.removeLastPop();
			} else {
				this.emit(OpCodes.OpNull, node.span);
			}

			const jumpPos = this.emit(OpCodes.OpJump, node.span, 9999);
			const afterConsequencePos = this.currentInstructions.length;
			this.changeOperand(jumpNotTruthyPos, afterConsequencePos);

			if (!node.alternative) {
				this.emit(OpCodes.OpNull, node.span);
			} else {
				this.symbolTable = SymbolTable.newBlockScope(this.symbolTable);
				this.compile(node.alternative);
				this.symbolTable = this.symbolTable.outer!;

				if (this.lastInstructionIs(OpCodes.OpPop)) {
					this.removeLastPop();
				} else {
					this.emit(OpCodes.OpNull, node.span);
				}
			}

			const afterAlternativePos = this.currentInstructions.length;
			this.changeOperand(jumpPos, afterAlternativePos);
		}
		if (node instanceof BlockStatement) {
			for (const statement of node.statements) {
				this.compile(statement);
			}
		}
		if (node instanceof PrefixExpression) {
			this.compile(node.rightExpression);
			switch (node.operator) {
				case "!":
					this.emit(OpCodes.OpBang, node.span);
					break;
				case "-":
					this.emit(OpCodes.OpMinus, node.token.span);
					break;

				default:
					break;
			}
		}
		if (node instanceof LetStatement) {
			if (node.name && this.symbolTable.existsInScope(node.name.value)) {
				throw new ErrorObject(
					`variable "${node.name.value}" has already been declared`,
					node.name.span,
				);
			}
			let symbol: SymbolType;
			if (node.value instanceof FunctionLiteral) {
				symbol = this.symbolTable.define(node.name?.value!);
				this.compile(node.value);
			} else {
				this.compile(node.value);
				symbol = this.symbolTable.define(node.name?.value!);
			}
			if (symbol.scope === SymbolScope.GlobalScope) {
				this.emit(OpCodes.OpSetGlobal, node.span, symbol.index);
			} else {
				this.emit(OpCodes.OpSetLocal, node.span, symbol.index);
			}
		}
		if (node instanceof Identifier) {
			const symbol = this.symbolTable.resolve(node.value);
			if (!symbol) {
				throw new ErrorObject(`identifier not found: ${node.value}`, node.span);
			}
			this.loadSymbol(symbol, node.span);
		}

		if (node instanceof ArrayLiteral) {
			node.elements?.forEach((el) => this.compile(el));
			this.emit(OpCodes.OpArray, node.span, node.elements?.length!);
		}

		if (node instanceof HashLiteral) {
			const keys = Array.from(node.pairs!.keys());
			const keySpans = keys.map((k) => k.span!);
			keys.forEach((key) => {
				this.compile(key);
				this.compile(node.pairs?.get(key));
			});
			const span = {
				...node.span!,
				keySpans,
			};
			this.emit(OpCodes.OpHash, span, node.pairs!.size);
		}

		if (node instanceof IntegerLiteral) {
			const integer = new IntegerObject(node.value!);
			this.emit(OpCodes.OpConstant, node.span, this.addConstant(integer));
		}
		if (node instanceof StringLiteral) {
			this.emit(
				OpCodes.OpConstant,
				node.span,
				this.addConstant(new StringObject(node.value)),
			);
		}

		if (node instanceof FunctionLiteral) {
			this.enterScope();

			node.parameters?.forEach((param, index) => {
				this.symbolTable.define(param.value);
				if (param.defaultValue) {
					this.emit(OpCodes.OpArgCount, param.span);
					this.emit(
						OpCodes.OpConstant,
						param.span,
						this.addConstant(new IntegerObject(index)),
					);
					this.emit(OpCodes.OpGreaterThan, param.span);

					const jumpOverDefault = this.emit(
						OpCodes.OpJumpNotTruthy,
						param.span,
						9999,
					);
					const skipDefault = this.emit(OpCodes.OpJump, param.span, 9999);

					const defaultStart = this.currentInstructions.length;
					this.changeOperand(jumpOverDefault, defaultStart);

					this.compile(param.defaultValue);
					this.emit(OpCodes.OpSetLocal, param.span, index);

					const afterDefault = this.currentInstructions.length;
					this.changeOperand(skipDefault, afterDefault);
				}
			});
			this.compile(node.body);
			// i.e an arrow function without a block statement body e.g let onePlusTen = fn ()=> 1+10
			const isShortenedArrow =
				node.isArrow && !(node.body instanceof BlockStatement);
			if (this.lastInstructionIs(OpCodes.OpPop)) {
				this.removeLastPop();
				this.emit(OpCodes.OpReturnValue, node.span);
			} else if (isShortenedArrow) {
				this.emit(OpCodes.OpReturnValue, node.span);
			}

			if (!this.lastInstructionIs(OpCodes.OpReturnValue)) {
				this.emit(OpCodes.OpReturn, node.span);
			}

			const numLocals = this.symbolTable.numDefs;
			const free = this.symbolTable.freeSymbols;
			const instructions = this.leaveScope();

			const hasDefault = node.parameters?.map((p) => !!p.defaultValue) || [];
			free.forEach((sym) => this.loadSymbol(sym, node.span));
			const fn = new CompiledFunctionObject(
				instructions,
				numLocals,
				node.parameters!.length,
				hasDefault,
			);
			const index = this.addConstant(fn);
			this.emit(OpCodes.OpClosure, node.span, index, free.length);
		}
		if (node instanceof CallExpression) {
			this.compile(node.func);
			node.args?.forEach((arg) => this.compile(arg));
			const argSpans = node.args?.map((a) => a.span!) || [];
			const span: Span = { ...node.span!, fnSpan: node!.func!.span, argSpans };
			this.emit(OpCodes.OpCall, span, node.args!.length);
		}
		if (node instanceof ForStatement) {
			this.compile(node.iterable);
			this.enterScope();

			this.symbolTable.define(node.currItem!.value);
			if (node.currIndex) {
				this.symbolTable.define(node.currIndex.value);
			}

			this.compile(node.body);
			this.emit(OpCodes.OpPopFrame, node.span);

			const free = this.symbolTable.freeSymbols;
			const numDefs = this.symbolTable.numDefs;

			const instructions = this.leaveScope();
			free.forEach((sym) => this.loadSymbol(sym, node.span));

			const fn = new CompiledFunctionObject(
				instructions,
				numDefs,
				node.currIndex ? 2 : 1,
			);

			const argSpans = [node.iterable?.span!];
			const index = this.addConstant(fn);
			this.emit(
				OpCodes.OpFor,
				{ ...node.span!, argSpans },
				index,
				node.currIndex ? 2 : 1,
				free.length,
			);
			this.emit(OpCodes.OpNull, node.span);
			this.emit(OpCodes.OpPop, node.span);
		}
		if (node instanceof ReturnStatement) {
			this.compile(node.value);
			this.emit(OpCodes.OpReturnValue, node.span);
		}
		if (node instanceof IndexExpression) {
			this.compile(node.left);
			this.compile(node.index);
			const span = { ...node.left.span!, indexSpan: node.index?.span };
			this.emit(OpCodes.OpIndex, span);
		}

		return null;
	}
	private loadSymbol(symbol: SymbolType, span: Span | undefined) {
		switch (symbol.scope) {
			case SymbolScope.GlobalScope:
				this.emit(OpCodes.OpGetGlobal, span, symbol.index);
				break;
			case SymbolScope.BuiltinScope:
				this.emit(OpCodes.OpGetBuiltin, span, symbol.index);
				break;
			case SymbolScope.LocalScope:
				this.emit(OpCodes.OpGetLocal, span, symbol.index);
				break;
			case SymbolScope.FreeScope:
				this.emit(OpCodes.OpGetFree, span, symbol.index);
				break;
			default:
				break;
		}
	}
	private addConstant(obj: Maybe<InternalObject>) {
		this.constants.push(obj);
		return this.constants.length - 1;
	}
	emit(op: OpCodes, span: Span | undefined, ...operands: number[]) {
		const instruction = make(op, ...operands);
		const pos = this.addInstruction(instruction);
		this.setLastInstruction(op, pos);
		if (span) {
			this.spanMap.set(pos, span);
		}
		return pos;
	}
	private setLastInstruction(op: OpCodes, pos: number) {
		const prev = this.scopes[this.scopeIndex].lastInstruction;
		this.scopes[this.scopeIndex].lastInstruction = { opcode: op, pos };
		this.scopes[this.scopeIndex].previousInstruction = prev;
	}
	private removeLastPop() {
		const currScope = this.scopes[this.scopeIndex];
		currScope.instructions = this.currentInstructions.slice(
			0,
			currScope.lastInstruction?.pos,
		);
		currScope.lastInstruction = currScope.previousInstruction;
	}

	private replaceInstruction(pos: number, newInstruction: Uint8Array) {
		for (let i = 0; i < newInstruction.length; i++) {
			this.currentInstructions[pos + i] = newInstruction[i];
		}
	}

	private changeOperand(opPos: number, operand: number) {
		const newInstruction = make(
			this.scopes[this.scopeIndex].instructions[opPos],
			operand,
		);
		this.replaceInstruction(opPos, newInstruction);
	}
	enterScope() {
		this.symbolTable = SymbolTable.newEnclosedSymbolTable(this.symbolTable);
		const scope: CompilationScope = {
			instructions: new Uint8Array(),
			lastInstruction: undefined,
			previousInstruction: undefined,
		};
		this.scopes.push(scope);
		this.scopeIndex++;
	}
	leaveScope() {
		this.symbolTable = this.symbolTable.outer!;
		const instructions = this.currentInstructions;
		this.scopes.pop();
		this.scopeIndex--;
		return instructions;
	}
	private addInstruction(ins: Uint8Array) {
		const pos = this.currentInstructions.length;
		const newArr = new Uint8Array(this.currentInstructions.length + ins.length);
		newArr.set(this.currentInstructions);
		newArr.set(ins, this.currentInstructions.length);
		this.scopes[this.scopeIndex].instructions = newArr;
		return pos;
	}
	private lastInstructionIs(op: OpCodes) {
		return this.scopes[this.scopeIndex].lastInstruction?.opcode === op;
	}
	bytecode() {
		return new Bytecode(this.currentInstructions, this.constants, this.spanMap);
	}
	private get currentInstructions() {
		return this.scopes[this.scopeIndex].instructions;
	}
}

export class Bytecode {
	constructor(
		public instructions: Instructions,
		public constants: Maybe<InternalObject>[],
		public spanMap: Map<number, Span>,
	) {}
}

type EmittedInstruction = {
	opcode: OpCodes;
	pos: number;
};

type CompilationScope = {
	instructions: Instructions;
	previousInstruction: Maybe<EmittedInstruction>;
	lastInstruction: Maybe<EmittedInstruction>;
};
