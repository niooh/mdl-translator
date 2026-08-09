import type { DocumentNode, SectionNode } from '../types.ts';
import { SECTION_RE } from './regex_shared.ts'; 
import { parseSection } from './sections.ts';
import { ParseError } from './ParseError.ts';
export { ParseError }

/** 将源文本按行分割，统一处理各种换行符 */
function splitLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

/** 顶层解析函数 */
export function parse(source: string): DocumentNode {
  const lines = splitLines(source);
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
