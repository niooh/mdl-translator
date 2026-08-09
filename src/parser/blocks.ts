import type { ContentNode, TextNode } from '../types.ts';
import { ParseError } from './ParseError.ts';
import { FENCE_OPEN_RE, SECTION_RE, SUBSECTION_RE } from './regex_shared.ts';

/**
 * 返回行尾连续反斜杠的个数。
 */
function countTrailingBackslashes(line: string): number {
  let count = 0;
  for (let i = line.length - 1; i >= 0 && line[i] === '\\'; i--) {
    count++;
  }
  return count;
}

/**
 * 解析代码块（包括 script / literal）
 */
export function parseCodeBlock(
  lines: string[],
  openIdx: number,
  fence: string,
  lang: string,
): { node: ContentNode; nextPos: number } {
  const bodyLines: string[] = [];
  let pos = openIdx + 1;
  let closed = false;

  while (pos < lines.length) {
    const curLine = lines[pos]!;
    if (curLine.startsWith(fence) && curLine.trim() === fence) {
      closed = true;
      pos++;
      break;
    }
    bodyLines.push(curLine);
    pos++;
  }

  if (!closed) {
    throw new ParseError(
      `Unclosed code block opened at line ${openIdx + 1}`,
      openIdx + 1,
    );
  }

  const body = bodyLines.join('\n');
  let node: ContentNode = { kind: 'code', lang, body };

  if (lang === 'script') {
    node = { kind: 'script', body };
  } else if (lang === 'literal') {
    node = { kind: 'literal', body };
  }

  return { node, nextPos: pos };
}

/**
 * 收集连续文本行（含续行符处理），返回文本节点。
 */
export function parseTextBlock(
  lines: string[],
  start: number,
): { node: TextNode; nextPos: number } {
  const merged: string[] = [];
  let pos = start;

  while (pos < lines.length) {
    const curLine = lines[pos]!;

    if (
      SECTION_RE.test(curLine) ||
      SUBSECTION_RE.test(curLine) ||
      FENCE_OPEN_RE.test(curLine)
    ) {
      break;
    }

    merged.push(curLine);
    pos++;

    // 处理续行符
    while (merged.length > 0) {
      const last = merged[merged.length - 1]!;
      const bsCount = countTrailingBackslashes(last);
      if (bsCount % 2 === 1) {
        const kept = '\\'.repeat((bsCount - 1) / 2);
        const withoutContinuation = last.slice(0, last.length - bsCount) + kept;
        if (pos < lines.length) {
          const nextLine = lines[pos]!;
          merged[merged.length - 1] = withoutContinuation + nextLine;
          pos++;
        } else {
          merged[merged.length - 1] = withoutContinuation;
          break;
        }
      } else {
        const kept = '\\'.repeat(bsCount / 2);
        merged[merged.length - 1] = last.slice(0, last.length - bsCount) + kept;
        break;
      }
    }
  }

  return {
    node: { kind: 'text', lines: merged },
    nextPos: pos,
  };
}
