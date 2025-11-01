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
	type Node,
	PrefixExpression,
	Program,
	ReturnStatement,
	type Statement,
	StringLiteral,
} from "../ast/ast";
import {
	ArrayObject,
	BooleanObject,
	BuiltInObject,
	ErrorObject,
	FALSE_OBJ,
	FunctionObject,
	HashObject,
	type HashPairs,
	IntegerObject,
	type InternalObject,
	NULL_OBJ,
	ObjectType,
	ReturnValueObject,
	StringObject,
	TRUE_OBJ,
} from "../object/object";
import { TokenType } from "../token/token";
import type { Maybe } from "../utils/types";
import { builtins } from "./builtins";
import { Environment } from "./environment";

export function evaluate(
	node: Maybe<Node>,
	env: Environment,
): Maybe<InternalObject> {
	if (node instanceof IntegerLiteral) {
		return new IntegerObject(node.value!);
	}
	if (node instanceof Program) {
		return evalProgram(node.statements, env);
	}
	if (node instanceof ExpressionStatement) {
		return evaluate(node.expression, env);
	}
	if (node instanceof BooleanLiteral) {
		return node.value ? TRUE_OBJ : FALSE_OBJ;
	}
	if (node instanceof PrefixExpression) {
		const right = evaluate(node.rightExpression, env);
		if (isError(right)) return right;
		const expr = evaluatePrefixExpression(node.operator, right);
		return expr;
	}
	if (node instanceof InfixExpression) {
		const left = evaluate(node.leftExpr, env);
		const right = evaluate(node.rightExpr, env);
		if (isError(left)) return left;
		if (isError(right)) return right;

		return evaluateInfixExpression(left, node.operator, right);
	}
	if (node instanceof BlockStatement) {
		return evalBlockStatement(node, env);
	}

	if (node instanceof IfExpression) {
		return evalIfExpression(node, env);
	}
	if (node instanceof LetStatement) {
		const value = evaluate(node.value, env);
		if (isError(value)) {
			return value;
		}
		env.set(node.name!.value, value);
	}
	if (node instanceof ForStatement) {
		return evalForStatement(node, env);
	}
	if (node instanceof ReturnStatement) {
		const value = evaluate(node.value, env);
		if (isError(value)) return value;

		if (value) {
			return new ReturnValueObject(value);
		}
	}
	if (node instanceof Identifier) {
		return evalIdentifier(node, env);
	}
	if (node instanceof FunctionLiteral) {
		if (node.parameters && node.body) {
			return new FunctionObject(node.parameters, node.body, node.isArrow, env);
		}
		return new ErrorObject("malformed function");
	}
	if (node instanceof CallExpression) {
		const func = evaluate(node.func, env);
		if (isError(func)) return func;
		const args = evalExpressions(node.args!, env);
		if (args.length === 1 && isError(args.at(0))) {
			return args.at(0);
		}
		return applyFunction(func, args);
	}
	if (node instanceof ArrayLiteral) {
		const elements = evalExpressions(node.elements!, env);
		if (elements.length === 1 && isError(elements[0])) {
			return elements[0];
		}
		return new ArrayObject(elements);
	}
	if (node instanceof StringLiteral) {
		return new StringObject(node.value);
	}
	if (node instanceof HashLiteral) {
		return evalHashLiteral(node, env);
	}
	if (node instanceof IndexExpression) {
		const left = evaluate(node.left, env);
		if (isError(left)) return left;
		const index = evaluate(node.index, env);
		return evalIndexExpression(left, index);
	}

	return null;
}

const evalProgram = (statements: Statement[], env: Environment) => {
	let result: Maybe<InternalObject> = null;
	for (const statement of statements) {
		result = evaluate(statement, env);
		if (result instanceof ErrorObject) {
			return result;
		}
		if (result instanceof ReturnValueObject) {
			return result.value;
		}
	}
	return result;
};

const evaluatePrefixExpression = (
	operator: string,
	right: Maybe<InternalObject>,
) => {
	switch (operator) {
		case "!":
			return evalBangOperatorExpression(right);
		case "-":
			return evalMinusOperatorExpression(right);
		default:
			return new ErrorObject(`unknown operator: ${operator} ${right?.type()}`);
	}
};
const evalBangOperatorExpression = (right: Maybe<InternalObject>) => {
	switch (right) {
		case TRUE_OBJ:
			return FALSE_OBJ;

		case FALSE_OBJ:
			return TRUE_OBJ;

		case NULL_OBJ:
			return TRUE_OBJ;

		default:
			return FALSE_OBJ;
	}
};

const evalMinusOperatorExpression = (right: Maybe<InternalObject>) => {
	if (right?.type() !== ObjectType.INTEGER_OBJ) {
		return new ErrorObject(`unknown operator: -${right?.type()}`);
	}

	const value = (right as IntegerObject).value;
	return new IntegerObject(-value);
};

