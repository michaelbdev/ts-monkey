import {
	ArrayLiteral,
	BlockStatement,
	BooleanLiteral,
	CallExpression,
	type Expression,
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
	PrefixExpression,
	Program,
	ReturnStatement,
	StringLiteral,
} from "../ast/ast";
import type { Lexer } from "../lexer/lexer";
import { type Token, TokenType } from "../token/token";
import type { Maybe } from "../utils/types";
type PrefixParseFn = () => Maybe<Expression>;
type InfixParseFn = (left: Expression) => Maybe<Expression>;
type ParseFnsMap<T extends PrefixParseFn | InfixParseFn> = Partial<
	Record<TokenType, T>
>;
enum Precedences {
	LOWEST = 0,
	LOGICAL_OR = 1,
	LOGICAL_AND = 2,
	EQUALS = 3,
	LESSGREATER = 4,
	SUM = 5,
	PRODUCT = 6,
	PREFIX = 7,
	CALL = 8,
	INDEX = 9,
}
export class Parser {
	private currToken!: Token;
	private peekToken!: Token;
	public errors: string[] = [];
	private prefixParseFnsMap: ParseFnsMap<PrefixParseFn> = {};
	private infixParseFnsMap: ParseFnsMap<InfixParseFn> = {};
	private precedencesMap: Partial<Record<TokenType, Precedences>> = {
		"==": Precedences.EQUALS,
		"!=": Precedences.EQUALS,
		">": Precedences.LESSGREATER,
		">=": Precedences.LESSGREATER,
		"<": Precedences.LESSGREATER,
		"<=": Precedences.LESSGREATER,
		"+": Precedences.SUM,
		"-": Precedences.SUM,
		"*": Precedences.PRODUCT,
		"/": Precedences.PRODUCT,
		"%": Precedences.PRODUCT,
		"(": Precedences.CALL,
		"||": Precedences.LOGICAL_OR,
		"&&": Precedences.LOGICAL_AND,
		"[": Precedences.INDEX,
	};

	constructor(private lexer: Lexer) {
		this.registerPrefix(TokenType.IDENT, this.parseIdentifier);
		this.registerPrefix(TokenType.TRUE, this.parseBoolean);
		this.registerPrefix(TokenType.FALSE, this.parseBoolean);
		this.registerPrefix(TokenType.LPAREN, this.parseGroupedExpression);
		this.registerPrefix(TokenType.LBRACKET, this.parseArrayLiteral);
		this.registerPrefix(TokenType.INT, this.parseIntegerLiteral);
		this.registerPrefix(TokenType.BANG, this.parsePrefixExpression);
		this.registerPrefix(TokenType.MINUS, this.parsePrefixExpression);
		this.registerPrefix(TokenType.IF, this.parseIfExpression);
		this.registerPrefix(TokenType.FUNCTION, this.parseFunctionLiteral);
		this.registerPrefix(TokenType.STRING, this.parseStringLiteral);
		this.registerPrefix(TokenType.LBRACE, this.parseHashLiteral);
		this.registerInfix(TokenType.PLUS, this.parseInfixExpression);
		this.registerInfix(TokenType.MINUS, this.parseInfixExpression);
		this.registerInfix(TokenType.SLASH, this.parseInfixExpression);
		this.registerInfix(TokenType.ASTERISK, this.parseInfixExpression);
		this.registerInfix(TokenType.EQ, this.parseInfixExpression);
		this.registerInfix(TokenType.NOT_EQ, this.parseInfixExpression);
		this.registerInfix(TokenType.LT, this.parseInfixExpression);
		this.registerInfix(TokenType.LTE, this.parseInfixExpression);
		this.registerInfix(TokenType.GT, this.parseInfixExpression);
		this.registerInfix(TokenType.GTE, this.parseInfixExpression);
		this.registerInfix(TokenType.OR, this.parseInfixExpression);
		this.registerInfix(TokenType.AND, this.parseInfixExpression);
		this.registerInfix(TokenType.REMAINDER, this.parseInfixExpression);
		this.registerInfix(TokenType.LPAREN, this.parseCallExpression);
		this.registerInfix(TokenType.LBRACKET, this.parseIndexExpression);
		this.nextToken();
		this.nextToken();
	}
	private nextToken() {
		this.currToken = this.peekToken;
		this.peekToken = this.lexer.nextToken();
	}

