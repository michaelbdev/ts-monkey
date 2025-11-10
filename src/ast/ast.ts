import type { Span, Token } from "../token/token";
import type { Maybe } from "../utils/types";
export interface Node {
	tokenLiteral(): string;
	string(): string;
	span?: Span;
}
export interface Statement extends Node {
	statementNode(): void;
}
export interface Expression extends Node {
	expressionNode(): void;
}

export class Program implements Node {
	public statements: Statement[] = [];
	tokenLiteral(): string {
		if (this.statements.length > 0) {
			return this.statements[0].tokenLiteral();
		}
		return "";
	}
	string(): string {
		return this.statements.map((s) => s.string()).join("");
	}
}

export class LetStatement implements Statement {
	public span?: Span | undefined;
	constructor(
		public token: Token,
		public name?: Identifier | null,
		public value?: Expression | null,
	) {}
	statementNode() {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `${this.tokenLiteral()} ${this.name?.string()} = ${this.value?.string() || ""};`;
	}
}

export class Identifier implements Expression {
	public span?: Span | undefined;
	public defaultValue?: Expression;
	constructor(
		public token: Token,
		public value: string,
	) {}
	expressionNode() {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.value;
	}
}

export class ReturnStatement implements Statement {
	public span?: Span | undefined;
	public value: Maybe<Expression> = null;
	constructor(public token: Token) {}
	statementNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `${this.tokenLiteral()} ${this.value?.string() || ""};`;
	}
}

export class ExpressionStatement implements Statement {
	public span?: Span | undefined;
	public expression: Maybe<Expression> = null;

	constructor(public token: Token) {}
	statementNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.expression?.string() || "";
	}
}

export class IntegerLiteral implements Expression {
	public span?: Span | undefined;
	public value: number | null = null;
	constructor(public token: Token) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.token.literal;
	}
}

export class PrefixExpression implements Expression {
	public span?: Span | undefined;
	public rightExpression: Maybe<Expression> = null;
	constructor(
		public token: Token,
		public operator: string,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `(${this.operator}${this.rightExpression?.string()})`;
	}
}

export class InfixExpression implements Expression {
	public span?: Span | undefined;
	public rightExpr: Maybe<Expression> = null;
	constructor(
		public token: Token,
		public operator: string,
		public leftExpr: Expression,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `(${this.leftExpr.string()} ${this.operator} ${this.rightExpr?.string()})`;
	}
}
export class BooleanLiteral implements Expression {
	public span?: Span | undefined;
	constructor(
		public token: Token,
		public value: boolean,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.token.literal;
	}
}

export class IfExpression implements Expression {
	public span?: Span | undefined;
	public condition: Maybe<Expression> = null;
	public consequence: BlockStatement | null = null;
	public alternative: BlockStatement | null = null;

	constructor(public token: Token) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `if ${this.condition?.string()} ${this.consequence?.string()} ${this.alternative ? `else ${this.alternative.string()}` : ""} `;
	}
}
export class BlockStatement implements Statement {
	public span?: Span | undefined;
	public statements: Statement[] = [];
	constructor(public token: Token) {}
	statementNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.statements.map((s) => s.string()).join("");
	}
}
export class FunctionLiteral implements Expression {
	public span?: Span | undefined;
	public parameters: Maybe<Identifier[]> = null;
	public body: Maybe<Expression | BlockStatement> = null;
	public isArrow = false;
	constructor(public token: Token) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		if (this.isArrow) {
			return this.parameters && this.parameters.length > 1
				? `(${this.parameters.map((x) => x.string())?.join(", ")}) => ${this.body instanceof BlockStatement ? `{${this.body.string()}}` : this.body?.string()} `
				: `(${this.parameters?.at(0)?.string() || ""}) => ${this.body instanceof BlockStatement ? `{${this.body.string()}}` : this.body?.string()} `;
		}
		return `${this.tokenLiteral()}(${this.parameters?.map((p) => p.string()).join(",")}){${this.body?.string()}}`;
	}
}
export class CallExpression implements Expression {
	public span?: Span | undefined;
	constructor(
		public token: Token,
		public func: Expression | null,
		public args: Expression[] | null,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `${this.func?.string()}(${this.args?.map((a) => a.string()).join(", ")})`;
	}
}
export class StringLiteral implements Expression {
	public span?: Span | undefined;
	constructor(
		public token: Token,
		public value: string,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return this.token.literal;
	}
}
export class ArrayLiteral implements Expression {
	public span?: Span | undefined;
	constructor(
		public token: Token,
		public elements: Expression[] | null,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		const elements = this.elements?.map((v) => v.string()).join(", ");
		return `[${elements}]`;
	}
}
export class IndexExpression implements Expression {
	public span?: Span | undefined;
	public index: Maybe<Expression> = null;
	constructor(
		public token: Token,
		public left: Expression,
	) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `(${this.left.string()}[${this.index?.string()}])`;
	}
}

export class HashLiteral implements Expression {
	public span?: Span | undefined;
	public pairs: Map<Expression, Expression> | null = null;

	constructor(public token: Token) {}
	expressionNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `{${Array.from(this.pairs!.entries())
			.map(([key, value]) => `${key.string()}:${value.string()}`)
			.join(", ")}}`;
	}
}
export class ForStatement implements Statement {
	public span?: Span | undefined;
	public currItem: Maybe<Identifier> = null;
	public currIndex: Maybe<Identifier> = null;
	public iterable: Maybe<Expression>;
	public body: Maybe<BlockStatement> = null;
	constructor(public token: Token) {}
	statementNode(): void {}
	tokenLiteral(): string {
		return this.token.literal;
	}
	string(): string {
		return `${this.tokenLiteral()} (${this.currItem?.string()}, ${this.currIndex?.string()} of ${this.iterable?.string()}){
		${this.body?.string()}
		}`;
	}
}
