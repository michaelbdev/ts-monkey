import { describe, expect, it } from "bun:test";
import { TokenType } from "../../token/token";
import { Identifier, LetStatement, Program } from "../ast";
describe("ast", () => {
	it("should return the string of the program given an ast", () => {
		const program = new Program();
		program.statements = [
			new LetStatement(
				{ type: TokenType.LET, literal: "let", span: { start: 0, end: 0 } },
				new Identifier(
					{
						type: TokenType.IDENT,
						literal: "myVar",
						span: { start: 0, end: 0 },
					},
					"myVar",
				),
				new Identifier(
					{
						type: TokenType.IDENT,
						literal: "anotherVar",
						span: { start: 0, end: 0 },
					},
					"anotherVar",
				),
			),
		];
		expect(program.string()).toBe("let myVar = anotherVar;");
	});
});
