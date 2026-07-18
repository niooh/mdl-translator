import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
  TextNode,
} from './types.js'

const SECTION_RE = /^#(\d+) +(.*)/
const SUBSECTION_RE = /^## +(.*)/
const FENCE_OPEN_RE = /^(`{3,})(\w*)\s*$/

export class ParseError extends Error {
  constructor(message: string, public readonly line: number) {
    super(`Line ${line}: ${message}`)
    this.name = 'ParseError'
  }
}

/** 将源文本按行分割，统一处理各种换行符 */
function splitLines(source: string): string[] {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
}

/** 跳过空白行，返回下一个有效行的索引 */
function skipBlank(lines: string[], pos: number): number {
  while (pos < lines.length && lines[pos]!.trim() === '') {
    pos++
  }
  return pos
}

/**
 * 解析 section（#N）区块
 * @returns { node, nextPos }
 */
function parseSection(
  lines: string[],
  start: number,
  levelStack: number[]
): { node: SectionNode; nextPos: number } {
  const line = lines[start]!
  const match = line.match(SECTION_RE)
  if (!match) {
    throw new ParseError(
      `Invalid section heading: ${JSON.stringify(line)}`,
      start + 1
    )
  }

  const level = parseInt(match[1]!, 10)
  const title = match[2]!.trim()

  // 验证层级
  if (levelStack.length === 0) {
    if (level !== 1) {
      throw new ParseError(`Document must start with #1, got #${level}`, start + 1)
    }
  } else {
    const current = levelStack[levelStack.length - 1]!
    if (level !== current + 1 && level > current) {
      throw new ParseError(
        `Illegal section jump from #${current} to #${level} (must increment by 1)`,
        start + 1
      )
    }
  }
  levelStack.push(level)

  const subsections: SubsectionNode[] = []
  const children: SectionNode[] = []

  let pos = skipBlank(lines, start + 1)

  while (pos < lines.length) {
    const curLine = lines[pos]!

    // 遇到新 section 行
    if (SECTION_RE.test(curLine)) {
      const nextLevelMatch = curLine.match(SECTION_RE)!
      const nextLevel = parseInt(nextLevelMatch[1]!, 10)

      if (nextLevel === level + 1) {
        // 子 section
        const result = parseSection(lines, pos, levelStack)
        children.push(result.node)
        pos = skipBlank(lines, result.nextPos)
        continue
      }
      if (nextLevel <= level) {
        break // 交还父级处理
      }
      // 不可能到这里（已在 parseSection 开头检查）
      throw new ParseError(
        `Illegal section jump from #${level} to #${nextLevel}`,
        pos + 1
      )
    }

    // 遇到 ## 子标题
    if (SUBSECTION_RE.test(curLine)) {
      const subResult = parseSubsection(lines, pos)
      subsections.push(subResult.node)
      pos = skipBlank(lines, subResult.nextPos)
      continue
    }

    // 其他非空行：非法内容
    if (curLine.trim() !== '') {
      if (FENCE_OPEN_RE.test(curLine)) {
        throw new ParseError(
          `Content inside #${level} must be preceded by ##`,
          pos + 1
        )
      }
      throw new ParseError(
        `Content inside #${level} must be preceded by ##`,
        pos + 1
      )
    }

    // 空行跳过
    pos = skipBlank(lines, pos)
  }

  levelStack.pop()
  return {
    node: { level, title, subsections, children },
    nextPos: pos,
  }
}

/**
 * 解析子标题（##）及其内容
 */
function parseSubsection(
  lines: string[],
  start: number
): { node: SubsectionNode; nextPos: number } {
  const line = lines[start]!
  const match = line.match(SUBSECTION_RE)
  if (!match) {
    throw new ParseError(`Invalid subsection: ${JSON.stringify(line)}`, start + 1)
  }
  const title = match[1]!.trim()
  const contents: ContentNode[] = []

  let pos = start + 1

  while (pos < lines.length) {
    const curLine = lines[pos]!

    // 终止条件
    if (SECTION_RE.test(curLine) || SUBSECTION_RE.test(curLine)) {
      break
    }

    // 代码块
    const fenceMatch = curLine.match(FENCE_OPEN_RE)
    if (fenceMatch) {
      const codeResult = parseCodeBlock(lines, pos, fenceMatch[1]!, fenceMatch[2] ?? '')
      contents.push(codeResult.node)
      pos = codeResult.nextPos
      continue
    }

    // 收集文本行（允许空行作为段落分隔，但不退出）
    const textResult = parseTextBlock(lines, pos)
    contents.push(textResult.node)
    pos = textResult.nextPos
  }

  return {
    node: { title, contents },
    nextPos: pos,
  }
}

/**
 * 解析代码块（包括 script）
 */
function parseCodeBlock(
  lines: string[],
  openIdx: number,
  fence: string,
  lang: string
): { node: ContentNode; nextPos: number } {
  const bodyLines: string[] = []
  let pos = openIdx + 1
  let closed = false

  while (pos < lines.length) {
    const curLine = lines[pos]!
    if (curLine.startsWith(fence) && curLine.trim() === fence) {
      closed = true
      pos++
      break
    }
    bodyLines.push(curLine)
    pos++
  }

  if (!closed) {
    throw new ParseError(`Unclosed code block opened at line ${openIdx + 1}`, openIdx + 1)
  }

  const body = bodyLines.join('\n')
  const node: ContentNode =
    lang === 'script'
      ? { kind: 'script', body }
      : { kind: 'code', lang, body }

  return { node, nextPos: pos }
}

/**
 * 收集连续的非空行作为一个文本块，遇到空行结束
 */
function parseTextBlock(
  lines: string[],
  start: number
): { node: TextNode; nextPos: number } {
  const textLines: string[] = []
  let pos = start

  while (pos < lines.length) {
    const curLine = lines[pos]!
    if (
      SECTION_RE.test(curLine) ||
      SUBSECTION_RE.test(curLine) ||
      FENCE_OPEN_RE.test(curLine)
    ) {
      break
    }
    textLines.push(curLine)
    pos++

    // 如果遇到空行，仍继续收集（作为同一文本块的段落分隔），直到遇到标题或代码块
  }

  return {
    node: { kind: 'text', lines: textLines },
    nextPos: pos,
  }
}

/**
 * 顶层解析函数
 */
export function parse(source: string): DocumentNode {
  const lines = splitLines(source)
  const sections: SectionNode[] = []
  const levelStack: number[] = []

  let pos = skipBlank(lines, 0)
  if (pos >= lines.length) {
    return { sections: [] }
  }

  // 首行必须是 #1
  const firstLine = lines[pos]!
  const firstMatch = firstLine.match(SECTION_RE)
  if (!firstMatch || parseInt(firstMatch[1]!, 10) !== 1) {
    const hex = Buffer.from(firstLine, 'utf8').toString('hex')
    throw new ParseError(
      `Document must start with a #1 section, got: ${JSON.stringify(firstLine)} (hex: ${hex})`,
      pos + 1
    )
  }

  while (pos < lines.length) {
    pos = skipBlank(lines, pos)
    if (pos >= lines.length) break

    const curLine = lines[pos]!
    if (!SECTION_RE.test(curLine)) {
      const hex = Buffer.from(curLine, 'utf8').toString('hex')
      throw new ParseError(
        `Expected a section heading (#N), got: ${JSON.stringify(curLine)} (hex: ${hex})`,
        pos + 1
      )
    }

    const result = parseSection(lines, pos, levelStack)
    sections.push(result.node)
    pos = result.nextPos
  }

  return { sections }
}