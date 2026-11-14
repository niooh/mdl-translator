import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
} from '../types.ts';
import { parseBracketSyntax } from '../text_block_renderer.ts';
import { escapeHtml } from '../html.ts';

const MAX_MD_HEADING_DEPTH = 6;

/** 用于识别需要原样保留的 KaTeX 公式片段（不参与 HTML 转义）。 */
const KATEX_PROTECT_PATTERNS: RegExp[] = [
  /\\\([\s\S]*?\\\)/g,          // \( ... \)
  /\\\[[\s\S]*?\\\]/g,          // \[ ... \]
  /(?<!\$)\$(?!\$)(?:\\.|[^$\\])+?(?<!\$)\$(?!\$)/g, // $ ... $
];

/**
 * 对文本做 HTML 转义（& < > "），但跳过 KaTeX 公式片段，
 * 让公式原文原样进入最终 markdown，由下游渲染器处理。
 */
function escapePreservingKatex(text: string): string {
  const intervals: { start: number; end: number }[] = [];
  for (const pattern of KATEX_PROTECT_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      intervals.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  intervals.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ start: iv.start, end: iv.end });
    }
  }

  let result = '';
  let cursor = 0;
  for (const { start, end } of merged) {
    result += escapeHtml(text.slice(cursor, start));
    result += text.slice(start, end); // 公式原文
    cursor = end;
  }
  result += escapeHtml(text.slice(cursor));
  return result;
}

/**
 * 渲染一行内联内容为 markdown（允许内嵌少量 HTML）。
 * - 先对非公式文本做 HTML 转义
 * - 再展开 `[style]{...}` 为 HTML span
 * - `- ` 列表保持原样，交给 markdown 自身渲染
 */
export function renderInlineToMarkdown(text: string): string {
  return parseBracketSyntax(escapePreservingKatex(text), {
    transformLists: false,
    transformComments: true,
  });
}

function makeHeading(level: number, text: string): string {
  const depth = Math.min(Math.max(level, 1), MAX_MD_HEADING_DEPTH);
  return `${'#'.repeat(depth)} ${text}`;
}

/** 根据 body 中最长连续反引号自动选择围栏长度。 */
function fenceFor(body: string): string {
  const runs = body.match(/`+/g) ?? [];
  const maxRun = runs.reduce((m, r) => Math.max(m, r.length), 0);
  return '`'.repeat(Math.max(3, maxRun + 1));
}

function renderCodeLikeToMarkdown(lang: string, body: string): string {
  const fence = fenceFor(body);
  return `${fence}${lang}\n${body}\n${fence}`;
}

function renderContentToMarkdown(node: ContentNode): string {
  switch (node.kind) {
    case 'text':
      return node.lines.map((line) => renderInlineToMarkdown(line)).join('\n');
    case 'code':
      return renderCodeLikeToMarkdown(node.lang, node.body);
    case 'script':
      return renderCodeLikeToMarkdown('script', node.body);
    case 'literal':
      return renderCodeLikeToMarkdown('literal', node.body);
  }
}

function renderSubsectionToMarkdown(
  sub: SubsectionNode,
  headingLevel: number,
): string {
  const parts: string[] = [
    makeHeading(headingLevel, renderInlineToMarkdown(sub.title)),
  ];
  for (const content of sub.contents) {
    parts.push(renderContentToMarkdown(content));
  }
  return parts.join('\n\n').trimEnd();
}

function renderSectionToMarkdown(section: SectionNode): string {
  const parts: string[] = [
    makeHeading(section.level, renderInlineToMarkdown(section.title)),
  ];
  for (const sub of section.subsections) {
    parts.push(renderSubsectionToMarkdown(sub, section.level + 1));
  }
  for (const child of section.children) {
    parts.push(renderSectionToMarkdown(child));
  }
  return parts.join('\n\n').trimEnd();
}

/**
 * 将解析后的文档树渲染为 Markdown（允许内嵌少量 HTML）。
 *
 * 处理范围：
 * - `#N 标题`      → markdown 标题（N>6 时封顶为 6 级）
 * - `## 小节`      → markdown 下一级标题
 * - `[r]{...}` 等  → `<span class="...">`（style 语法展开）
 * - `//` 注释      → 灰色 HTML span
 *
 * 不处理（原样保留）：
 * - 代码块（普通 / `script` / `literal`），围栏长度自动加长
 * - KaTeX 公式 `\(...\)`、`\[...\]`、`$...$`
 * - `- ` 列表，由 markdown 渲染器自行处理
 */
export function renderDocumentToMarkdown(doc: DocumentNode): string {
  const parts = doc.sections.map(renderSectionToMarkdown);
  return parts.join('\n\n') + '\n';
}