const evaluateInfixExpression = (
	left: Maybe<InternalObject>,
	operator: string,
	right: Maybe<InternalObject>,
) => {
	if (left?.type() !== right?.type()) {
		return new ErrorObject(
			`type mismatch: ${left?.type()} ${operator} ${right?.type()}`,
		);
	}

	if (
		left?.type() === ObjectType.INTEGER_OBJ &&
		right?.type() === ObjectType.INTEGER_OBJ
	) {
		return evalIntegerInfixExpression(left, operator, right);
	}
	if (
		left?.type() === ObjectType.STRING_OBJ &&
		right?.type() === ObjectType.STRING_OBJ
	) {
		return evalStringInfixExpression(left, operator, right);
	}
	if (operator === TokenType.EQ) {
		return nativeBoolToBooleanObject(left === right);
	}
	if (operator === TokenType.NOT_EQ) {
		return nativeBoolToBooleanObject(left !== right);
	}
	if (left?.type() === ObjectType.BOOLEAN_OBJ && operator === TokenType.OR) {
		const leftValue = (left as BooleanObject).value;
		const rightValue = (right as BooleanObject).value;
		return nativeBoolToBooleanObject(leftValue || rightValue);
	}
	if (left?.type() === ObjectType.BOOLEAN_OBJ && operator === TokenType.AND) {
		const leftValue = (left as BooleanObject).value;
		const rightValue = (right as BooleanObject).value;
		return nativeBoolToBooleanObject(leftValue && rightValue);
	}

	return new ErrorObject(
		`unknown operator: ${left?.type()} ${operator} ${right?.type()}`,
	);
};

const nativeBoolToBooleanObject = (bool: boolean) => {
	return bool ? TRUE_OBJ : FALSE_OBJ;
};
const evalIntegerInfixExpression = (
	left: Maybe<InternalObject>,
	operator: string,
	right: Maybe<InternalObject>,
) => {
	const leftValue = (left as IntegerObject).value;
	const rightValue = (right as IntegerObject).value;
	switch (operator) {
		case "+":
			return new IntegerObject(leftValue + rightValue);

		case "-":
			return new IntegerObject(leftValue - rightValue);

		case "*":
			return new IntegerObject(leftValue * rightValue);
		case "/":
			if (rightValue === 0) {
				return new ErrorObject("cannot divide by 0");
			}
			return new IntegerObject(leftValue / rightValue);
		case "%":
			if (rightValue === 0) {
				return new ErrorObject("cannot divide by 0");
			}
			return new IntegerObject(leftValue % rightValue);
		case "<":
			return nativeBoolToBooleanObject(leftValue < rightValue);
		case "<=":
			return nativeBoolToBooleanObject(leftValue <= rightValue);
		case ">":
			return nativeBoolToBooleanObject(leftValue > rightValue);
		case ">=":
			return nativeBoolToBooleanObject(leftValue >= rightValue);
		case "==":
			return nativeBoolToBooleanObject(leftValue === rightValue);
		case "!=":
			return nativeBoolToBooleanObject(leftValue !== rightValue);
		default:
			return new ErrorObject(
				`unknown operator: ${left?.type()} ${operator} ${right?.type()}`,
			);
	}
};

const evalIfExpression = (ifExpr: IfExpression, env: Environment) => {
	const condition = evaluate(ifExpr.condition, env);
	if (isError(condition)) return condition;
	const newEnv = Environment.newEnclosedEnvironment(env);
	if (isTruthy(condition)) {
		return evaluate(ifExpr.consequence, newEnv);
	}
	if (ifExpr.alternative) {
		return evaluate(ifExpr.alternative, newEnv);
	}
	return NULL_OBJ;
};
const isTruthy = (obj: Maybe<InternalObject>) => {
	switch (obj) {
		case NULL_OBJ:
			return false;

		case TRUE_OBJ:
			return true;

		case FALSE_OBJ:
			return false;

		default:
			return true;
	}
};

const evalBlockStatement = (
	blockStatement: BlockStatement,
	env: Environment,
) => {
	let result: Maybe<InternalObject> = null;

	for (const statement of blockStatement.statements) {
		result = evaluate(statement, env);
		if (
			result?.type() === ObjectType.RETURN_VALUE_OBJ ||
			result?.type() === ObjectType.ERROR_OBJ
		) {
			return result;
		}
	}
	return result;
};

const isError = (obj: Maybe<InternalObject>) =>
	obj?.type() === ObjectType.ERROR_OBJ;

const evalIdentifier = (node: Identifier, env: Environment) => {
	const value = env.get(node.value);
	if (value) {
		return value;
	}
	if (builtins[node.value]) {
		return builtins[node.value];
	}
	return new ErrorObject(`identifier not found: ${node.value}`);
};
const evalExpressions = (exprs: Expression[], env: Environment) => {
	const result: Maybe<InternalObject>[] = [];
	for (const expr of exprs) {
		const evaluated = evaluate(expr, env);
		if (isError(evaluated)) {
			return [evaluated];
		}
		result.push(evaluated);
	}
	return result;
};

