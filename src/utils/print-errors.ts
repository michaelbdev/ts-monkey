import type { ErrorObject } from "../object/object";

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
