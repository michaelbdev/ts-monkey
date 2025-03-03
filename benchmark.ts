import { Compiler } from "./src/compiler/compiler";
import { Environment } from "./src/eval/environment";
import { evaluate } from "./src/eval/eval";
import { Lexer } from "./src/lexer/lexer";
import type { IntegerObject } from "./src/object/object";
import { Parser } from "./src/parser/parser";
import { VM } from "./src/vm/vm";

const input = `let fibonacci = fn(x) {
  if (x <= 1) {
    return x;
  }
  return fibonacci(x - 1) + fibonacci(x - 2);
}
fibonacci(35);`;

const engine = process.argv
	.find((a) => a.startsWith("--engine="))
	?.substring(9);

if (engine !== "vm" && engine !== "eval") {
	console.error(`'${engine}' is not a valid engine`);
	process.exit();
}
const ast = new Parser(new Lexer(input)).parseProgram();
if (engine === "vm") {
	const compiler = new Compiler();
	compiler.compile(ast);
	const vm = new VM(compiler.bytecode());
	const start = performance.now();
	vm.run();
	const end = performance.now();
	console.log(`${end - start}ms`);
	console.log((vm.lastPoppedElement() as IntegerObject)?.value);
} else {
	const start = performance.now();
	const result = evaluate(ast, new Environment());
	const end = performance.now();
	console.log(`${end - start}ms`);
	console.log(result?.inspect());
}
