import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
} from '../types.ts';
import { parseBracketSyntax } from '../text_block_renderer.ts';

const MAX_MD_HEADING_DEPTH = 6;

/**
 * 将文本/标题渲染为 markdown（允许内嵌少量 HTML）。
 */
export function renderInlineToMarkdown(text: string): string {
  return parseBracketSyntax(text, {
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
      // 关键：整块处理，让跨行的 `\[...\]` / `\(...\)` 保持完整
      return renderInlineToMarkdown(node.lines.join('\n'));
    case 'code':
      return renderCodeLikeToMarkdown(node.lang, node.body);
    case 'script':
      return renderCodeLikeToMarkdown('script', node.body);
    case 'literal':
      return renderCodeLikeToMarkdown('literal', node.body);
  }
}

function pushNonEmpty(parts: string[], value: string): void {
  if (value.trim() !== '') parts.push(value);
}

function renderSubsectionToMarkdown(
  sub: SubsectionNode,
  headingLevel: number,
): string {
  const parts: string[] = [
    makeHeading(headingLevel, renderInlineToMarkdown(sub.title)),
  ];
  for (const content of sub.contents) {
    pushNonEmpty(parts, renderContentToMarkdown(content));
  }
  return parts.join('\n\n').trimEnd();
}

function renderSectionToMarkdown(section: SectionNode): string {
  const parts: string[] = [
    makeHeading(section.level, renderInlineToMarkdown(section.title)),
  ];
  for (const sub of section.subsections) {
    pushNonEmpty(parts, renderSubsectionToMarkdown(sub, section.level + 1));
  }
  for (const child of section.children) {
    pushNonEmpty(parts, renderSectionToMarkdown(child));
  }
  return parts.join('\n\n').trimEnd();
}

/**
 * 将解析后的文档树渲染为 Markdown（允许内嵌少量 HTML）。
 *
 * 处理：
 * - `#N 标题`    → markdown 标题（N>6 封顶为 6 级）
 * - `## 小节`    → 父级 +1 级标题
 * - `[r]{...}`  → `<span class="...">`
 * - `// 注释`   → 灰色 HTML span
 *
 * 不处理：
 * - 代码块 / script / literal（围栏长度自动加长）
 * - KaTeX 公式 `\(...\)`、`\[...\]`、`$...$`
 * - HTML 实体如 `&#92;`（不做二次转义）
 * - `- ` 列表（交给 markdown 渲染器）
 */
export function renderDocumentToMarkdown(doc: DocumentNode): string {
  const parts = doc.sections
    .map(renderSectionToMarkdown)
    .filter((p) => p.trim() !== '');
  return parts.join('\n\n') + '\n';
}
