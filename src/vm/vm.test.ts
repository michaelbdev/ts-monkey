import { describe, expect, it } from "bun:test";
import { Compiler } from "../compiler/compiler";
import { Lexer } from "../lexer/lexer";
import {
	type ArrayObject,
	BooleanObject,
	ErrorObject,
	HashObject,
	IntegerObject,
	type InternalObject,
	NULL_OBJ,
	type StringObject,
} from "../object/object";
import { Parser } from "../parser/parser";
import { VM } from "./vm";
const testIntegerObject = (obj: InternalObject, expected: number) => {
	expect(obj).toBeInstanceOf(IntegerObject);
	expect((obj as IntegerObject).value).toBe(expected);
};
const lexAndParse = (input: string) =>
	new Parser(new Lexer(input)).parseProgram();
describe("vm", () => {
	it("should execute integer arithmetic", () => {
		runVmTests([
			{ input: "1", expected: 1 },
			{ input: "2", expected: 2 },
			{ input: "1+2", expected: 3 },
			{ input: "1;2;", expected: 2 },
			{ input: "1 * 2", expected: 2 },
			{ input: "4 / 2", expected: 2 },
			{ input: "100%2", expected: 0 },
			{ input: "2/0", expected: new ErrorObject("cannot divide by 0") },
			{ input: "2%0", expected: new ErrorObject("cannot divide by 0") },
			{ input: "50 / 2 * 2 + 10 - 5", expected: 55 },
			{ input: "5 * (2 + 10)", expected: 60 },
			{ input: "5 * 2 + 10", expected: 20 },
			{ input: "5 + 5 + 5 + 5 - 10", expected: 10 },
			{ input: "2 * 2 * 2 * 2 * 2", expected: 32 },
			{ input: "5 * 2 + 10", expected: 20 },
			{ input: "5 + 2 * 10", expected: 25 },
			{ input: "5 * (2 + 10)", expected: 60 },
		]);
	});

	it("should execute boolean expressions", () => {
		runVmTests([
			{ input: "true||false", expected: true },
			{ input: "false||true", expected: true },
			{ input: "false||false", expected: false },
			{ input: "false && true", expected: false },
			{ input: "true && false", expected: false },
			{ input: "true && true", expected: true },
			{ input: "[true][0] && [false,true][1]", expected: true },
			{ input: "2>1", expected: true },
			{ input: "1<2", expected: true },
			{ input: "1<=2", expected: true },
			{ input: "5>=2", expected: true },
			{ input: "2>=2", expected: true },
			{ input: "1>=1", expected: true },
			{ input: "(1 < 2) == true", expected: true },
			{ input: "(1 < 2) == false", expected: false },
			{ input: "(1 > 2) == true", expected: false },
			{ input: "(1 > 2) == false", expected: true },
			{ input: "true==true", expected: true },
			{ input: "false==false", expected: true },
			{ input: "true!=false", expected: true },
			{ input: "false==true", expected: false },
			{ input: '"hi"=="hi"', expected: true },
			{ input: '"hi"!="a"', expected: true },
			{ input: '"hi"=="a"', expected: false },
			{ input: "true", expected: true },
			{ input: "false", expected: false },
			{ input: "!true", expected: false },
			{ input: "!!true", expected: true },
			{ input: "!false", expected: true },
			{ input: "!5", expected: false },
			{ input: "!!5", expected: true },
			{ input: "!(if(false){100})", expected: true },
			{ input: "if(if(false){10}){10} else {20}", expected: 20 },
		]);
	});
	it("should handle operator errors", () => {
		runVmTests([
			{
				input: "[]==true",
				expected: new ErrorObject("type mismatch: ARRAY == BOOLEAN"),
			},
			{
				input: "1+true",
				expected: new ErrorObject("type mismatch: INTEGER + BOOLEAN"),
			},
			{
				input: "true+false",
				expected: new ErrorObject("unknown operator: BOOLEAN + BOOLEAN"),
			},
			{
				input: "1%true",
				expected: new ErrorObject("type mismatch: INTEGER % BOOLEAN"),
			},
			{
				input: "true>false",
				expected: new ErrorObject("unknown operator: BOOLEAN > BOOLEAN"),
			},
			{
				input: `1 * "hi"`,
				expected: new ErrorObject("type mismatch: INTEGER * STRING"),
			},
			{
				input: `"hi" > "a"`,
				expected: new ErrorObject("unknown operator: STRING > STRING"),
			},
			{
				input: `"hi" * "a"`,
				expected: new ErrorObject("unknown operator: STRING * STRING"),
			},
			{
				input: "true%false",
				expected: new ErrorObject("unknown operator: BOOLEAN % BOOLEAN"),
			},
		]);
	});
	describe("if expressions", () => {
		it("should execute", () => {
			runVmTests([
				{ input: "if (true) { 10 }", expected: 10 },
				{ input: "if (true) { 10 } else { 20 }", expected: 10 },
				{ input: "if (false) { 10 } ", expected: null },
				{ input: "if (false) { 10 } else { 20 } ", expected: 20 },
				{ input: "if (1) { 10 }", expected: 10 },
				{ input: "if (1 < 2) { 10 }", expected: 10 },
				{ input: "if (1 < 2) { 10 } else { 20 }", expected: 10 },
				{ input: "if (1 > 2) { 10 } else { 20 }", expected: 20 },
			]);
		});
		it("should be block scoped", () => {
			runVmTests([
				{ input: "let a =1; if(true){let a = 2}; a", expected: 1 },
				{
					input: "let a = 1;if(false){}else{let a = [1,2,3,4,5]}; a",
					expected: 1,
				},
				{
					input: "let a =1; let b = if (true) { let a = 200;a }; b+a ",
					expected: 201,
				},

				{
					input:
						"let x = 1; if (true) { let x = 2; if (true) { let x = 3 }; x }; x",
					expected: 1,
				},

				{
					input:
						"let x = 5; let y = fn(){ if(true){let x = 50; return x}; return x; }; y(); x",
					expected: 5,
				},

				{
					input: "let x = 10; if(true){ let y = x + 1; let x = y * 2 }; x",
					expected: 10,
				},

				{
					input: "let x = fn(){ if(true){ let y = 42; return y }}; x()",
					expected: 42,
				},

				{
					input: "let f = fn(a){ if(true){ let a = 10;a }}; f(5)",
					expected: 10,
				},
				{
					input: "let f = fn(a){ if(true){ let a = 10 }  a}; f(5)",
					expected: 5,
				},

				{
					input: "let x = 1; if(true){ let x = x + 1; x};",
					expected: 2,
				},
			]);
		});
	});
	it("should execute let statements/identifiers", () => {
		runVmTests([
			{ input: "let one =1; one;", expected: 1 },
			{ input: "let one =1; let two = 2; one+two;", expected: 3 },
			{ input: "let one =1; let two = one+one; one + two;", expected: 3 },
		]);
	});
	it("should execute strings", () => {
		runVmTests([
			{
				input: '"hello"',
				expected: "hello",
			},
			{
				input: '"hello" + " " + "world"',
				expected: "hello world",
			},
		]);
	});
	it("should execute arrays", () => {
		runVmTests([
			{
				input: "[]",
				expected: [],
			},
			{
				input: "[1,2,3]",
				expected: [1, 2, 3],
			},
			{
				input: "[1+1,2*2,3/3]",
				expected: [2, 4, 1],
			},
			{
				input: "[1+2,3*4,5+6]",
				expected: [3, 12, 11],
			},
		]);
	});
	describe("hashes", () => {
		it("should execute hashes", () => {
			runVmTests([
				{
					input: "{}",
					expected: new Map(),
				},
				{
					input: "{1:2}",
					expected: new Map([[1, 2]]),
				},
				{
					input: "{1+1: 2*2, 3+3: 4*4}",
					expected: new Map([
						[2, 4],
						[6, 16],
					]),
				},
			]);
		});
		it("should handle hash key errors", () => {
			runVmTests([
				{
					input: "{[1]:2}",
					expected: new ErrorObject("cannot use array as hash key"),
				},
				{
					input: "{[1]:2, 5:10}",
					expected: new ErrorObject("cannot use array as hash key"),
				},
			]);
		});
	});
	it("should execute index expressions", () => {
		runVmTests([
			{
				input: "[1,2,3][0]",
				expected: 1,
			},
			{ input: '{"hello":"world"}["hello"]', expected: "world" },
			{ input: '{"hello":"world"}["h" + "ello"]', expected: "world" },
			{ input: "{2:4}[1+1]", expected: 4 },
			{ input: "{2:4}[1]", expected: null },
			{ input: '{"hello":"world"}["hi"]', expected: null },
			{ input: '"hi"[0]', expected: "h" },
			{ input: 'let a = "hi"; a[0]', expected: "h" },
			{ input: '"hi"[2]', expected: null },
			{ input: '"hi"[0+1]', expected: "i" },
			{ input: "[[1]][0]", expected: [1] },
			{ input: "[][0]", expected: null },
		]);
	});
	it("should handle index errors", () => {
		runVmTests([
			{
				input: "true[0]",
				expected: new ErrorObject("BOOLEAN is not indexable"),
			},
			{
				input: "1[0]",
				expected: new ErrorObject("INTEGER is not indexable"),
			},
		]);
	});
	describe("functions", () => {
		it("should execute", () => {
			runVmTests([
				{
					input: "let fivePlusTen = fn(){5+10}; fivePlusTen()",
					expected: 15,
				},
				{
					input: "let fivePlusTen = fn()=> {5+10}; fivePlusTen()",
					expected: 15,
				},
				{
					input: "let fivePlusTen = fn ()=> 5+10; fivePlusTen()",
					expected: 15,
				},
				{
					input: "fn(){return 200 - fn(){return 1}()}()",
					expected: 199,
				},
				{
					input: "fn(){return 200 - fn()=>{return 1}()}()",
					expected: 199,
				},
				{
					input: "fn(){return 200 - fn()=>{1}()}()",
					expected: 199,
				},
				{
					input: "fn(){return 200 - (fn()=>1)()}()",
					expected: 199,
				},
				{
					input: "(fn()=> 200 - (fn ()=> 1)())()",
					expected: 199,
				},
				{
					input: "fn(){return 100; 99;}()",
					expected: 100,
				},
				{
					input: "let earlyExit = fn(){return 99;100}; earlyExit()",
					expected: 99,
				},
				{
					input: "let returnsNothing = fn(){}; returnsNothing()",
					expected: null,
				},
				{
					input: "fn(){}()",
					expected: null,
				},
			]);
		});
		it("should be first class", () => {
			runVmTests([
				{
					input:
						"let returnsOne = fn(){1}; let returnFn = fn(){returnsOne}; returnFn()()",
					expected: 1,
				},
				{
					input:
						"let returnsOneReturner = fn() { let returnsOne = fn() { 1; }; returnsOne; }; returnsOneReturner()();",
					expected: 1,
				},
			]);
		});
		it("should have locals", () => {
			runVmTests([
				{
					input: "let one = fn(){let one = 1; one};one();",
					expected: 1,
				},
				{
					input:
						"let onePlusTwo = fn(){let one = 1; let two=2 one+two};onePlusTwo();",
					expected: 3,
				},
				{
					input: `let onePlusTwo = fn(){let one = 1; let two=2; one+two};
						let threePlusFour= fn(){let three =3; let four=4; three+4;}
						onePlusTwo()+threePlusFour();`,
					expected: 10,
				},
				{
					input:
						"let firstFoobar = fn(){let foobar = 50; foobar};let secondFoobar = fn(){let foobar=100; foobar;}firstFoobar() + secondFoobar();",
					expected: 150,
				},
				{
					input: `let globalSeed = 50; 
						let minusOne = fn() { let num = 1; globalSeed - num; } 
						let minusTwo = fn() { let num = 2; globalSeed - num; } 
						minusOne() + minusTwo();`,
					expected: 97,
				},
			]);
		});
		it("should error if function called with wrong number of arguments", () => {
			runVmTests([
				{
					input: "fn(a){a}()",
					expected: new ErrorObject(
						"wrong number of arguments. wanted=1, got=0",
					),
				},
				{
					input: "fn(a,b){a+b}(1)",
					expected: new ErrorObject(
						"wrong number of arguments. wanted=2, got=1",
					),
				},
			]);
		});
		it("should work with args", () => {
			runVmTests([
				{
					input: "let identity = fn (a){a}; identity(1)",
					expected: 1,
				},
				{
					input: "let identity = fn x => x; identity(1)",
					expected: 1,
				},
				{
					input: `
					let sum = fn(a, b) {
					let c = a + b;
					c;
					};
					sum(1, 2);
					`,
					expected: 3,
				},
				{
					input: `
					let sum = fn(a, b) {
					let c = a + b;
					c;
					};
					sum(1, 2) + sum(3, 4);`,
					expected: 10,
				},
				{
					input: `
					let sum = fn(a, b) {
					let c = a + b;
					c;
					};
					let outer = fn() {
					sum(1, 2) + sum(3, 4);
					};
					outer();
					`,
					expected: 10,
				},
				{
					input: `let return1 = fn ()=> 1; 
						let sum = fn(x,y)=> x+y;
						sum(return1(),return1())`,
					expected: 2,
				},
			]);
		});
	});
	it("should return error if a non function tries to be called", () => {
		runVmTests([
			{
				input: "1()",
				expected: new ErrorObject("1 is not a function, got type: integer"),
			},
			{
				input: "let a = true; a()",
				expected: new ErrorObject("true is not a function, got type: boolean"),
			},
		]);
	});
	it("should work with builtin functions", () => {
		runVmTests([
			{ input: `len("")`, expected: 0 },
			{ input: "len([])", expected: 0 },
			{ input: `len("four")`, expected: 4 },
			{ input: `len("hello world")`, expected: 11 },
			{
				input: "len(1)",
				expected: new ErrorObject(
					"argument to 'len' not supported, got integer",
				),
			},
			{
				input: "len(1)",
				expected: new ErrorObject(
					"argument to 'len' not supported, got integer",
				),
			},
			{
				input: `len("one", "two")`,
				expected: new ErrorObject("wrong number of arguments. got=2, want=1"),
			},
			{
				input: `len("one", "two")`,
				expected: new ErrorObject("wrong number of arguments. got=2, want=1"),
			},
			{ input: `puts("hello", "world!")`, expected: null },
			{ input: "first([1, 2, 3])", expected: 1 },
			{ input: "first([])", expected: null },
			{
				input: "first(1)",
				expected: new ErrorObject(
					"'first' function only accepts an array, got: integer",
				),
			},

			{ input: "last([1, 2, 3])", expected: 3 },
			{ input: "last([])", expected: null },
			{
				input: "last(1)",
				expected: new ErrorObject(
					"'last' function only accepts an array, got: integer",
				),
			},

			{ input: "rest([1, 2, 3])", expected: [2, 3] },
			{ input: `rest(["hello", "world","!"])`, expected: ["world", "!"] },
			{ input: "rest([])", expected: [] },
			{ input: "push([], 1)", expected: [1] },
			{ input: `push(["hello"],"world")`, expected: ["hello", "world"] },
			{ input: "map([1,2,3,4], fn x => x*2)", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4], fn (x,i) => x+i)", expected: [1, 3, 5, 7] },
			{ input: "map([1,2,3,4],fn(x){x*2})", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn(_,i){i})", expected: [0, 1, 2, 3] },
			{ input: "map([1,2,3,4],fn(x)=> x*2)", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn x => x*2)", expected: [2, 4, 6, 8] },
			{ input: "map([1,2,3,4],fn(_,i)=> i)", expected: [0, 1, 2, 3] },
			{ input: "map([1],fn x => map([x], fn y => y)[0])", expected: [1] },
			{ input: "find([1,2,3,4], fn (x) => x==2)", expected: 2 },
			{ input: "find([1,2,3,4], fn (x) => x>4)", expected: null },
			{ input: 'find(["a","ab","abc"],fn(x){len(x)>2})', expected: "abc" },
			{ input: 'find(["a","ab","abc"],fn x =>len(x)>2)', expected: "abc" },
			{ input: 'find(["a","ab","abc"],fn x => len(x)>2)', expected: "abc" },
			{ input: "reduce([1,2,3,4,5], fn (acc,curr) => acc+curr)", expected: 15 },
			{ input: "reduce([1], fn (acc,curr) => acc+curr,100)", expected: 101 },

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

			{ input: "filter([1,2,3,4], fn (x) => x>2)", expected: [3, 4] },

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
			{
				input: "map([1,2,3,4],fn (x){let multiplier =2; x*multiplier})",
				expected: [2, 4, 6, 8],
			},
			{
				input:
					"let global = 5;map([1,2,3,4],fn (x){let multiplier =2; (x+global)*multiplier})",
				expected: [12, 14, 16, 18],
			},
			{
				input: `let map ={"a":1}; set(map,"b",2); map["b"]`,
				expected: 2,
			},
			{
				input: `let map ={"a":1}; set(map,"b",2); map["b"]`,
				expected: 2,
			},
			{
				input: ` set([],"b",2)`,
				expected: new ErrorObject(
					"set's first argument must be a hashmap, got array",
				),
			},
			{
				input: "set(1,1,1)",
				expected: new ErrorObject(
					"set's first argument must be a hashmap, got integer",
				),
			},
			{
				input: "set({},[],1)",
				expected: new ErrorObject("not a valid hash key: array"),
			},
		]);
	});
	it("should execute closures", () => {
		runVmTests([
			{
				input: `
				let newClosure = fn(a) {
				fn() { a; };
				};
				let closure = newClosure(99);
				closure();
				`,
				expected: 99,
			},
			{
				input: "let adder = fn x => fn y=> x+y; adder(100)(900)",
				expected: 1000,
			},
			{
				input: `
				let newAdderOuter = fn(a, b) {
				let c = a + b;
				fn(d) {
				let e = d + c;
				fn(f) { e + f; };
				};
				};
				let newAdderInner = newAdderOuter(1, 2)
				let adder = newAdderInner(3);
				adder(8);
				`,
				expected: 14,
			},
			{
				input: `let a = 1;
				let newAdderOuter = fn(b) {
				fn(c) {
				fn(d) { a + b + c + d };
				};
				};
				let newAdderInner = newAdderOuter(2)
				let adder = newAdderInner(3);
				adder(8);
`,
				expected: 14,
			},
		]);
	});
	it("should execute recursive functions", () => {
		runVmTests([
			{
				input: `
				let fibonacci = fn(x) {
				if (x == 0) {
				return 0;
				} else {
				if (x == 1) {
				return 1;
				} else {
				fibonacci(x - 1) + fibonacci(x - 2);
				}
				}
				};
				fibonacci(15);
				`,
				expected: 610,
			},
		]);
	});
	it("should execute for loops", () => {
		runVmTests([
			{
				input: "for(item in [1,2,3,4]){item}",
				expected: null,
			},
			{
				input: "fn(a){for(item in [1,2,3,4]){a+item}}(1)",
				expected: null,
			},
		]);
	});
});