export const applyFunction = (
	func: Maybe<InternalObject>,
	args: Maybe<InternalObject>[],
) => {
	if (func instanceof FunctionObject) {
		const extendedEnv = extendFunctionEnv(func, args);
		const evaluated = evaluate(func.body, extendedEnv);
		return unwrapReturnValue(evaluated);
	}
	if (func instanceof BuiltInObject) {
		return func.fn({ env: "interpreter", args });
	}
	return new ErrorObject(`not a function: ${func?.type()}`);
};

const extendFunctionEnv = (
	func: FunctionObject,
	args: Maybe<InternalObject>[],
) => {
	const env = Environment.newEnclosedEnvironment(func.env);
	func.params.forEach((param, i) => {
		env.set(param.value, args[i]);
	});
	return env;
};
const unwrapReturnValue = (obj: Maybe<InternalObject>) => {
	if (obj instanceof ReturnValueObject) {
		return obj.value;
	}
	return obj;
};
const evalStringInfixExpression = (
	left: Maybe<InternalObject>,
	operator: string,
	right: Maybe<InternalObject>,
) => {
	const leftValue = (left as StringObject).value;
	const rightValue = (right as StringObject).value;
	switch (operator) {
		case "+":
			return new StringObject(leftValue + rightValue);

		case "==":
			return leftValue === rightValue ? TRUE_OBJ : FALSE_OBJ;

		case "!=":
			return leftValue !== rightValue ? TRUE_OBJ : FALSE_OBJ;
		default:
			return new ErrorObject(
				`unknown operator: ${left?.type()} ${operator} ${right?.type()}`,
			);
	}
};
const evalIndexExpression = (
	left: Maybe<InternalObject>,
	index: Maybe<InternalObject>,
) => {
	if (left instanceof ArrayObject && index?.type() === ObjectType.INTEGER_OBJ) {
		return evalArrayIndexExpression(left, index as IntegerObject);
	}
	if (
		left instanceof StringObject &&
		index?.type() === ObjectType.INTEGER_OBJ
	) {
		return evalStringIndexExpression(left, index as IntegerObject);
	}
	if (left instanceof HashObject) {
		return evalHashIndexExpression(left, index);
	}
	return new ErrorObject(`index operator not supported: ${left?.type()}`);
};
const evalArrayIndexExpression = (left: ArrayObject, index: IntegerObject) => {
	const idx = index.value;
	const max = left.elements.length - 1;
	if (idx < 0 || idx > max) {
		return NULL_OBJ;
	}
	return left.elements[idx];
};
const evalStringIndexExpression = (
	left: StringObject,
	index: IntegerObject,
) => {
	const idx = index.value;
	const max = left.value.length - 1;
	if (idx < 0 || idx > max) {
		return NULL_OBJ;
	}
	return new StringObject(left.value[idx]);
};
export const evalHashLiteral = (node: HashLiteral, env: Environment) => {
	const pairs: HashPairs = new Map();
	for (const [key, value] of node.pairs!.entries()) {
		const evalKey = evaluate(key, env);
		if (isError(evalKey)) {
			return evalKey;
		}
		if (
			!(
				evalKey instanceof StringObject ||
				evalKey instanceof IntegerObject ||
				evalKey instanceof BooleanObject
			)
		) {
			return new ErrorObject(`cannot use ${evalKey?.type()} as hash key`);
		}
		const evalValue = evaluate(value, env);
		if (isError(evalValue)) return evalValue;
		pairs.set(evalKey.value, { key: evalKey, value: evalValue });
	}
	return new HashObject(pairs);
};

const evalHashIndexExpression = (
	hash: HashObject,
	index: Maybe<InternalObject>,
) => {
	if (
		!(
			index instanceof StringObject ||
			index instanceof IntegerObject ||
			index instanceof BooleanObject
		)
	) {
		return new ErrorObject(`cannot access hash with type: ${index?.type()}`);
	}
	const val = hash.pairs.get(index.value);
	return val?.value || NULL_OBJ;
};

const evalForStatement = (node: ForStatement, env: Environment) => {
	const iter = evaluate(node.iterable, env);
	if (isError(iter)) return iter;
	if (!(iter instanceof ArrayObject)) {
		return new ErrorObject("iterable does not evaluate to an array!");
	}

	for (const [i, el] of iter.elements.entries()) {
		const newEnv = Environment.newEnclosedEnvironment(env);
		newEnv.set(node.currItem?.value!, el);
		if (node.currIndex) {
			newEnv.set(node.currIndex.value, new IntegerObject(i));
		}
		const item = evaluate(node.body, newEnv);

		if (item instanceof ReturnValueObject || isError(item)) {
			return item;
		}
	}
	return NULL_OBJ;
};
