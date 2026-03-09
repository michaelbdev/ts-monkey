import { describe, expect, it } from "bun:test";
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
	ReturnStatement,
	StringLiteral,
} from "../../ast/ast";
import { Lexer } from "../../lexer/lexer";
import { Parser } from "../parser";

describe("parser", () => {
	it("should parse let statements", () => {
		const tests = [
			{ input: "let x =5;", expectedIdentifier: "x", expectedValue: 5 },
			{ input: "let y = true;", expectedIdentifier: "y", expectedValue: true },
			{
				input: "let foobar = y;",
				expectedIdentifier: "foobar",
				expectedValue: "y",
			},
		];
		tests.forEach(({ input, expectedIdentifier, expectedValue }, i) => {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program).not.toBeNull();
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as LetStatement;
			testLetStatement(statement, expectedIdentifier);
			const value = statement.value;
			testLiteralExpression(value!, expectedValue);
		});
	});
	it("should parse let statements with call expressions", () => {
		const tests = [
			{ input: "let x = foo();", expected: "let x = foo();" },
			{
				input: "let y = map(list, fn(x){x});",
				expected: "let y = map(list, fn(x){x});",
			},
		];
		tests.forEach(({ input, expected }, i) => {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program).not.toBeNull();
			expect(program.statements).toHaveLength(1);
			expect(program.string()).toBe(expected);
		});
	});

	it("should parse return statements", () => {
		const tests = [
			{ input: "return 5", expectedValue: 5 },
			{ input: "return true", expectedValue: true },
			{ input: "return foobar", expectedValue: "foobar" },
		];
		for (const { input, expectedValue } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program).not.toBeNull();
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ReturnStatement;
			expect(statement.tokenLiteral()).toBe("return");
			expect(statement).toBeInstanceOf(ReturnStatement);
			testLiteralExpression(statement.value!, expectedValue);
		}
	});
	it("should parse return statements with call expressions", () => {
		const tests = [
			{ input: "return add(1,2)", expectedValue: "return add(1, 2);" },
			{
				input: "return map(list,fn(x){x})",
				expectedValue: "return map(list, fn(x){x});",
			},
		];
		for (const { input, expectedValue } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program).not.toBeNull();
			expect(program.statements).toHaveLength(1);
			expect(program.string()).toBe(expectedValue);
		}
	});
	it("should parse identifiers", () => {
		const input = "foobar";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(program.statements).toHaveLength(1);
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expression = statement.expression as Identifier;
		expect(expression).toBeInstanceOf(Identifier);
		expect(expression.value).toBe("foobar");
	});
	it("should parse integers", () => {
		const input = "1337;";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(program.statements).toHaveLength(1);
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expression = statement.expression as IntegerLiteral;
		expect(expression).toBeInstanceOf(IntegerLiteral);
		expect(expression.value).toBe(1337);
		expect(expression.tokenLiteral()).toBe("1337");
	});

	it("should parse prefix expressions", () => {
		const tests = [
			{ input: "!5;", operator: "!", value: 5 },
			{ input: "-15", operator: "-", value: 15 },
			{ input: "-foobar", operator: "-", value: "foobar" },
			{ input: "!foobar", operator: "!", value: "foobar" },
			{ input: "!true", operator: "!", value: true },
			{ input: "!false", operator: "!", value: false },
		];
		for (const { input, value, operator } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as PrefixExpression;
			expect(expr).toBeInstanceOf(PrefixExpression);
			expect(expr.operator).toBe(operator);
			expect(testLiteralExpression(expr.rightExpression!, value)).toBe(true);
		}
	});
	it("should parse infix expressions", () => {
		const tests = [
			{ input: "5 + 5;", leftValue: 5, operator: "+", rightValue: 5 },
			{ input: "5 - 5;", leftValue: 5, operator: "-", rightValue: 5 },
			{ input: "5 * 5;", leftValue: 5, operator: "*", rightValue: 5 },
			{ input: "5 / 5;", leftValue: 5, operator: "/", rightValue: 5 },
			{ input: "5 > 5;", leftValue: 5, operator: ">", rightValue: 5 },
			{ input: "5 < 5;", leftValue: 5, operator: "<", rightValue: 5 },
			{ input: "5 == 5;", leftValue: 5, operator: "==", rightValue: 5 },
			{ input: "5 != 5;", leftValue: 5, operator: "!=", rightValue: 5 },
			{
				input: "true == true",
				leftValue: true,
				operator: "==",
				rightValue: true,
			},
			{
				input: "true != false",
				leftValue: true,
				operator: "!=",
				rightValue: false,
			},
			{
				input: "false == false",
				leftValue: false,
				operator: "==",
				rightValue: false,
			},
			{
				input: "false || true",
				leftValue: false,
				operator: "||",
				rightValue: true,
			},
			{
				input: "true && false",
				leftValue: true,
				operator: "&&",
				rightValue: false,
			},
			{
				input: "5 <= 5",
				leftValue: 5,
				operator: "<=",
				rightValue: 5,
			},
			{
				input: "5 >= 5",
				leftValue: 5,
				operator: ">=",
				rightValue: 5,
			},
		];
		for (const { input, leftValue, operator, rightValue } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as InfixExpression;
			expect(expr).toBeInstanceOf(InfixExpression);
			testInfixExpression(expr, leftValue, operator, rightValue);
		}
	});

	it("should take into account operator precedence", () => {
		const tests = [
			{ input: "2+3-4/2", expected: "((2 + 3) - (4 / 2))" },
			{ input: "-a * b", expected: "((-a) * b)" },
			{
				input: "-a * b",
				expected: "((-a) * b)",
			},
			{
				input: "!-a",
				expected: "(!(-a))",
			},
			{
				input: "a + b + c",
				expected: "((a + b) + c)",
			},
			{
				input: "a + b - c",
				expected: "((a + b) - c)",
			},
			{
				input: "a * b * c",
				expected: "((a * b) * c)",
			},
			{
				input: "a * b / c",
				expected: "((a * b) / c)",
			},

			{
				input: "a + b * c + d / e - f",
				expected: "(((a + (b * c)) + (d / e)) - f)",
			},
			{
				input: "3 + 4; -5 * 5",
				expected: "(3 + 4)((-5) * 5)",
			},
			{
				input: "5 > 4 == 3 < 4",
				expected: "((5 > 4) == (3 < 4))",
			},
			{
				input: "5 < 4 != 3 > 4",
				expected: "((5 < 4) != (3 > 4))",
			},
			{
				input: "3 + 4 * 5 == 3 * 1 + 4 * 5",
				expected: "((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))",
			},
			{
				input: "3 + 4 * 5 == 3 * 1 + 4 * 5;",
				expected: "((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))",
			},
			{ input: "5+6*2/2", expected: "(5 + ((6 * 2) / 2))" },
			{ input: "true", expected: "true" },
			{ input: "false", expected: "false" },
			{ input: "1+2*3 == true", expected: "((1 + (2 * 3)) == true)" },
			{
				input: "3 > 5 == false",
				expected: "((3 > 5) == false)",
			},
			{
				input: "3 < 5 == true",
				expected: "((3 < 5) == true)",
			},
			{ input: "1+-2*3", expected: "(1 + ((-2) * 3))" },
			{ input: "1+2+3+4", expected: "(((1 + 2) + 3) + 4)" },
			{ input: "1+(2+3)+4", expected: "((1 + (2 + 3)) + 4)" },
			{ input: "a+add(1,2)+d", expected: "((a + add(1, 2)) + d)" },
			{ input: "a+add(b*c,2)+d", expected: "((a + add((b * c), 2)) + d)" },
			{
				input: "add(a, b, 1, 2 * 3, 4 + 5,add(6, 7 * 8))",
				expected: "add(a, b, 1, (2 * 3), (4 + 5), add(6, (7 * 8)))",
			},
			{
				input: "add(a + b + c * d / f + g)",
				expected: "add((((a + b) + ((c * d) / f)) + g))",
			},
			{
				input: "a * [1, 2, 3, 4][b * c] * d",
				expected: "((a * ([1, 2, 3, 4][(b * c)])) * d)",
			},
			{
				input: "add(a * b[2], b[1], 2 * [1, 2][1])",
				expected: "add((a * (b[2])), (b[1]), (2 * ([1, 2][1])))",
			},
			{
				input: "true != false && false!=true",
				expected: "((true != false) && (false != true))",
			},
			{ input: "a || b && c", expected: "(a || (b && c))" },
			{
				input: "false == true || true == true",
				expected: "((false == true) || (true == true))",
			},
			{
				input: "false && true || 5>2 && 3>1",
				expected: "((false && true) || ((5 > 2) && (3 > 1)))",
			},
			{ input: "20%2", expected: "(20 % 2)" },
			{ input: "20%2+2", expected: "((20 % 2) + 2)" },
			{ input: "5%2*2", expected: "((5 % 2) * 2)" },
		];
		for (const { input, expected } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.string()).toBe(expected);
		}
	});
	it("should parse boolean expressions", () => {
		const tests = [
			{ input: "true", expected: true },
			{ input: "false", expected: false },
		];
		for (const { input, expected } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as BooleanLiteral;
			expect(expr).toBeInstanceOf(BooleanLiteral);
			expect(expr.value).toBe(expected);
		}
	});
	it("should parse if expressions", () => {
		const tests = [{ input: "if (x < y) { x };" }];
		for (const { input } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as IfExpression;
			expect(expr).toBeInstanceOf(IfExpression);
			testInfixExpression(expr.condition as InfixExpression, "x", "<", "y");

			expect(expr.consequence?.statements).toHaveLength(1);
			const consequence = expr.consequence
				?.statements[0] as ExpressionStatement;
			expect(expr.consequence?.statements[0]).toBeInstanceOf(
				ExpressionStatement,
			);

			expect(consequence.expression).toBeInstanceOf(Identifier);
			testIdentifier(consequence.expression!, "x");
			expect(expr.alternative).toBeNull();
		}
	});
	it("should parse if else expressions", () => {
		const tests = [{ input: "if (x < y) { x } else { y }" }];
		for (const { input } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as IfExpression;
			expect(expr).toBeInstanceOf(IfExpression);
			testInfixExpression(expr.condition as InfixExpression, "x", "<", "y");

			expect(expr.alternative?.statements).toHaveLength(1);
			const alternative = expr.alternative
				?.statements[0] as ExpressionStatement;
			expect(alternative).toBeInstanceOf(ExpressionStatement);
			expect(alternative.expression).toBeInstanceOf(Identifier);
			testIdentifier(alternative.expression!, "y");
			expect(expr.alternative).not.toBeNull();
		}
	});
	it("should parse function literals", () => {
		const input = "fn(x,y) { x + y; }";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		expect(program.statements).toHaveLength(1);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as FunctionLiteral;
		expect(expr).toBeInstanceOf(FunctionLiteral);
		expect(expr.parameters).toHaveLength(2);
		testLiteralExpression(expr.parameters![0], "x");
		testLiteralExpression(expr.parameters![1], "y");
		const body = expr.body as BlockStatement;
		expect(body).toBeInstanceOf(BlockStatement);
		expect(body.statements).toHaveLength(1);
		const bodyStatement = body.statements[0] as ExpressionStatement;
		expect(bodyStatement).toBeInstanceOf(ExpressionStatement);
		testInfixExpression(
			bodyStatement.expression as InfixExpression,
			"x",
			"+",
			"y",
		);
	});
	it("should parse functions with different parameter lengths", () => {
		const tests = [
			{ input: "fn(){}", expected: [] },
			{ input: "fn(x){}", expected: ["x"] },
			{ input: "fn(x,y,z){}", expected: ["x", "y", "z"] },
			{ input: "fn ()=> {}", expected: [] },
			{ input: "fn (x)=> x", expected: ["x"] },
			{ input: "fn x => x", expected: ["x"] },
			{ input: "fn (x,y)=> x", expected: ["x", "y"] },
			{ input: "fn (x,y,z)=> {}", expected: ["x", "y", "z"] },
		];
		for (const { input, expected } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as FunctionLiteral;
			expect(expr).toBeInstanceOf(FunctionLiteral);
			expect(expr.parameters).toHaveLength(expected.length);
			expected.forEach((param, i) => {
				testLiteralExpression(expr.parameters![i], param);
			});
		}
	});
	it("should parse arrow functions", () => {
		const tests = [
			{
				input: "fn (x,y) => x+y",
				expectedBodyType: InfixExpression,
			},
			{
				input: "fn () => 1",
				expectedBodyType: IntegerLiteral,
			},
			{ input: "fn (x,y)=> {x+y}", expectedBodyType: BlockStatement },
			{
				input: "fn x => x",
				expectedBodyType: Identifier,
			},
		];
		for (const { input, expectedBodyType } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);

			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as FunctionLiteral;
			expect(expr).toBeInstanceOf(FunctionLiteral);
			expect(expr.body).toBeInstanceOf(expectedBodyType);
			if (expr.body instanceof InfixExpression) {
				testInfixExpression(expr.body, "x", "+", "y");
			}
			if (expr.body instanceof BlockStatement) {
				const statement = expr.body.statements[0] as ExpressionStatement;
				expect(statement).toBeInstanceOf(ExpressionStatement);
				const expression = statement.expression;
				expect(expression).toBeInstanceOf(InfixExpression);
			}
		}
	});
	it("should handle errors when trying to parse a function as a concise arrow function", () => {
		const tests = [{ input: "fn x {x}" }, { input: "fn x,y => x+y" }];
		for (const { input } of tests) {
			const parser = new Parser(new Lexer(input));
			parser.parseProgram();
			expect(parser.errors[0]).toBe(
				"a functions parentheses may only be left out if the function is an arrow function and if there is only one parameter.",
			);
		}
	});

	it("should parse function literals with default parameters", () => {
		const tests = [
			{
				input: "fn (x,y=1) => x+y",
				expectedBodyType: InfixExpression,
			},
			{
				input: "fn (x=1,y) => x+y",
				expectedBodyType: InfixExpression,
			},
			{ input: "fn (x=20,y=x)=> {x+y}", expectedBodyType: BlockStatement },
			{
				input: "fn (x=1) => x",
				expectedBodyType: Identifier,
			},

			{ input: "fn (x=1, y=2) => x+y", expectedBodyType: InfixExpression },

			{ input: "fn (x=1, y=x+1) => y", expectedBodyType: Identifier },

			{ input: "fn (x=(1+2)*3) => x", expectedBodyType: Identifier },

			{
				input: "fn (cb=fn (a) => a+1) => cb(1)",
				expectedBodyType: CallExpression,
			},

			{ input: "fn (x=1) => { x+1 }", expectedBodyType: BlockStatement },

			{
				input: "fn (a, b=1, c) => {a+ b + c}",
				expectedBodyType: BlockStatement,
			},

			{ input: "fn (a=b, b=2) => a+b", expectedBodyType: InfixExpression },

			{ input: "fn (a = fn(x=1)=>x) => a()", expectedBodyType: CallExpression },
		];
		for (const { input, expectedBodyType } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);

			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as FunctionLiteral;
			expect(expr).toBeInstanceOf(FunctionLiteral);
			expect(expr.body).toBeInstanceOf(expectedBodyType);
		}
	});
	it("should parse call expressions", () => {
		const input = "add(1,2*3,4+5)";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		expect(program.statements).toHaveLength(1);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as CallExpression;
		expect(expr).toBeInstanceOf(CallExpression);
		expect(expr.args).toHaveLength(3);
		testIdentifier(expr.func!, "add");
		testLiteralExpression(expr.args![0], 1);
		testInfixExpression(expr.args![1] as InfixExpression, 2, "*", 3);
		testInfixExpression(expr.args![2] as InfixExpression, 4, "+", 5);
	});
	it("should parse call expressions with varying lengths of arguments ", () => {
		const tests = [
			{ input: "add()", expected: [] },
			{ input: "add(1)", expected: ["1"] },
			{ input: "add(1,2)", expected: ["1", "2"] },
			{ input: "add(1*2,2/1,100)", expected: ["(1 * 2)", "(2 / 1)", "100"] },
		];
		for (const { input, expected } of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ExpressionStatement;
			expect(statement).toBeInstanceOf(ExpressionStatement);
			const expr = statement.expression as CallExpression;
			expect(expr).toBeInstanceOf(CallExpression);
			expect(expr.args).toHaveLength(expected.length);
			testIdentifier(expr.func!, "add");
			expected.forEach((arg, i) => {
				expect(expr.args![i].string()).toBe(arg);
			});
		}
	});
	it("should parse strings", () => {
		const input = `"hello world"`;
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		expect(statement.expression).toBeInstanceOf(StringLiteral);
		expect((statement.expression as StringLiteral).value).toBe("hello world");
	});
	it("should parse array literals", () => {
		const input = "[1,2*2,3+3]";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as ArrayLiteral;
		expect(expr).toBeInstanceOf(ArrayLiteral);
		expect(expr.elements).toHaveLength(3);
		testIntegerLiteral(expr.elements![0], 1);
		testInfixExpression(expr.elements![1] as InfixExpression, 2, "*", 2);
		testInfixExpression(expr.elements![2] as InfixExpression, 3, "+", 3);
	});
	it("should parse index expressions", () => {
		const input = "myArr[1 + 1]";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		expect(statement.expression).toBeInstanceOf(IndexExpression);
		const expr = statement.expression as IndexExpression;
		testIdentifier(expr.left, "myArr");
		testInfixExpression(
			(statement.expression as IndexExpression).index as InfixExpression,
			1,
			"+",
			1,
		);
	});
	it("should parse hash literals", () => {
		const input = `{"one":1, "two":2, "three":3}`;
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as HashLiteral;
		expect(expr).toBeInstanceOf(HashLiteral);
		expect(expr.pairs?.size).toBe(3);
		const expected: Record<string, number> = {
			one: 1,
			two: 2,
			three: 3,
		};
		for (const [key, value] of expr.pairs!.entries()) {
			expect(key).toBeInstanceOf(StringLiteral);
			const expectedValue = expected[key.string()];
			testIntegerLiteral(value, expectedValue);
		}
	});
	it("should parse empty hash literal ", () => {
		const input = "{}";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as HashLiteral;
		expect(expr).toBeInstanceOf(HashLiteral);
		expect(expr.pairs?.size).toBe(0);
	});
	it("should parse hash literals with boolean keys", () => {
		const input = "{true:1, false:2}";
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as HashLiteral;
		expect(expr).toBeInstanceOf(HashLiteral);
		expect(expr.pairs?.size).toBe(2);
		const expected = new Map<boolean, number>([
			[true, 1],
			[false, 2],
		]);
		for (const [key, value] of expr.pairs!.entries()) {
			expect(key).toBeInstanceOf(BooleanLiteral);
			const expectedValue = expected.get(key.string() === "true");
			testIntegerLiteral(value, expectedValue!);
		}
	});
	it("should parse hash literals with other expressions", () => {
		const input = `{"one":0+1, "two":4/2, "three":4-1, "four":someFn()}`;
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		const statement = program.statements[0] as ExpressionStatement;
		expect(statement).toBeInstanceOf(ExpressionStatement);
		const expr = statement.expression as HashLiteral;
		expect(expr).toBeInstanceOf(HashLiteral);
		expect(expr.pairs?.size).toBe(4);
		const tests: Record<string, (expr: Expression) => void> = {
			one: (e) => {
				testInfixExpression(e as InfixExpression, 0, "+", 1);
			},
			two: (e) => {
				testInfixExpression(e as InfixExpression, 4, "/", 2);
			},
			three: (e) => {
				testInfixExpression(e as InfixExpression, 4, "-", 1);
			},
			four: (e) => {
				expect(e).toBeInstanceOf(CallExpression);
			},
		};
		for (const [key, value] of expr.pairs!.entries()) {
			expect(key).toBeInstanceOf(StringLiteral);
			const fn = tests[key.string()];
			fn(value);
		}
	});
	it("should parse for statements", () => {
		const tests = [
			{
				input: "for(item,index in nums){}",
				expectedItem: "item",
				expectedIndex: "index",
				iterableName: "nums",
				iterableType: Identifier,
			},
			{
				input: "for(item in arr){}",
				expectedItem: "item",
				expectedIndex: null,
				iterableName: "arr",
				iterableType: Identifier,
			},
			{
				input: "for(num,i in [1,2,3,4]){}",
				expectedItem: "num",
				expectedIndex: "i",
				iterableName: null,
				iterableType: ArrayLiteral,
			},
			{
				input: "for(el,i in createArray()){}",
				expectedItem: "el",
				expectedIndex: "i",
				iterableName: null,
				iterableType: CallExpression,
			},
		];
		for (const {
			input,
			expectedItem,
			expectedIndex,
			iterableName,
			iterableType,
		} of tests) {
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			expect(program.statements).toHaveLength(1);
			const statement = program.statements[0] as ForStatement;
			expect(statement).toBeInstanceOf(ForStatement);
			expect(statement.currItem).toBeInstanceOf(Identifier);
			if (statement.currIndex) {
				expect(statement.currIndex).toBeInstanceOf(Identifier);
				testIdentifier(statement.currIndex!, expectedIndex!);
			}
			expect(statement.iterable).toBeInstanceOf(iterableType);
			if (statement.iterable instanceof Identifier) {
				expect(statement.iterable.value).toBe(iterableName!);
			}
			testIdentifier(statement.currItem!, expectedItem);
			expect(statement.body).toBeInstanceOf(BlockStatement);
		}
	});
	it("should parse a program that is just a single line comment",()=>{
		const input = `// a comment`;
		const parser = new Parser(new Lexer(input));
		const program = parser.parseProgram();
		checkParserErrors(parser);
		expect(program.statements).toHaveLength(0);
	})

	describe("spans", () => {
		it("should set span correctly for let statements", () => {
			const input = "let x = 5;";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			const stmt = program.statements[0] as LetStatement;

			const { start, end } = stmt.span!;
			expect(input.slice(start, end)).toBe("let x = 5");
		});

		it("should set span correctly for infix expressions", () => {
			const input = "1 + 2 * 3;";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			const stmt = program.statements[0] as ExpressionStatement;
			const expr = stmt.expression as InfixExpression;

			const { start, end } = expr.span!;
			expect(input.slice(start, end)).toBe("1 + 2 * 3");
		});

		it("should set span correctly for call expressions", () => {
			const input = "add(1, 2);";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			const stmt = program.statements[0] as ExpressionStatement;
			const expr = stmt.expression as CallExpression;

			const { start, end } = expr.span!;
			expect(input.slice(start, end)).toBe("add(1, 2)");
		});

		it("should set span correctly for if expressions with else", () => {
			const input = "if (x < y) { x } else { y }";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			const stmt = program.statements[0] as ExpressionStatement;
			const expr = stmt.expression as IfExpression;

			const { start, end } = expr.span!;
			expect(input.slice(start, end)).toBe("if (x < y) { x } else { y }");
		});

		it("should set span correctly for nested array and index expressions", () => {
			const input = "[1, 2, [3, 4]][1]";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);
			const stmt = program.statements[0] as ExpressionStatement;
			const expr = stmt.expression as IndexExpression;

			const { start, end } = expr.span!;
			expect(input.slice(start, end)).toBe("[1, 2, [3, 4]][1]");
		});
		it("sets spans correctly for return statements", () => {
			const input = "return x + 1;";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);

			const stmt = program.statements[0] as ReturnStatement;
			const { start, end } = stmt.span!;
			expect(input.slice(start, end)).toBe("return x + 1");

			const value = stmt.value!;
			expect(input.slice(value.span!.start, value.span!.end)).toBe("x + 1");
		});
		it("sets spans correctly for for-in statements", () => {
			const input = "for(item, i in arr) { let x = 1; }";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			checkParserErrors(parser);

			const stmt = program.statements[0] as ForStatement;
			const { start, end } = stmt.span!;
			expect(input.slice(start, end)).toBe(
				"for(item, i in arr) { let x = 1; }",
			);

			// granular spans
			expect(
				input.slice(stmt.currItem!.span!.start, stmt.currItem!.span!.end),
			).toBe("item");
			expect(
				input.slice(stmt.currIndex!.span!.start, stmt.currIndex!.span!.end),
			).toBe("i");
			expect(
				input.slice(stmt.iterable!.span!.start, stmt.iterable!.span!.end),
			).toBe("arr");
			expect(input.slice(stmt.body!.span!.start, stmt.body!.span!.end)).toBe(
				"{ let x = 1; }",
			);
		});
	});
	describe("granular spans", () => {
		it("tracks spans for function parameters and body", () => {
			const input = "fn(x, y) { x + y }";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			const expr = (program.statements[0] as ExpressionStatement)
				.expression as FunctionLiteral;

			// function itself
			expect(input.slice(expr.span!.start, expr.span!.end)).toBe(
				"fn(x, y) { x + y }",
			);

			// parameters
			const [x, yParam] = expr.parameters!;
			expect(input.slice(x.span!.start, x.span!.end)).toBe("x");
			expect(input.slice(yParam.span!.start, yParam.span!.end)).toBe("y");

			// body
			const body = expr.body as BlockStatement;
			expect(input.slice(body.span!.start, body.span!.end)).toBe("{ x + y }");
		});

		it("tracks spans for index expressions", () => {
			const input = "arr[1 + 2]";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			const expr = (program.statements[0] as ExpressionStatement)
				.expression as IndexExpression;

			expect(input.slice(expr.span!.start, expr.span!.end)).toBe("arr[1 + 2]");
			expect(input.slice(expr.left.span!.start, expr.left.span!.end)).toBe(
				"arr",
			);
			expect(input.slice(expr.index!.span!.start, expr.index!.span!.end)).toBe(
				"1 + 2",
			);
		});

		it("tracks spans for hash literal keys and values", () => {
			const input = `{"a": 1 + 2, "b": 3}`;
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			const expr = (program.statements[0] as ExpressionStatement)
				.expression as HashLiteral;

			expect(input.slice(expr.span!.start, expr.span!.end)).toBe(
				`{"a": 1 + 2, "b": 3}`,
			);

			const entries = [...expr.pairs!.entries()];
			const [firstKey, firstValue] = entries[0];
			const [secondKey, secondValue] = entries[1];

			expect(input.slice(firstKey.span!.start, firstKey.span!.end)).toBe(`"a"`);
			expect(input.slice(firstValue.span!.start, firstValue.span!.end)).toBe(
				"1 + 2",
			);
			expect(input.slice(secondKey.span!.start, secondKey.span!.end)).toBe(
				`"b"`,
			);
			expect(input.slice(secondValue.span!.start, secondValue.span!.end)).toBe(
				"3",
			);
		});

		it("tracks spans for nested call arguments", () => {
			const input = "add(1, mul(2, 3))";
			const parser = new Parser(new Lexer(input));
			const program = parser.parseProgram();
			const expr = (program.statements[0] as ExpressionStatement)
				.expression as CallExpression;

			expect(input.slice(expr.span!.start, expr.span!.end)).toBe(
				"add(1, mul(2, 3))",
			);

			const [arg1, arg2] = expr.args!;
			expect(input.slice(arg1.span!.start, arg1.span!.end)).toBe("1");
			expect(input.slice(arg2.span!.start, arg2.span!.end)).toBe("mul(2, 3)");
		});
	});
});

