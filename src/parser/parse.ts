import type { DocumentNode, SectionNode } from '../types.ts';
import { SECTION_RE } from './regex_shared.ts';
import { parseSection } from './sections.ts';
import { ParseError } from './ParseError.ts';

/** 为 ParseError 附加行上下文（前后各 2 行） */
function attachContext(err: ParseError, lines: string[]): ParseError {
  const errorLine = err.line;
  const start = Math.max(1, errorLine - 2);
  const end = Math.min(lines.length, errorLine + 2);

  const numWidth = Math.max(2, String(end).length);

  const contextLines: string[] = [];
  for (let i = start; i <= end; i++) {
    const marker = i === errorLine ? '> ' : '  ';
    const lineNum = String(i).padStart(numWidth);
    contextLines.push(`${marker}${lineNum} | ${lines[i - 1] ?? ''}`);
  }
  err.context = contextLines.join('\n');
  return err;
}

/** 顶层解析函数 */
export function parse(source: string): DocumentNode {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  try {
    return _parse(lines);
  } catch (err) {
    if (err instanceof ParseError) {
      throw attachContext(err, lines);
    }
    throw err;
  }
}

/** 内部解析实现 */
function _parse(lines: string[]): DocumentNode {
  const sections: SectionNode[] = [];
  const levelStack: number[] = [];
  let pos = 0;

  while (pos < lines.length && lines[pos]!.trim() === '') {
    pos++;
  }

  if (pos >= lines.length) {
    return { sections: [] };
  }

  const firstLine = lines[pos]!;
  const firstMatch = firstLine.match(SECTION_RE);
  if (!firstMatch || parseInt(firstMatch[1]!, 10) !== 1) {
    const hex = Buffer.from(firstLine, 'utf8').toString('hex');
    throw new ParseError(
      `Document must start with a #1 section, got: ${JSON.stringify(firstLine)} (hex: ${hex})`,
      pos + 1,
    );
  }

  while (pos < lines.length) {
    while (pos < lines.length && lines[pos]!.trim() === '') {
      pos++;
    }
    if (pos >= lines.length) break;

    const curLine = lines[pos]!;
    if (!SECTION_RE.test(curLine)) {
      const hex = Buffer.from(curLine, 'utf8').toString('hex');
      throw new ParseError(
        `Expected a section heading (#N), got: ${JSON.stringify(curLine)} (hex: ${hex})`,
        pos + 1,
      );
    }

    const result = parseSection(lines, pos, levelStack);
    sections.push(result.node);
    pos = result.nextPos;
  }

  return { sections };
}