	parseProgram() {
		const program = new Program();
		while (!this.currTokenIs(TokenType.EOF)) {
			const statement = this.parseStatement();
			if (statement) {
				program.statements.push(statement);
			}
			this.nextToken();
		}
		return program;
	}

	private parseStatement() {
		switch (this.currToken?.type) {
			case TokenType.LET:
				return this.parseLetStatement();
			case TokenType.RETURN:
				return this.parseReturnStatement();
			case TokenType.FOR:
				return this.parseForStatement();
			default:
				return this.parseExpressionStatement();
		}
	}
	private parseLetStatement() {
		const statement = new LetStatement(this.currToken);
		if (!this.expectPeek(TokenType.IDENT)) {
			return null;
		}
		statement.name = new Identifier(this.currToken, this.currToken.literal);
		statement.name.span = this.currToken.span;
		if (!this.expectPeek(TokenType.ASSIGN)) {
			return null;
		}

		this.nextToken();
		statement.value = this.parseExpression(Precedences.LOWEST);
		if (this.peekTokenIs(TokenType.SEMICOLON)) {
			this.nextToken();
		}
		statement.span = {
			start: statement.token.span.start,
			// TODO: fix nullability
			end: statement.value!.span!.end,
		};
		return statement;
	}
	private parseReturnStatement() {
		const token = this.currToken;
		const statement = new ReturnStatement(this.currToken);
		this.nextToken();
		statement.value = this.parseExpression(Precedences.LOWEST);
		statement.span = {
			start: token.span.start,
			end: statement.value!.span!.end,
		};
		if (this.peekTokenIs(TokenType.SEMICOLON)) {
			this.nextToken();
		}
		return statement;
	}
	private parseExpressionStatement() {
		const token = this.currToken;
		const statement = new ExpressionStatement(this.currToken);
		statement.expression = this.parseExpression(Precedences.LOWEST);
		statement.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};
		if (this.peekTokenIs(TokenType.SEMICOLON)) {
			this.nextToken();
		}
		return statement;
	}
	private parseForStatement() {
		const token = this.currToken;
		const statement = new ForStatement(this.currToken);
		if (!this.expectPeek(TokenType.LPAREN)) {
			return null;
		}
		this.nextToken();
		statement.currItem = new Identifier(this.currToken, this.currToken.literal);
		statement.currItem.span = this.currToken.span;
		if (this.peekTokenIs(TokenType.COMMA)) {
			this.nextToken();
			this.nextToken();
			statement.currIndex = new Identifier(
				this.currToken,
				this.currToken.literal,
			);
			statement.currIndex.span = this.currToken.span;
		}

		if (!this.expectPeek(TokenType.IN)) {
			return null;
		}
		this.nextToken();
		statement.iterable = this.parseExpression(Precedences.LOWEST);
		if (!this.expectPeek(TokenType.RPAREN)) {
			return null;
		}

		if (!this.expectPeek(TokenType.LBRACE)) {
			return null;
		}

		statement.body = this.parseBlockStatement();
		statement.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};
		if (this.peekTokenIs(TokenType.SEMICOLON)) {
			this.nextToken();
		}
		return statement;
	}
	private noPrefixParseFnError = (type: TokenType) => {
		this.errors.push(`no parse function found for type ${type}`);
	};
	private parseExpression(precedence: Precedences) {
		const prefixFn = this.prefixParseFnsMap[this.currToken.type];
		if (!prefixFn) {
			this.noPrefixParseFnError(this.currToken.type);
			return null;
		}
		let leftHandExpr = prefixFn();
		while (
			!this.peekTokenIs(TokenType.SEMICOLON) &&
			precedence < this.peekPrecedence()
		) {
			const infixFn = this.infixParseFnsMap[this.peekToken.type];
			if (!infixFn) return leftHandExpr;
			this.nextToken();
			if (leftHandExpr) {
				leftHandExpr = infixFn(leftHandExpr);
			}
		}
		return leftHandExpr;
	}
	private parseIntegerLiteral = () => {
		const expr = new IntegerLiteral(this.currToken);
		expr.span = this.currToken.span;
		const value = Number.parseInt(this.currToken.literal);
		if (Number.isNaN(value)) {
			this.errors.push(`could not parse ${this.currToken.literal} as integer`);
			return null;
		}
		expr.value = value;
		return expr;
	};
	private parseBoolean = () => {
		const expr = new BooleanLiteral(
			this.currToken,
			this.currTokenIs(TokenType.TRUE),
		);
		expr.span = this.currToken.span;
		return expr;
	};
	private parsePrefixExpression = () => {
		const prefixToken = this.currToken;
		const expr = new PrefixExpression(this.currToken, this.currToken.literal);
		this.nextToken();
		expr.rightExpression = this.parseExpression(Precedences.PREFIX);
		expr.span = {
			start: prefixToken.span.start,
			end: expr!.rightExpression!.span!.end,
		};
		return expr;
	};

	private parseInfixExpression = (left: Expression) => {
		const expression = new InfixExpression(
			this.currToken,
			this.currToken.literal,
			left,
		);
		const currPrecedence = this.currPrecedence();
		this.nextToken();
		expression.rightExpr = this.parseExpression(currPrecedence);
		expression.span = {
			start: expression.leftExpr.span!.start,
			end: expression.rightExpr!.span!.end,
		};
		return expression;
	};
	private parseGroupedExpression = () => {
		const token = this.currToken;
		this.nextToken();
		const expression = this.parseExpression(Precedences.LOWEST);
		if (!this.expectPeek(TokenType.RPAREN)) {
			return null;
		}
		expression!.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};
		return expression;
	};
	private parseIfExpression = () => {
		const token = this.currToken;
		const expression = new IfExpression(this.currToken);
		if (!this.expectPeek(TokenType.LPAREN)) {
			return null;
		}
		this.nextToken();
		expression.condition = this.parseExpression(Precedences.LOWEST);
		if (!this.expectPeek(TokenType.RPAREN)) return null;
		if (!this.expectPeek(TokenType.LBRACE)) return null;
		expression.consequence = this.parseBlockStatement();
		if (this.peekTokenIs(TokenType.ELSE)) {
			this.nextToken();
			if (!this.expectPeek(TokenType.LBRACE)) return null;
			expression.alternative = this.parseBlockStatement();
		}
		expression.span = {
			start: token.span.start,
			end: expression.alternative
				? expression.alternative.span!.end
				: expression.consequence!.span!.end,
		};
		return expression;
	};

	private parseFunctionLiteral = () => {
		const token = this.currToken;
		const expression = new FunctionLiteral(this.currToken);
		// if parens are left off the function we try to parse it as a concise arrow fn
		if (this.peekTokenIs(TokenType.IDENT)) {
			return this.tryParseConciseArrowFn(expression);
		}
		if (!this.expectPeek(TokenType.LPAREN)) return null;

		expression.parameters = this.parseFnParameters();
		if (this.peekTokenIs(TokenType.ARROW)) {
			expression.isArrow = true;
			this.nextToken();
			return this.parseArrowFunctionLiteral(expression);
		}
		if (!this.expectPeek(TokenType.LBRACE)) return null;

		expression.body = this.parseBlockStatement();
		expression.span = {
			start: token.span.start,
			end: expression.body.span!.end,
		};

		return expression;
	};
	private parseArrowFunctionLiteral = (expr: FunctionLiteral) => {
		this.nextToken();
		if (this.currTokenIs(TokenType.LBRACE)) {
			expr.body = this.parseBlockStatement();
		} else {
			expr.body = this.parseExpression(Precedences.LOWEST);
		}
		expr.span = {
			start: expr.token.span.start,
			end: expr.body!.span!.end,
		};
		return expr;
	};
	private tryParseConciseArrowFn(expr: FunctionLiteral) {
		this.nextToken();
		// either the function is a normal function or there are multiple parameters, both of which can't be parsed as a concise arrow fn
		if (!this.peekTokenIs(TokenType.ARROW)) {
			this.errors.push(
				"a functions parentheses may only be left out if the function is an arrow function and if there is only one parameter.",
			);
			return null;
		}
		expr.isArrow = true;
		expr.parameters = [new Identifier(this.currToken, this.currToken.literal)];
		this.nextToken();

		return this.parseArrowFunctionLiteral(expr);
	}
	private parseFnParameters() {
		const parameters: Identifier[] = [];
		if (this.peekTokenIs(TokenType.RPAREN)) {
			this.nextToken();
			return parameters;
		}
		this.nextToken();
		const param = new Identifier(this.currToken, this.currToken.literal);
		param.span = this.currToken.span;
		parameters.push(param);
		while (this.peekTokenIs(TokenType.COMMA)) {
			this.nextToken();
			this.nextToken();
			const ident = new Identifier(this.currToken, this.currToken.literal);
			ident.span = this.currToken.span;
			parameters.push(ident);
		}
		if (!this.expectPeek(TokenType.RPAREN)) return null;
		return parameters;
	}
	private parseCallExpression = (func: Expression) => {
		const token = this.currToken;
		const args = this.parseExpressionList(TokenType.RPAREN);
		const callExpr = new CallExpression(token, func, args);
		callExpr.span = {
			start: func.span!.start,
			end: this.currToken.span.end,
		};
		return callExpr;
	};
	private parseExpressionList = (end: TokenType) => {
		const arr: Expression[] = [];
		if (this.peekTokenIs(end)) {
			this.nextToken();
			return arr;
		}
		this.nextToken();
		arr.push(this.parseExpression(Precedences.LOWEST)!);
		while (this.peekTokenIs(TokenType.COMMA)) {
			this.nextToken();
			this.nextToken();
			arr.push(this.parseExpression(Precedences.LOWEST)!);
		}
		if (!this.expectPeek(end)) return null;
		return arr;
	};
	private parseBlockStatement() {
		const token = this.currToken;
		const block = new BlockStatement(this.currToken);
		this.nextToken();
		while (
			!this.currTokenIs(TokenType.RBRACE) &&
			!this.currTokenIs(TokenType.EOF)
		) {
			const statement = this.parseStatement();
			if (statement) {
				block.statements.push(statement);
			}
			this.nextToken();
		}
		block.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};

		return block;
	}
	private parseStringLiteral = () => {
		const expr = new StringLiteral(this.currToken, this.currToken.literal);
		expr.span = this.currToken.span;
		return expr;
	};
	private parseArrayLiteral = () => {
		const token = this.currToken;
		const arr = this.parseExpressionList(TokenType.RBRACKET);
		const literal = new ArrayLiteral(token, arr);
		literal.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};
		return literal;
	};
	private parseHashLiteral = () => {
		const hash = new HashLiteral(this.currToken);
		const token = this.currToken;
		hash.pairs = new Map();
		while (!this.peekTokenIs(TokenType.RBRACE)) {
			this.nextToken();
			const key = this.parseExpression(Precedences.LOWEST);
			if (!this.expectPeek(TokenType.COLON)) {
				return null;
			}
			this.nextToken();
			const value = this.parseExpression(Precedences.LOWEST);
			hash.pairs.set(key!, value!);
			if (
				!this.peekTokenIs(TokenType.RBRACE) &&
				!this.expectPeek(TokenType.COMMA)
			) {
				return null;
			}
		}
		if (!this.expectPeek(TokenType.RBRACE)) return null;
		hash.span = {
			start: token.span.start,
			end: this.currToken.span.end,
		};
		return hash;
	};
	private parseIndexExpression = (left: Expression) => {
		const indexExpr = new IndexExpression(this.currToken, left);
		this.nextToken();
		indexExpr.index = this.parseExpression(Precedences.LOWEST);
		if (!this.expectPeek(TokenType.RBRACKET)) return null;
		indexExpr.span = {
			start: left.span!.start,
			end: this.currToken.span.end,
		};
		return indexExpr;
	};
	private currTokenIs(type: TokenType) {
		return this.currToken.type === type;
	}

	private peekTokenIs(type: TokenType) {
		return this.peekToken.type === type;
	}
	private expectPeek(type: TokenType) {
		if (this.peekTokenIs(type)) {
			this.nextToken();
			return true;
		}
		this.peekError(type);
		return false;
	}
	private registerPrefix = (type: TokenType, fn: PrefixParseFn) => {
		this.prefixParseFnsMap[type] = fn;
	};
	private registerInfix(type: TokenType, fn: InfixParseFn) {
		this.infixParseFnsMap[type] = fn;
	}

	private peekError(type: TokenType) {
		const msg = `expected next token to be ${type}, got ${this.peekToken.type}`;
		this.errors.push(msg);
	}
	private peekPrecedence() {
		return this.precedencesMap[this.peekToken.type] || Precedences.LOWEST;
	}
	private currPrecedence() {
		return this.precedencesMap[this.currToken.type] || Precedences.LOWEST;
	}
	// auto bind this
	private parseIdentifier = () => {
		const identifier = new Identifier(this.currToken, this.currToken.literal);
		identifier.span = this.currToken.span;
		return identifier;
	};
}
