import type { Maybe } from "../utils/types";

export enum SymbolScope {
	GlobalScope = "GLOBAL",
	LocalScope = "LOCAL",
	BuiltinScope = "BUILTIN",
	FreeScope = "FREE",
}

export type SymbolType = {
	name: string;
	scope: SymbolScope;
	index: number;
};

export class SymbolTable {
	public numDefs = 0;
	private readonly store = new Map<string, SymbolType>();
	public outer?: SymbolTable;
	public freeSymbols: SymbolType[] = [];
	public isBlockScope = false;

	define(name: string): SymbolType {
		let scope: SymbolScope;
		let index: number;

		if (this.isBlockScope && this.outer) {
			let root = this.outer;
			while (root.isBlockScope && root.outer) {
				root = root.outer;
			}

			const parentIsGlobal = !root.outer;
			scope = parentIsGlobal ? SymbolScope.GlobalScope : SymbolScope.LocalScope;
			index = root.numDefs;
			root.numDefs++;
		} else if (this.outer) {
			scope = SymbolScope.LocalScope;
			index = this.numDefs;
			this.numDefs++;
		} else {
			scope = SymbolScope.GlobalScope;
			index = this.numDefs;
			this.numDefs++;
		}

		const symbol = { name, index, scope };
		this.store.set(name, symbol);
		return symbol;
	}

	defineFree(original: SymbolType) {
		this.freeSymbols.push(original);
		const symbol = {
			name: original.name,
			scope: SymbolScope.FreeScope,
			index: this.freeSymbols.length - 1,
		};
		this.store.set(original.name, symbol);
		return symbol;
	}

	defineBuiltin(index: number, name: string) {
		const symbol = { name, scope: SymbolScope.BuiltinScope, index };
		this.store.set(name, symbol);
		return symbol;
	}

	existsInScope(name: string): boolean {
		const sym = this.store.get(name);
		if (!sym) return false;
		if (sym.scope === SymbolScope.BuiltinScope) return false;
		if (sym.scope === SymbolScope.FreeScope) return false;

		if (this.isBlockScope) {
			return true;
		}

		const isRoot = !this.outer;
		return isRoot
			? sym.scope === SymbolScope.GlobalScope
			: sym.scope === SymbolScope.LocalScope;
	}

	resolve(name: string): Maybe<SymbolType> {
		const symbol = this.store.get(name);
		if (!symbol && this.outer) {
			const sym = this.outer.resolve(name);
			if (
				sym?.scope === SymbolScope.GlobalScope ||
				sym?.scope === SymbolScope.BuiltinScope ||
				!sym
			) {
				return sym;
			}

			if (this.isBlockScope) {
				return sym;
			}

			const free = this.defineFree(sym);
			return free;
		}
		return symbol;
	}

	static newEnclosedSymbolTable(outer: SymbolTable) {
		const newSymbolTable = new SymbolTable();
		newSymbolTable.outer = outer;
		return newSymbolTable;
	}

	static newBlockScope(outer: SymbolTable) {
		const newSymbolTable = new SymbolTable();
		newSymbolTable.outer = outer;
		newSymbolTable.isBlockScope = true;
		return newSymbolTable;
	}
}
