import { describe, expect, it } from "bun:test";
import { Lexer } from "../../lexer/lexer";
import {
	ArrayObject,
	BooleanObject,
	ErrorObject,
	FunctionObject,
	type HashKey,
	HashObject,
	IntegerObject,
	NULL_OBJ,
	type NullObject,
	ObjectType,
	StringObject,
} from "../../object/object";
import { Parser } from "../../parser/parser";
import { Environment } from "../environment";
import { evaluate } from "../eval";
describe("eval", () => {
	it("should evaluate integer expressions", () => {
		const tests = [
			{ input: "5", expected: 5 },
			{ input: "10", expected: 10 },
			{ input: "-5", expected: -5 },
			{ input: "-10", expected: -10 },
			{ input: "5 + 5", expected: 10 },
			{ input: "200 - 100", expected: 100 },
			{ input: "5 + 5 + 5 + 5 - 10", expected: 10 },
			{ input: "2 * 2 * 2 * 2 * 2", expected: 32 },
			{ input: "-50 + 100 + -50", expected: 0 },
			{ input: "5 * 2 + 10", expected: 20 },
			{ input: "5 + 2 * 10", expected: 25 },
			{ input: "20 + 2 * -10", expected: 0 },
			{ input: "50 / 2 * 2 + 10", expected: 60 },
			{ input: "2 * (5 + 10)", expected: 30 },
			{ input: "3 * 3 * 3 + 10", expected: 37 },
			{ input: "3 * (3 * 3) + 10", expected: 37 },
			{ input: "(5 + 10 * 2 + 15 / 3) * 2 + -10", expected: 50 },
			{ input: "20%2", expected: 0 },
			{ input: "5%2", expected: 1 },
		];
		for (const { expected, input } of tests) {
			const evaluated = testEval(input) as IntegerObject;
			testIntegerObject(evaluated, expected);
		}
	});
	it("should evaluate boolean expressions", () => {
		const tests = [
			{ input: "true", expected: true },
			{ input: "false", expected: false },
		];
		for (const { expected, input } of tests) {
			const evaluated = testEval(input);
			testBooleanObject(evaluated as BooleanObject, expected);
		}
	});
	it("should evaluate boolean expressions", () => {
		const tests = [
			{ input: "!true", expected: false },
			{ input: "!false", expected: true },
			{ input: "!5", expected: false },
			{ input: "!!true", expected: true },
			{ input: "!!false", expected: false },
			{ input: "1<2", expected: true },
			{ input: "1>2", expected: false },
			{ input: "1<1", expected: false },
			{ input: "1>1", expected: false },
			{ input: "1==1", expected: true },
			{ input: "1!=1", expected: false },
			{ input: "1==2", expected: false },
			{ input: "1!=2", expected: true },
			{ input: "true == true", expected: true },
			{ input: "false == false", expected: true },
			{ input: "true == false", expected: false },
			{ input: "true != false", expected: true },
			{ input: "false != true", expected: true },
			{ input: "(1 < 2) == true", expected: true },
			{ input: "(1 < 2) == false", expected: false },
			{ input: "(1 > 2) == true", expected: false },
			{ input: "(1 > 2) == false", expected: true },
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			testBooleanObject(evaluated as BooleanObject, expected);
		}
	});
	describe("if expressions", () => {
		it("should evaluate", () => {
			const tests = [
				{ input: "if(true){10}", expected: 10 },
				{ input: "if (false) { 10 }", expected: null },
				{ input: "if (1) { 10 }", expected: 10 },
				{ input: "if (1 < 2) { 10 }", expected: 10 },
				{ input: "if (1 > 2) { 10 }", expected: null },
				{ input: "if (1 > 2) { 10 } else { 20 }", expected: 20 },
				{ input: "if (1 < 2) { 10 } else { 20 }", expected: 10 },
			];
			for (const { input, expected } of tests) {
				const evaluated = testEval(input);
				if (typeof expected === "number") {
					testIntegerObject(evaluated as IntegerObject, expected);
				} else {
					testNullObject(evaluated as NullObject);
				}
			}
		});
		it("should be block scoped ", () => {
			const tests = [
				{
					input: "if(true){let num=1};num",
					expected: "identifier not found: num",
				},
				{
					input: "if(false){}else{let num=1};num",
					expected: "identifier not found: num",
				},
			];
			for (const { input, expected } of tests) {
				const evaluated = testEval(input) as ErrorObject;
				expect(evaluated).toBeInstanceOf(ErrorObject);
				expect(evaluated.msg).toBe(expected);
			}
		});
	});
	it("should evaluate return statements", () => {
		const tests = [
			{ input: "return 10;", expected: 10 },
			{ input: "return 10; 9;", expected: 10 },
			{ input: "return 2 * 5; 9;", expected: 10 },
			{ input: "9; return 2 * 5; 9;", expected: 10 },
			{ input: "if(true){if(true){return 1} return 9}", expected: 1 },
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			testIntegerObject(evaluated as IntegerObject, expected);
		}
	});
	it("should handle errors", () => {
		const tests = [
			{
				input: "5 + true;",
				expected: "type mismatch: INTEGER + BOOLEAN",
			},
			{
				input: "5 + true; 5;",
				expected: "type mismatch: INTEGER + BOOLEAN",
			},
			{
				input: "-true",
				expected: "cannot negate boolean",
			},
			{
				input: "true + false;",
				expected: "unknown operator: BOOLEAN + BOOLEAN",
			},
			{
				input: "5; true + false; 5",
				expected: "unknown operator: BOOLEAN + BOOLEAN",
			},
			{
				input: "if (10 > 1) { true + false; }",
				expected: "unknown operator: BOOLEAN + BOOLEAN",
			},
			{
				input: `
				132
				if (10 > 1) {
				if (10 > 1) {
				return true + false;
				}
				return 1;
				}
				`,
				expected: "unknown operator: BOOLEAN + BOOLEAN",
			},
			{ input: "foobar", expected: "identifier not found: foobar" },
			{
				input: `"hello" - "world"`,
				expected: "unknown operator: STRING - STRING",
			},
			{
				input: `"hello" || false`,
				expected: "type mismatch: STRING || BOOLEAN",
			},
			{
				input: "5 <= false",
				expected: "type mismatch: INTEGER <= BOOLEAN",
			},
			{
				input: `5 >= "hi"`,
				expected: "type mismatch: INTEGER >= STRING",
			},
			{
				input: "5/0",
				expected: "cannot divide by 0",
			},
			{
				input: "1%true",
				expected: "type mismatch: INTEGER % BOOLEAN",
			},
			{
				input: "true%false",
				expected: "unknown operator: BOOLEAN % BOOLEAN",
			},
			{
				input: "1%0",
				expected: "cannot divide by 0",
			},
			{
				input: `let a = 1; let a = "hello"`,
				expected: `variable "a" has already been declared`,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(evaluated).toBeInstanceOf(ErrorObject);

			expect((evaluated as ErrorObject).msg).toBe(expected);
		}
	});
	it("should evaluate let statements", () => {
		const tests = [
			{ input: "let a = 5; a;", expected: 5 },
			{ input: "let a = 5 * 5; a;", expected: 25 },
			{ input: "let a = 5; let b = a; b;", expected: 5 },
			{ input: "let a = 5; let b = a; let c = a + b + 5; c;", expected: 15 },
		];
		for (const { input, expected } of tests) {
			testIntegerObject(testEval(input) as IntegerObject, expected);
		}
	});
	it("should evaluate functions", () => {
		const tests = [
			{ input: "fn(x){x+2}", expectedBody: "(x + 2)", expectedParams: ["x"] },
			{
				input: "fn (x,y) => x+y ",
				expectedBody: "(x + y)",
				expectedParams: ["x", "y"],
			},
			{ input: "fn (x) => x", expectedBody: "x", expectedParams: ["x"] },
			{
				input: "fn (y=1) => y + 1",
				expectedBody: "(y + 1)",
				expectedParams: ["y"],
			},
			{
				input: "fn (a,y=[1][1]) => a + y",
				expectedBody: "(a + y)",
				expectedParams: ["a", "y"],
			},
		];
		for (const { input, expectedParams, expectedBody } of tests) {
			const evaluated = testEval(input) as FunctionObject;
			const params = evaluated.params;
			expect(evaluated).toBeInstanceOf(FunctionObject);
			expect(params).toHaveLength(expectedParams.length);
			params.forEach((param, i) =>
				expect(param.string()).toBe(expectedParams[i]),
			);
			expect(evaluated.body.string()).toBe(expectedBody);
		}
	});
	it("should evaluate called functions", () => {
		const tests = [
			{ input: "let identity = fn(x) { x; }; identity(5);", expected: 5 },
			{ input: "let identity = fn (x) => x; identity(5);", expected: 5 },
			{ input: "let identity = fn x => x; identity(5);", expected: 5 },
			{
				input: "let identity = fn(x) { return x; }; identity(5);",
				expected: 5,
			},
			{
				input: "let identity = fn(x)=>{return x}; identity(5);",
				expected: 5,
			},
			{
				input: "let identity = fn x => {return x}; identity(5);",
				expected: 5,
			},
			{ input: "let double = fn(x) { x * 2; }; double(5);", expected: 10 },
			{ input: "let double = fn (x) => x * 2; double(5);", expected: 10 },
			{ input: "let double = fn x => x * 2; double(5);", expected: 10 },
			{ input: "let add = fn(x, y) { x + y; }; add(5, 5);", expected: 10 },
			{ input: "let add = fn (x,y)=> x+y; add(5, 5);", expected: 10 },
			{
				input: "let add = fn(x, y) { x + y; }; add(5 + 5, add(5, 5));",
				expected: 20,
			},
			{
				input: "let add = fn(x,y) => x+y; add(5 + 5, add(5, 5));",
				expected: 20,
			},
			{ input: "fn(x) { x; }(5)", expected: 5 },
			{ input: "fn(x) => x;(5)", expected: 5 },
			{ input: "fn x => x;(5)", expected: 5 },
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			testIntegerObject(evaluated as IntegerObject, expected);
		}
	});
	it("should evaluate closures", () => {
		const input = `
		let makeAdder = fn(x){
			return fn(y){
				return x + y;
			}
		}
		let addFive = makeAdder(5)
		addFive(10) 
		`;
		const input2 = `
		let makeAdder = fn (x) => fn(y) => x+y;
		makeAdder(5)(10)
		`;
		const input3 = `
		let makeAdder = fn x => fn y => x+y
		makeAdder(5)(10)
		`;
		[input, input2, input3].forEach((input) => {
			testIntegerObject(testEval(input) as IntegerObject, 15);
		});
	});

	it("should evaluate called functions with default parameters", () => {
		const tests = [
			{ input: "let func = fn(x=1) { x; }; func();", expected: 1 },
			{ input: "let func = fn(x=1) { x; }; func(5);", expected: 5 },
			{ input: "let func = fn(a,b=10) { a+b }; func(5);", expected: 15 },
			{
				input: "let func = fn(x=1,y=2) { x+y; }; func();",
				expected: 3,
			},
			{
				input: "let func = fn(x=1,y=x) { x+y; }; func();",
				expected: 2,
			},
			{
				input: "let func = fn(x,y=x) { x+y; }; func(100);",
				expected: 200,
			},
			{
				input: "let func = fn(x=1,y=x) { x+y; }; func(100);",
				expected: 200,
			},
			{
				input: "let func = fn(x=1,y=[1,2,3,4][0]) { x+y; }; func();",
				expected: 2,
			},
			{
				input:
					"let num = fn ()=> 200; let func = fn(x=1,y=num()) { x+y; }; func();",
				expected: 201,
			},
			{
				input: "let func = fn(x=1, y= if(true){250}else{1}) { x+y; }; func();",
				expected: 251,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			testIntegerObject(evaluated as IntegerObject, expected);
		}
	});
	it("should evaluate string literals", () => {
		const input = `"hello world"`;
		const evaluated = testEval(input);
		expect(evaluated).toBeInstanceOf(StringObject);
		expect((evaluated as StringObject).value).toBe("hello world");
	});
	it("should evaluate concatenated strings ", () => {
		const input = `"hello" + " " + "world"`;
		const evaluated = testEval(input);
		expect(evaluated).toBeInstanceOf(StringObject);
		expect((evaluated as StringObject).value).toBe("hello world");
	});
	it("should evaluate string comparison", () => {
		const tests = [
			{
				input: `"hello" == "hello"`,
				expected: true,
			},
			{
				input: `"hello" != "world"`,
				expected: true,
			},
			{
				input: `"hello" == "world"`,
				expected: false,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(evaluated).toBeInstanceOf(BooleanObject);
			expect((evaluated as BooleanObject).value).toBe(expected);
		}
	});
	it("should evaluate logical OR operator", () => {
		const tests = [
			{
				input: "false || true",
				expected: true,
			},
			{
				input: "false || false",
				expected: false,
			},
			{
				input: "true || false",
				expected: true,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(evaluated).toBeInstanceOf(BooleanObject);
			expect((evaluated as BooleanObject).value).toBe(expected);
		}
	});
	it("should evaluate logical AND operator", () => {
		const tests = [
			{
				input: "true && true",
				expected: true,
			},
			{
				input: "true && false",
				expected: false,
			},
			{
				input: "false && false",
				expected: false,
			},
			{
				input: "100>99 && true==true",
				expected: true,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(evaluated).toBeInstanceOf(BooleanObject);
			expect((evaluated as BooleanObject).value).toBe(expected);
		}
	});
	it("should evaluate less than or equal and greater than or equal operators", () => {
		const tests = [
			{
				input: "5>=5",
				expected: true,
			},
			{
				input: "10>=9",
				expected: true,
			},
			{
				input: "100<=200",
				expected: true,
			},
			{
				input: "200<=100",
				expected: false,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(evaluated).toBeInstanceOf(BooleanObject);
			expect((evaluated as BooleanObject).value).toBe(expected);
		}
	});
	it("should evaluate builtin functions", () => {
		const tests = [
			{ input: `len("")`, expected: 0 },
			{ input: `len("four")`, expected: 4 },
			{ input: `len("hello world")`, expected: 11 },
			{
				input: "len(1)",
				expected: "argument to 'len' not supported, got INTEGER",
			},
			{
				input: `len("one", "two")`,
				expected: "wrong number of arguments. got=2, want=1",
			},
			{ input: "len([1,2])", expected: 2 },
			{ input: "first([1,2])", expected: 1 },
			{ input: "last([1,2])", expected: 2 },
			{ input: `rest(["hello", "world","!"])`, expected: ["world", "!"] },
			{ input: `push(["hello"],"world")`, expected: ["hello", "world"] },
			{ input: "map([1,2,3,4],fn(x){x*2})", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn(_,i){i})", expected: [0, 1, 2, 3] },
			{ input: "map([1,2,3,4],fn(x)=> x*2)", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn x => x*2)", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn(_,i)=> i)", expected: [0, 1, 2, 3] },
			{ input: 'find(["a","ab","abc"],fn(x){len(x)>2})', expected: "abc" },
			{ input: 'find(["a","ab","abc"],fn(x)=>len(x)>2)', expected: "abc" },
			{ input: 'find(["a","ab","abc"],fn x => len(x)>2)', expected: "abc" },
			{
				input: 'let obj = {}; set(obj,"hello", "world"); obj["hello"]',
				expected: "world",
			},
			{
				input: 'reduce(["hello ", "world"],fn(acc,curr){acc+curr})',
				expected: "hello world",
			},
			{
				input: 'reduce(["hello ", "world"],fn(acc,curr)=>acc+curr)',
				expected: "hello world",
			},
			{
				input:
					'reduce(["hello ", "world","!"],fn(acc,curr){acc+curr},"Monkey says: ")',
				expected: "Monkey says: hello world!",
			},
			{
				input:
					'reduce(["hello ", "world","!"],fn(acc,curr)=>acc+curr,"Monkey says: ")',
				expected: "Monkey says: hello world!",
			},
			{
				input: 'filter(["a","ab","abc"],fn(x){len(x)>1})',
				expected: ["ab", "abc"],
			},
			{
				input: 'filter(["a","ab","abc"],fn(x)=> len(x)>1)',
				expected: ["ab", "abc"],
			},
			{
				input: 'filter(["a","ab","abc"],fn x=> len(x)>1)',
				expected: ["ab", "abc"],
			},
			{
				input: "filter([1,2,3,4],fn(num,i){num + i > 3})",
				expected: [3, 4],
			},
			{
				input: "filter([1,2,3,4],fn(num,i)=> num + i > 3)",
				expected: [3, 4],
			},
			{
				input: "filter([true,false,false,true],fn(x){!!x})",
				expected: [true, true],
			},
			{
				input: "filter([true,false,false,true],fn(x)=>!!x)",
				expected: [true, true],
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);

			switch (typeof expected) {
				case "number":
					testIntegerObject(evaluated as IntegerObject, expected);
					break;

				case "string":
					if (evaluated instanceof StringObject) {
						expect(evaluated.value).toBe(expected);
					} else {
						expect(evaluated).toBeInstanceOf(ErrorObject);
					}

					break;

				case "object": {
					expect(evaluated).toBeInstanceOf(ArrayObject);
					const values = (evaluated as ArrayObject).elements.map((a) =>
						a?.type() === ObjectType.INTEGER_OBJ
							? Number(a?.inspect())
							: a?.type() === ObjectType.BOOLEAN_OBJ
								? a.inspect() === "true"
								: a?.inspect(),
					);
					expected.forEach((el) => expect(values).toContain(el));
					break;
				}
				default:
					break;
			}
		}
	});
	it("should evaluate array literals", () => {
		const input = "[1,2*2,3+3]";
		const evaluated = testEval(input) as ArrayObject;
		expect(evaluated).toBeInstanceOf(ArrayObject);
		testIntegerObject(evaluated.elements[0] as IntegerObject, 1);
		testIntegerObject(evaluated.elements[1] as IntegerObject, 4);
		testIntegerObject(evaluated.elements[2] as IntegerObject, 6);
	});
	it("should evaluate index expressions", () => {
		const tests = [
			{
				input: "[1, 2, 3][0]",

				expected: 1,
			},
			{
				input: "[1, 2, 3][1]",

				expected: 2,
			},
			{
				input: "[1, 2, 3][2]",

				expected: 3,
			},
			{
				input: "let i = 0; [1][i];",

				expected: 1,
			},
			{
				input: "[1, 2, 3][1 + 1];",

				expected: 3,
			},
			{
				input: "let myArray = [1, 2, 3]; myArray[2];",

				expected: 3,
			},
			{
				input: "let myArray = [1, 2, 3]; myArray[0] + myArray[1] + myArray[2];",

				expected: 6,
			},
			{
				input: "let myArray = [1, 2, 3]; let i = myArray[0]; myArray[i]",

				expected: 2,
			},
			{
				input: "[1, 2, 3][3]",

				expected: null,
			},
			{
				input: "[1, 2, 3][-1]",

				expected: null,
			},
			{ input: `["hello"][0]`, expected: "hello" },
			{ input: `"hello world!"[4]`, expected: "o" },
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			if (evaluated instanceof IntegerObject) {
				testIntegerObject(evaluated, expected as number);
			} else if (evaluated instanceof StringObject) {
				expect(evaluated.value).toBe(expected as string);
			} else {
				testNullObject(evaluated as NullObject);
			}
		}
	});
	it("should evaluate hash literals", () => {
		const input = `let two = "two"; 
		{"one": 10 - 9,
		two: 1 + 1,
		"thr" + "ee": 6 / 2,
		4: 4,
		true: 5,
		false: 6
		}`;
		const evaluated = testEval(input) as HashObject;
		expect(evaluated).toBeInstanceOf(HashObject);
		const expected = new Map<HashKey, number>([
			["one", 1],
			["two", 2],
			["three", 3],
			[4, 4],
			[true, 5],
			[false, 6],
		]);
		expect(evaluated.pairs.size).toBe(expected.size);
		for (const [key, value] of expected.entries()) {
			const pair = evaluated.pairs.get(key);
			testIntegerObject(pair!.value as IntegerObject, value);
		}
	});
	it("should evaluate hash index expressions", () => {
		const tests = [
			{
				input: `{"foo": 5}["foo"]`,
				expected: 5,
			},
			{
				input: `{"foo": 5}["bar"]`,
				expected: null,
			},
			{
				input: `let key = "foo"; {"foo": 5}[key]`,
				expected: 5,
			},
			{
				input: `{}["foo"]`,
				expected: null,
			},
			{
				input: "{5: 5}[5]",
				expected: 5,
			},
			{
				input: "{true: 5}[true]",
				expected: 5,
			},
			{
				input: "{false: 5}[false]",
				expected: 5,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			if (evaluated instanceof IntegerObject) {
				testIntegerObject(evaluated, expected!);
			} else {
				testNullObject(evaluated as NullObject);
			}
		}
	});
	it("should handle hash errors", () => {
		const tests = [
			{
				input: `{"foo": 5}[fn(){}]`,
				expected: "cannot access hash with type: FUNCTION",
			},
			{
				input: `{"foo": 5}[{}]`,
				expected: "cannot access hash with type: HASH",
			},
			{
				input: `{"foo": 5}[[1,2]]`,
				expected: "cannot access hash with type: ARRAY",
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input) as ErrorObject;
			expect(evaluated).toBeInstanceOf(ErrorObject);
			expect(evaluated.msg).toBe(expected);
		}
	});
	it("should evaluate for statements", () => {
		const tests = [
			{
				input: "for(item,index in [1,2,3,4,5]){if(item == 5){return 5}}",
				expected: 5,
			},
			{
				input:
					"let arr=[1,2,3,4];for(item,index in arr){if(item == 1){return item}}",
				expected: 1,
			},
			{
				input: `let arr=["hello ", "world"];for(item,index in arr){return item + arr[index+1]}`,
				expected: "hello world",
			},
			{
				input:
					"for(item,index in [1,2,3,4]){if(item == 3 && index ==2){return item}}",
				expected: 3,
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input);
			expect(
				(evaluated as IntegerObject | BooleanObject | StringObject).value,
			).toBe(expected);
		}
	});
	it("should handle for statement errors", () => {
		const tests = [
			{
				input: "for(item,index in 1){}",
				expected: "iterable does not evaluate to an array!",
			},
			{
				input: "for(item,index in [1,2,3,4]){return nonExistentVar}",
				expected: "identifier not found: nonExistentVar",
			},
		];
		for (const { input, expected } of tests) {
			const evaluated = testEval(input) as ErrorObject;
			expect(evaluated.msg).toBe(expected);
		}
	});
	describe("spans", () => {
		it("should attach span for type mismatch errors", () => {
			const input = "1 + true";
			const result = testEval(input) as ErrorObject;
			expect(result).toBeInstanceOf(ErrorObject);
			expect(result.msg).toContain("type mismatch");
			expect(input.slice(result.span!.start, result.span!.end)).toBe(
				"1 + true",
			);
		});

		it("should attach span for identifier not found", () => {
			const input = "foo + 1";
			const result = testEval(input) as ErrorObject;
			expect(result.msg).toContain("identifier not found");
			expect(input.slice(result.span!.start, result.span!.end)).toBe("foo");
		});

		it("should attach span for builtin arg type errors", () => {
			const input = `map({"a":999}, fn x => x)`;
			const result = testEval(input) as ErrorObject;
			expect(result.msg).toContain("only accepts an array");
			expect(input.slice(result.span!.start, result.span!.end)).toBe(
				`{"a":999}`,
			);
		});

		it("should attach span for redeclared variable", () => {
			const input = "let a = 1; let a = 2;";
			const result = testEval(input) as ErrorObject;
			expect(result.msg).toContain("already been declared");
			expect(input.slice(result.span!.start, result.span!.end)).toBe("a");
		});
	});
});

function testEval(input: string) {
	return evaluate(
		new Parser(new Lexer(input)).parseProgram(),
		new Environment(),
	);
}
function testIntegerObject(integerObj: IntegerObject, expected: number) {
	expect(integerObj).toBeInstanceOf(IntegerObject);
	expect(integerObj.value).toBe(expected);
}
function testBooleanObject(boolObj: BooleanObject, expected: boolean) {
	expect(boolObj).toBeInstanceOf(BooleanObject);
	expect(boolObj.value).toBe(expected);
}

function testNullObject(obj: NullObject) {
	expect(obj).toBe(NULL_OBJ);
}
