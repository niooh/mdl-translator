import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
  TextNode,
} from './types.js';

const SECTION_RE = /^#(\d+) +(.*)/;
const SUBSECTION_RE = /^## +(.*)/;
const FENCE_OPEN_RE = /^(`{3,})(\w*)\s*$/;

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}

/** 将源文本按行分割，统一处理各种换行符 */
function splitLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

/**
 * 解析 section（#N）区块
 */
function parseSection(
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

  // 验证层级
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

    // 遇到新 section 行
    if (SECTION_RE.test(curLine)) {
      const nextLevelMatch = curLine.match(SECTION_RE)!;
      const nextLevel = parseInt(nextLevelMatch[1]!, 10);

      if (nextLevel === level + 1) {
        // 子 section
        const result = parseSection(lines, pos, levelStack);
        children.push(result.node);
        pos = result.nextPos;
        continue;
      }
      if (nextLevel <= level) {
        break; // 交还父级处理
      }
      // 不会到达这里
      throw new ParseError(
        `Illegal section jump from #${level} to #${nextLevel}`,
        pos + 1,
      );
    }

    // 遇到 ## 子标题
    if (SUBSECTION_RE.test(curLine)) {
      const subResult = parseSubsection(lines, pos);
      subsections.push(subResult.node);
      pos = subResult.nextPos;
      continue;
    }

    // 空行：在 section 内部直接忽略（不报错，也不跳过连续空行）
    if (curLine.trim() === '') {
      pos++;
      continue;
    }

    // 其他非空行：非法内容
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

/**
 * 解析子标题（##）及其内容
 */
function parseSubsection(
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

    // 终止条件
    if (SECTION_RE.test(curLine) || SUBSECTION_RE.test(curLine)) {
      break;
    }

    // 代码块
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

    // 收集文本行，允许空行作为段落分隔，但不退出??
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
 * 解析代码块，包括 script
 */
function parseCodeBlock(
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
  // 默认：代码块
  let node: ContentNode = { kind: 'code', lang, body };

  if (lang === 'script') {
    node = { kind: 'script', body };
  } else if (lang === 'literal') {
    node = { kind: 'literal', body };
  }

  return { node, nextPos: pos };
}

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
 * 收集连续的非空行（允许空行作为分隔），并立即处理反斜杠续行，
 * 返回一个文本节点。
 */
function parseTextBlock(
  lines: string[],
  start: number,
): { node: TextNode; nextPos: number } {
  const merged: string[] = []; // 最终的行集合
  let pos = start;

  while (pos < lines.length) {
    const curLine = lines[pos]!;

    // 遇到标题或代码块终止符，则结束当前文本块
    if (
      SECTION_RE.test(curLine) ||
      SUBSECTION_RE.test(curLine) ||
      FENCE_OPEN_RE.test(curLine)
    ) {
      break;
    }

    // 收集到的行需要进行反斜杠续行处理
    // 将当前行推入 merged，然后检查它是否需要与下一行合并
    merged.push(curLine);
    pos++;

    // 持续检查 merged 最后一行是否以奇数个 \ 结尾，如果是，且后面还有行，则合并
    while (merged.length > 0) {
      const last = merged[merged.length - 1]!;
      const bsCount = countTrailingBackslashes(last);
      if (bsCount % 2 === 1) {
        // 奇数：将最后的 \ 去掉（续行符），剩下的 (bsCount-1)/2 个 \ 作为普通字符保留
        const kept = '\\'.repeat((bsCount - 1) / 2);
        const withoutContinuation = last.slice(0, last.length - bsCount) + kept;
        if (pos < lines.length) {
          // 有下一行，合并
          const nextLine = lines[pos]!;
          merged[merged.length - 1] = withoutContinuation + nextLine;
          pos++;
          // 继续检查新合并的行（可能仍以 \ 结尾）
        } else {
          // 文件结束，奇数个 \ 结尾没有后续行，同样移除续行符
          merged[merged.length - 1] = withoutContinuation;
          break;
        }
      } else {
        // 偶数（包括0）：保留 bsCount/2 个 \ 作为普通字符，无续行
        const kept = '\\'.repeat(bsCount / 2);
        merged[merged.length - 1] = last.slice(0, last.length - bsCount) + kept;
        break; // 无需继续合并
      }
    }

    // 如果当前行是一行空行，也保留在 merged 中
  }

  return {
    node: { kind: 'text', lines: merged },
    nextPos: pos,
  };
}

/**
 * 顶层解析函数
 */
export function parse(source: string): DocumentNode {
  const lines = splitLines(source);
  const sections: SectionNode[] = [];
  const levelStack: number[] = [];

  let pos = 0;
  // 跳过文件开头的空行
  while (pos < lines.length && lines[pos]!.trim() === '') {
    pos++;
  }
  if (pos >= lines.length) {
    return { sections: [] };
  }

  // 首行必须是 #1
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
    // 跳过 section 间的空行（只逐行跳过，不批量）
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
