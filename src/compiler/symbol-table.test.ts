import { describe, expect, it } from "bun:test";
import { SymbolScope, SymbolTable, type SymbolType } from "./symbol-table";

describe("define", () => {
	it("should create and return the symbol", () => {
		const expected: Record<string, SymbolType> = {
			a: {
				name: "a",
				scope: SymbolScope.GlobalScope,
				index: 0,
			},
			b: {
				name: "b",
				scope: SymbolScope.GlobalScope,
				index: 1,
			},
			c: {
				name: "c",
				scope: SymbolScope.LocalScope,
				index: 0,
			},
			d: {
				name: "d",
				scope: SymbolScope.LocalScope,
				index: 1,
			},
			e: {
				name: "e",
				scope: SymbolScope.LocalScope,
				index: 0,
			},
			f: {
				name: "f",
				scope: SymbolScope.LocalScope,
				index: 1,
			},
		};
		const global = new SymbolTable();
		const firstLocal = SymbolTable.newEnclosedSymbolTable(global);
		const secondLocal = SymbolTable.newEnclosedSymbolTable(firstLocal);
		expect(global.define("a")).toEqual(expected.a);
		expect(global.define("b")).toEqual(expected.b);
		expect(firstLocal.define("c")).toEqual(expected.c);
		expect(firstLocal.define("d")).toEqual(expected.d);
		expect(secondLocal.define("e")).toEqual(expected.e);
		expect(secondLocal.define("f")).toEqual(expected.f);
	});
});
describe("resolve", () => {
	it("should return the symbol", () => {
		const expected: SymbolType[] = [
			{
				name: "a",
				scope: SymbolScope.GlobalScope,
				index: 0,
			},
			{
				name: "b",
				scope: SymbolScope.GlobalScope,
				index: 1,
			},
		];

		const global = new SymbolTable();
		global.define("a");
		global.define("b");
		expected.forEach((sym) => {
			const res = global.resolve(sym.name);
			expect(res).toEqual(sym);
		});
	});
	it("should resolve locals", () => {
		const expected: SymbolType[] = [
			{
				name: "a",
				scope: SymbolScope.GlobalScope,
				index: 0,
			},
			{
				name: "b",
				scope: SymbolScope.GlobalScope,
				index: 1,
			},
			{
				name: "c",
				scope: SymbolScope.LocalScope,
				index: 0,
			},
			{
				name: "d",
				scope: SymbolScope.LocalScope,
				index: 1,
			},
		];

		const global = new SymbolTable();
		global.define("a");
		global.define("b");
		const local = SymbolTable.newEnclosedSymbolTable(global);
		local.define("c");
		local.define("d");
		expected.forEach((sym) => {
			const res = local.resolve(sym.name);
			expect(res).toEqual(sym);
		});
	});
	it("should resolve nested locals", () => {
		const global = new SymbolTable();
		global.define("a");
		global.define("b");
		const local = SymbolTable.newEnclosedSymbolTable(global);
		local.define("c");
		local.define("d");
		const secondLocal = SymbolTable.newEnclosedSymbolTable(local);
		secondLocal.define("e");
		secondLocal.define("f");
		const tests: { table: SymbolTable; symbols: SymbolType[] }[] = [
			{
				table: local,
				symbols: [
					{ name: "a", scope: SymbolScope.GlobalScope, index: 0 },
					{ name: "b", scope: SymbolScope.GlobalScope, index: 1 },
					{ name: "c", scope: SymbolScope.LocalScope, index: 0 },
					{ name: "d", scope: SymbolScope.LocalScope, index: 1 },
				],
			},
			{
				table: secondLocal,
				symbols: [
					{ name: "a", scope: SymbolScope.GlobalScope, index: 0 },
					{ name: "b", scope: SymbolScope.GlobalScope, index: 1 },
					{ name: "e", scope: SymbolScope.LocalScope, index: 0 },
					{ name: "f", scope: SymbolScope.LocalScope, index: 1 },
				],
			},
		];
		tests.forEach((test) => {
			test.symbols.forEach((sym) => {
				expect(test.table.resolve(sym.name)).toEqual(sym);
			});
		});
	});
	it("should resolve builtins", () => {
		const global = new SymbolTable();
		const firstLocal = SymbolTable.newEnclosedSymbolTable(global);
		const secondLocal = SymbolTable.newEnclosedSymbolTable(firstLocal);
		const expected: SymbolType[] = [
			{ name: "a", scope: SymbolScope.BuiltinScope, index: 0 },
			{ name: "b", scope: SymbolScope.BuiltinScope, index: 1 },
			{ name: "c", scope: SymbolScope.BuiltinScope, index: 2 },
		];
		expected.forEach((sym, i) => void global.defineBuiltin(i, sym.name));
		[global, firstLocal, secondLocal].forEach(
			(table) =>
				void expected.forEach((sym) => {
					const res = table.resolve(sym.name);
					expect(res).toEqual(sym);
				}),
		);
	});
	it("should resolve free variables", () => {
		const global = new SymbolTable();
		global.define("a");
		global.define("b");
		const firstLocal = SymbolTable.newEnclosedSymbolTable(global);
		firstLocal.define("c");
		firstLocal.define("d");
		const secondLocal = SymbolTable.newEnclosedSymbolTable(firstLocal);
		secondLocal.define("e");
		secondLocal.define("f");

		const tests = [
			{
				table: firstLocal,
				expectedSymbols: [
					{
						name: "a",
						scope: SymbolScope.GlobalScope,
						index: 0,
					},
					{
						name: "b",
						scope: SymbolScope.GlobalScope,
						index: 1,
					},
					{
						name: "c",
						scope: SymbolScope.LocalScope,
						index: 0,
					},
					{
						name: "d",
						scope: SymbolScope.LocalScope,
						index: 1,
					},
				],
				expectedFreeSymbols: [],
			},
			{
				table: secondLocal,
				expectedSymbols: [
					{
						name: "a",
						scope: SymbolScope.GlobalScope,
						index: 0,
					},
					{
						name: "b",
						scope: SymbolScope.GlobalScope,
						index: 1,
					},
					{
						name: "c",
						scope: SymbolScope.FreeScope,
						index: 0,
					},
					{
						name: "d",
						scope: SymbolScope.FreeScope,
						index: 1,
					},
					{
						name: "e",
						scope: SymbolScope.LocalScope,
						index: 0,
					},
					{
						name: "f",
						scope: SymbolScope.LocalScope,
						index: 1,
					},
				],
				expectedFreeSymbols: [
					{
						name: "c",
						scope: SymbolScope.LocalScope,
						index: 0,
					},
					{
						name: "d",
						scope: SymbolScope.LocalScope,
						index: 1,
					},
				],
			},
		] as {
			table: SymbolTable;
			expectedSymbols: SymbolType[];
			expectedFreeSymbols: SymbolType[];
		}[];
		tests.forEach((test) => {
			test.expectedSymbols.forEach((sym) => {
				const res = test.table.resolve(sym.name)!;
				expect(res).toEqual(sym);
			});
			expect(test.table.freeSymbols).toHaveLength(
				test.expectedFreeSymbols.length,
			);
			test.expectedFreeSymbols.forEach((free, i) => {
				const result = test.table.freeSymbols[i];
				expect(result).toEqual(free);
			});
		});
	});
	it("should shouldn't mark unresolvable as free variables", () => {
		const global = new SymbolTable();
		global.define("a");
		const firstLocal = SymbolTable.newEnclosedSymbolTable(global);
		firstLocal.define("c");
		const secondLocal = SymbolTable.newEnclosedSymbolTable(firstLocal);
		secondLocal.define("e");
		secondLocal.define("f");

		const expected = [
			{
				name: "a",
				scope: SymbolScope.GlobalScope,
				index: 0,
			},
			{
				name: "c",
				scope: SymbolScope.FreeScope,
				index: 0,
			},
			{
				name: "e",
				scope: SymbolScope.LocalScope,
				index: 0,
			},
			{
				name: "f",
				scope: SymbolScope.LocalScope,
				index: 1,
			},
		];

		expected.forEach((sym) => {
			const res = secondLocal.resolve(sym.name)!;
			expect(res).toEqual(sym);
		});
		const unresolvable = ["b", "d"];
		unresolvable.forEach((name) => {
			expect(secondLocal.resolve(name)).toBeUndefined();
		});
	});
});