function testIntegerLiteral(intLiteral: Expression | null, value: number) {
	expect(intLiteral).toBeInstanceOf(IntegerLiteral);
	const integ = intLiteral as IntegerLiteral;
	expect(integ.value).toBe(value);
	expect(integ.tokenLiteral()).toBe(String(value));
	return true;
}
function checkParserErrors(parser: Parser) {
	if (!parser.errors.length) {
		return;
	}
	console.error(`parser has ${parser.errors.length} errors`);
	parser.errors.forEach((e) => console.error("parser error", e));
	throw new Error("");
}

function testLiteralExpression(
	expression: Expression,
	expected: string | number | boolean,
) {
	switch (typeof expected) {
		case "number":
			return testIntegerLiteral(expression, expected);

		case "string":
			return testIdentifier(expression, expected);

		case "boolean":
			return testBooleanLiteral(expression as BooleanLiteral, expected);
		default:
			throw new Error(`expected type ${typeof expected} not handled`);
	}
}
function testLetStatement(statement: LetStatement, name: string) {
	expect(statement.tokenLiteral()).toBe("let");
	expect(statement).toBeInstanceOf(LetStatement);
	expect(statement.name?.value).toBe(name);
	expect(statement.name?.tokenLiteral()).toBe(name);
}
function testIdentifier(expression: Expression, value: string) {
	expect(expression).toBeInstanceOf(Identifier);
	expect((expression as Identifier).value).toBe(value);
	expect(expression.tokenLiteral()).toBe(value);
	return true;
}

function testInfixExpression(
	expression: InfixExpression,
	left: string | number | boolean,
	operator: string,
	right: string | number | boolean,
) {
	expect(expression).toBeInstanceOf(InfixExpression);
	testLiteralExpression(expression.leftExpr, left);
	expect(expression.operator).toBe(operator);
	testLiteralExpression(expression.rightExpr!, right);
}

function testBooleanLiteral(expression: BooleanLiteral, value: boolean) {
	expect(expression).toBeInstanceOf(BooleanLiteral);
	expect(expression.value).toBe(value);
	expect(expression.tokenLiteral()).toBe(String(value));
	return true;
}
