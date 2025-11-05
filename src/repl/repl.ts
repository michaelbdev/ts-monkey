import { parseArgs } from "node:util";
import { stringify } from "../code/code";
import { Compiler } from "../compiler/compiler";
import { SymbolTable } from "../compiler/symbol-table";
import { Environment } from "../eval/environment";
import { evaluate } from "../eval/eval";
import { Lexer } from "../lexer/lexer";
import { ErrorObject, type InternalObject } from "../object/object";
import { Parser } from "../parser/parser";
import { VM } from "../vm/vm";
export async function repl() {
	const env = new Environment();
	const { values } = parseArgs({
		args: Bun.argv,
		options: {
			ast: {
				type: "boolean",
				default: false,
			},
			compiler: {
				type: "boolean",
				default: false,
				short: "c",
			},
			bytecode: {
				type: "boolean",
				default: false,
			},
		},
		allowPositionals: true,
	});
	prompt();
	const constants: InternalObject[] = [];
	const globals: InternalObject[] = [];
	const symbolTable = new SymbolTable();
	for await (const line of console) {
		const lexer = new Lexer(line);
		const parser = new Parser(lexer);
		const program = parser.parseProgram();
		if (parser.errors.length) {
			printParserErrors(parser.errors);
			continue;
		}

		if (values.compiler) {
			const compiler = new Compiler(constants, symbolTable);
			try {
				compiler.compile(program);
			} catch (e) {
				if (e instanceof ErrorObject) {
					reportError(e, line);
				}
				continue;
			}
			const vm = new VM(compiler.bytecode(), globals);
			try {
				vm.run();
			} catch (e) {
				if (e instanceof ErrorObject) {
					reportError(e, line);
					continue;
				}
			}
			if (values.bytecode) {
				console.log(stringify(compiler.bytecode().instructions));
			}
			if (vm.lastPoppedElement() instanceof ErrorObject) {
				reportError(vm.lastPoppedElement() as ErrorObject, line);
				continue;
			}
			console.log(vm.lastPoppedElement()?.inspect());
		} else {
			const evaluated = evaluate(program, env);
			if (evaluated instanceof ErrorObject) {
				reportError(evaluated, line);
				continue;
			}
			if (evaluated) {
				console.log(evaluated.inspect());
			}
		}

		if (values.ast) {
			console.dir(program.statements[0], { depth: null });
		}
		prompt();
	}
}
const printParserErrors = (errors: string[]) => {
	console.log(MONKEY_FACE);
	console.log("woops! we ran into some monkey business here!");
	console.log("parser errors:");
	errors.forEach((e) => console.log(e));
};
const prompt = () => process.stdout.write(">> ");

const MONKEY_FACE = `
            __,__
   .--.  .-"     "-.  .--.
  / .. \\/  .-. .-.  \\/ .. \\
 | |  '|  /   Y   \\  |'  | |
 | \\   \\  \\ 0 | 0 /  /   / |
  \\ '- ,\\.-"""""""-./, -' /
   ''-' /_   ^ ^   _\\ '-''
       |  \\._   _./  |
       \\   \\ '~' /   /
        '._ '-=-' _.'
           '-----'
`;

export function reportError(err: ErrorObject, source: string) {
	console.error(`\nError: ${err.msg}`);
	if (!err.span) return;

	const { line, col } = indexToLineCol(source, err.span.start);
	const lines = source.split("\n");
	const lineText = lines[line - 1] ?? "";
	const underlineLength = Math.max(1, err.span.end - err.span.start);
	const underline = " ".repeat(col - 1) + "^".repeat(underlineLength);

	const prefix = `${line}:${col} | `;
	console.error(prefix + lineText);
	console.error(" ".repeat(prefix.length) + underline);
	console.error();
}
function indexToLineCol(source: string, index: number) {
	let line = 1;
	let col = 1;
	for (let i = 0; i < index; i++) {
		if (source[i] === "\n") {
			line++;
			col = 1;
		} else {
			col++;
		}
	}
	return { line, col };
}
