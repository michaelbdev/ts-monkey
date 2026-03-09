import { type Token, TokenType, lookupIdentifier } from "../token/token";

type Char = string | 0;
export class Lexer {
	//current position in input
	private position = 0;
	// always the next position
	private readPosition = 0;
	private ch: Char = "";
	constructor(private input: string) {
		this.readChar();
	}
	private readChar() {
		if (this.readPosition >= this.input.length) {
			this.ch = 0;
		} else {
			this.ch = this.input[this.readPosition];
		}
		this.position = this.readPosition;
		this.readPosition += 1;
	}
	nextToken(): Token {
		let token: Token;
		this.skipWhitespace();
		if (this.isComment) {
			this.skipComment();
			return this.nextToken();
		}
		switch (this.ch) {
			case "=":
				if (this.peekChar() === "=") {
					const start = this.position;
					const currChar = this.ch;
					this.readChar();
					token = this.newToken(
						TokenType.EQ,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else if (this.peekChar() === ">") {
					const start = this.position;
					const currChar = this.ch;
					this.readChar();
					token = this.newToken(
						TokenType.ARROW,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.ASSIGN,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;

			case "(":
				token = this.newToken(
					TokenType.LPAREN,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case ")":
				token = this.newToken(
					TokenType.RPAREN,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case "{":
				token = this.newToken(
					TokenType.LBRACE,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case "}":
				token = this.newToken(
					TokenType.RBRACE,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case ",":
				token = this.newToken(
					TokenType.COMMA,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case "+":
				token = this.newToken(
					TokenType.PLUS,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case ";":
				token = this.newToken(
					TokenType.SEMICOLON,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case "-":
				token = this.newToken(
					TokenType.MINUS,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case "!":
				if (this.peekChar() === "=") {
					const start = this.position;
					const currChar = this.ch;
					this.readChar();
					token = this.newToken(
						TokenType.NOT_EQ,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.BANG,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;

			case "*":
				token = this.newToken(
					TokenType.ASTERISK,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case "/":
				token = this.newToken(
					TokenType.SLASH,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case "%":
				token = this.newToken(
					TokenType.REMAINDER,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;
			case "<":
				if (this.peekChar() === "=") {
					const currChar = this.ch;
					const start = this.position;
					this.readChar();
					token = this.newToken(
						TokenType.LTE,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.LT,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;
			case ">":
				if (this.peekChar() === "=") {
					const currChar = this.ch;
					const start = this.position;

					this.readChar();
					token = this.newToken(
						TokenType.GTE,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.GT,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;

			case '"': {
				const { literal, start, end } = this.readString();
				token = this.newToken(TokenType.STRING, literal, start, end);
				break;
			}

			case "|":
				if (this.peekChar() === "|") {
					const currChar = this.ch;
					const start = this.position;
					this.readChar();
					token = this.newToken(
						TokenType.OR,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.ILLEGAL,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;
			case "&":
				if (this.peekChar() === "&") {
					const currChar = this.ch;
					const start = this.position;
					this.readChar();
					token = this.newToken(
						TokenType.AND,
						currChar + this.ch,
						start,
						this.readPosition,
					);
				} else {
					token = this.newToken(
						TokenType.ILLEGAL,
						this.ch,
						this.position,
						this.readPosition,
					);
				}
				break;

			case "[":
				token = this.newToken(
					TokenType.LBRACKET,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case "]":
				token = this.newToken(
					TokenType.RBRACKET,
					this.ch,
					this.position,
					this.readPosition,
				);
				break;

			case ":":
				token = this.newToken(
					TokenType.COLON,
					":",
					this.position,
					this.readPosition,
				);
				break;
			case 0: {
				token = this.newToken(
					TokenType.EOF,
					"",
					this.position,
					this.readPosition,
				);
				break;
			}

			default:
				if (this.isLetter(this.ch)) {
					const { literal, start, end } = this.readIdentifier();
					return this.newToken(lookupIdentifier(literal), literal, start, end);
				}
				if (this.isDigit(this.ch)) {
					const { literal, start, end } = this.readNumber();
					return this.newToken(TokenType.INT, literal, start, end);
				}
				token = this.newToken(
					TokenType.ILLEGAL,
					this.ch,
					this.position,
					this.readPosition,
				);
		}
		this.readChar();
		return token;
	}
	private newToken(
		type: TokenType,
		literal: string,
		start: number,
		end: number,
	): Token {
		const token = {
			type,
			literal,
			span: {
				start,
				end,
			},
		};
		return token;
	}

	private readIdentifier() {
		const currPos = this.position;
		while (this.isLetter(this.ch) || this.isDigit(this.ch)) {
			this.readChar();
		}
		const identifier = this.input.slice(currPos, this.position);
		return { literal: identifier, start: currPos, end: this.position };
	}
	private isLetter(ch: Char) {
		return (
			(ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || this.ch === "_"
		);
	}

	private readNumber() {
		const currPos = this.position;
		while (this.isDigit(this.ch)) {
			this.readChar();
		}
		const num = this.input.slice(currPos, this.position);
		return { literal: num, start: currPos, end: this.position };
	}

	private skipWhitespace() {
		while (
			this.ch === " " ||
			this.ch === "\t" ||
			this.ch === "\n" ||
			this.ch === "\r"
		) {
			this.readChar();
		}
	}

	private isDigit(ch: Char) {
		// gotta love js type coercion.. it will coerce 0 (eof) to a string
		return ch !== 0 && ch >= "0" && ch <= "9";
	}

	private peekChar() {
		if (this.readPosition >= this.input.length) return 0;
		return this.input[this.readPosition];
	}
	private readString() {
		const spanStart = this.position;
		this.readChar();
		const literalStart = this.position;
		while (this.ch !== '"' && this.ch !== 0) {
			this.readChar();
		}
		const str = this.input.slice(literalStart, this.position);
		return { literal: str, start: spanStart, end: this.readPosition };
	}
	private skipComment() {
		if (this.ch === "/" && this.peekChar() === "*") {
			this.skipMultilineComment();
		} else {
			this.skipSingleLineComment();
		}
	}
	private skipSingleLineComment() {
		while (this.ch !== "\n" && this.ch !==0) {
			this.readChar();
		}
	}

	private skipMultilineComment() {
		let found = false;
		while (!found) {
			if (this.ch === "*" && this.peekChar() === "/") {
				found = true;
				break;
			}
			this.readChar();
		}
		// skip past the end of comment characters (*/) so we don't end up lexing them
		this.readChar();
		this.readChar();
	}
	private get isComment() {
		return (
			(this.ch === "/" && this.peekChar() === "/") ||
			(this.ch === "/" && this.peekChar() === "*")
		);
	}
}
