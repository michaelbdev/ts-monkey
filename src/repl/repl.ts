import readline from "node:readline";
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
import { reportError } from "../utils/print-errors";
export async function repl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
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
  for await (const line of rl) {
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
        const vm = new VM(compiler.bytecode(), globals);
        vm.run();
        console.log(vm.lastPoppedElement()?.inspect());
      } catch (e) {
        if (e instanceof ErrorObject) {
          reportError(e, line);
        }
        continue;
      }
      if (values.bytecode) {
        console.log(stringify(compiler.bytecode().instructions));
      }
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
