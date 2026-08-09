import type { SectionNode, SubsectionNode, ContentNode } from '../types.ts';
import { ParseError } from './ParseError.ts';
import {
  SECTION_RE,
  SUBSECTION_RE,
  FENCE_OPEN_RE,
} from './regex_shared.ts';
import { parseCodeBlock, parseTextBlock } from './blocks.ts';

/**
 * 解析子标题（##）及其内容
 */
export function parseSubsection(
  lines: string[],
  start: number,
): { node: SubsectionNode; nextPos: number } {
  const line = lines[start]!;
  const match = line.match(SUBSECTION_RE);
  if (!match) {
    throw new ParseError(
      `Invalid subsection: ${JSON.stringify(line)}`,
      start + 1,
    );
  }

  const title = match[1]!.trim();
  const contents: ContentNode[] = [];
  let pos = start + 1;

  while (pos < lines.length) {
    const curLine = lines[pos]!;

    if (SECTION_RE.test(curLine) || SUBSECTION_RE.test(curLine)) {
      break;
    }

    const fenceMatch = curLine.match(FENCE_OPEN_RE);
    if (fenceMatch) {
      const codeResult = parseCodeBlock(
        lines,
        pos,
        fenceMatch[1]!,
        fenceMatch[2] ?? '',
      );
      contents.push(codeResult.node);
      pos = codeResult.nextPos;
      continue;
    }

    const textResult = parseTextBlock(lines, pos);
    contents.push(textResult.node);
    pos = textResult.nextPos;
  }

  return {
    node: { title, contents },
    nextPos: pos,
  };
}

/**
 * 解析 section（#N）区块
 */
export function parseSection(
  lines: string[],
  start: number,
  levelStack: number[],
): { node: SectionNode; nextPos: number } {
  const line = lines[start]!;
  const match = line.match(SECTION_RE);
  if (!match) {
    throw new ParseError(
      `Invalid section heading: ${JSON.stringify(line)}`,
      start + 1,
    );
  }

  const level = parseInt(match[1]!, 10);
  const title = match[2]!.trim();

  if (levelStack.length === 0) {
    if (level !== 1) {
      throw new ParseError(
        `Document must start with #1, got #${level}`,
        start + 1,
      );
    }
  } else {
    const current = levelStack[levelStack.length - 1]!;
    if (level !== current + 1 && level > current) {
      throw new ParseError(
        `Illegal section jump from #${current} to #${level} (must increment by 1)`,
        start + 1,
      );
    }
  }
  levelStack.push(level);

  const subsections: SubsectionNode[] = [];
  const children: SectionNode[] = [];
  let pos = start + 1;

  while (pos < lines.length) {
    const curLine = lines[pos]!;

    if (SECTION_RE.test(curLine)) {
      const nextLevel = parseInt(curLine.match(SECTION_RE)![1]!, 10);
      if (nextLevel === level + 1) {
        const result = parseSection(lines, pos, levelStack);
        children.push(result.node);
        pos = result.nextPos;
        continue;
      }
      if (nextLevel <= level) {
        break;
      }
      throw new ParseError(
        `Illegal section jump from #${level} to #${nextLevel}`,
        pos + 1,
      );
    }

    if (SUBSECTION_RE.test(curLine)) {
      const subResult = parseSubsection(lines, pos);
      subsections.push(subResult.node);
      pos = subResult.nextPos;
      continue;
    }

    if (curLine.trim() === '') {
      pos++;
      continue;
    }

    // 非空行无 ## 时，报错（包括代码块未以 ## 开始的情况）
    if (FENCE_OPEN_RE.test(curLine)) {
      throw new ParseError(
        `Content inside #${level} must be preceded by ##`,
        pos + 1,
      );
    }
    throw new ParseError(
      `Content inside #${level} must be preceded by ##`,
      pos + 1,
    );
  }

  levelStack.pop();
  return {
    node: { level, title, subsections, children },
    nextPos: pos,
  };
}
