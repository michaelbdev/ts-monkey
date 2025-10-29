export enum TokenType {
	ILLEGAL = "ILLEGAL",
	EOF = "EOF",

	// identifiers & literals
	IDENT = "IDENT",
	INT = "INT",
	STRING = "STRING",

	//operators
	ASSIGN = "=",
	PLUS = "+",
	MINUS = "-",
	BANG = "!",
	ASTERISK = "*",
	SLASH = "/",
	LT = "<",
	LTE = "<=",
	GT = ">",
	GTE = ">=",
	EQ = "==",
	NOT_EQ = "!=",
	OR = "||",
	AND = "&&",
	ARROW = "=>",
	REMAINDER = "%",

	//delimiters
	COMMA = ",",
	SEMICOLON = ";",
	COLON = ":",
	LPAREN = "(",
	RPAREN = ")",
	LBRACE = "{",
	RBRACE = "}",
	LBRACKET = "[",
	RBRACKET = "]",

	//keywords
	LET = "LET",
	FUNCTION = "FUNCTION",
	TRUE = "TRUE",
	FALSE = "FALSE",
	IF = "IF",
	ELSE = "ELSE",
	RETURN = "RETURN",
	FOR = "FOR",
	IN = "IN",
}
const keywordMap: Record<string, TokenType> = {
	fn: TokenType.FUNCTION,
	let: TokenType.LET,
	if: TokenType.IF,
	else: TokenType.ELSE,
	true: TokenType.TRUE,
	false: TokenType.FALSE,
	return: TokenType.RETURN,
	for: TokenType.FOR,
	in: TokenType.IN,
};

export function lookupIdentifier(identifer: string) {
	if (keywordMap[identifer]) {
		return keywordMap[identifer];
	}
	return TokenType.IDENT;
}

type Span = {
	start: number;
	end: number;
};
export type Token = {
	type: TokenType;
	literal: string;
	span: Span;
};
