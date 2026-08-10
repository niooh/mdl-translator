import type { ContentNode, TextNode } from '../types.ts';
import { ParseError } from './ParseError.ts';
import { FENCE_OPEN_RE, SECTION_RE, SUBSECTION_RE } from './regex_shared.ts';

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
 * 解析文本块（含续行符处理），返回文本节点。
 * 续行规则：仅当行末恰好是一个反斜杠 \ 时，删除该反斜杠并拼接下一行；
 *  其他情况（0、2、3、4…个反斜杠）均原样保留，不续行。
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
      // 检查是否以单个反斜杠结尾
      if (last.endsWith('\\') && !last.endsWith('\\\\')) {
        const withoutContinuation = last.slice(0, -1); // 删掉末尾的反斜杠
        if (pos < lines.length) {
          merged[merged.length - 1] = withoutContinuation + lines[pos]!;
          pos++;
        } else {
          // 文件末尾，直接丢掉反斜杠
          merged[merged.length - 1] = withoutContinuation;
          break;
        }
      } else {
        // 不以单个反斜杠结尾，停止续行
        break;
      }
    }
  }

  return {
    node: { kind: 'text', lines: merged },
    nextPos: pos,
  };
}