const runVmTests = (
	tests: {
		input: string;
		expected: any;
	}[],
) => {
	for (const { input, expected } of tests) {
		const program = lexAndParse(input);
		const compiler = new Compiler();
		compiler.compile(program);
		const bytecode = compiler.bytecode();
		const vm = new VM(bytecode);
		try {
			vm.run();
			const stackElement = vm.lastPoppedElement();
			testExpectedObject(stackElement!, expected);
		} catch (e) {
			if (e instanceof ErrorObject) {
				testExpectedObject(e, expected);
			}
		}
	}
};

const testExpectedObject = (actual: InternalObject, expected: any) => {
	if (expected === null) {
		expect(actual).toBe(NULL_OBJ);
	}
	if (expected instanceof ErrorObject) {
		const error = actual as ErrorObject;
		expect(error.msg).toBe(expected.msg);
	}
	if (Array.isArray(expected)) {
		const arr = actual as ArrayObject;
		expect(arr.elements).toHaveLength(expected.length);
		expected.forEach((exp, i) => {
			testExpectedObject(arr.elements[i]!, exp);
		});
		return;
	}
	if (expected instanceof Map) {
		const hash = actual as HashObject;
		expect(hash).toBeInstanceOf(HashObject);
		expect(hash.pairs.size).toBe(expected.size);
		for (const [expKey, expValue] of expected) {
			const val = hash.pairs.get(expKey)!.value as
				| StringObject
				| IntegerObject
				| BooleanObject;
			expect(val.value).toBe(expValue);
		}
	}
	switch (typeof expected) {
		case "number":
			testIntegerObject(actual, expected);
			break;

		case "boolean":
			testBooleanObject(actual as BooleanObject, expected);
			break;

		case "string":
			expect((actual as StringObject).value).toBe(expected);
			break;
		default:
			break;
	}
};
function testBooleanObject(boolObj: BooleanObject, expected: boolean) {
	expect(boolObj).toBeInstanceOf(BooleanObject);
	expect(boolObj.value).toBe(expected);
}
