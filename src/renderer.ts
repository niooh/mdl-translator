import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
} from './types.ts';
import { executeScript } from './executor.ts';
import { renderTextLines } from './text_block_renderer.ts';

import katex from 'katex';

const ESCAPE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
} as const;

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (char) => ESCAPE_CHARS[char as keyof typeof ESCAPE_CHARS],
  );
}

const KATEX_PATTERN: RegExp = /\\\(.+?\\\)|\\\[[\s\S]*?\\\]|\$[^$]+\$/;

export function renderDocument(doc: DocumentNode, hasKatex: boolean): string {
  const body = doc.sections.map(renderSection).join('\n');
  const katexLink = hasKatex
    ? `<link rel="stylesheet" href="assets/katex.min.css">`
    : '';

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Document</title>
${katexLink}
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="document">
${body}
</div>
</body>
</html>`;
}

function renderSection(section: SectionNode): string {
  const subs = section.subsections.map(renderSubsection).join('\n');
  const kids = section.children.map(renderSection).join('\n');
  return `<div class="section-container level-${section.level}">
<div class="section-title title-level-${section.level}">${escapeHtml(section.title)}</div>
${subs}
${kids}
</div>`;
}

function renderSubsection(sub: SubsectionNode): string {
  const contents = sub.contents.map(renderContent).join('\n');
  return `<div class="subsection">
<div class="subsection-heading">▶ ${escapeHtml(sub.title)}</div>
<div class="subsection-body">
${contents}
<br/></div></div>`; // 末尾换行
}

function renderContent(node: ContentNode): string {
  switch (node.kind) {
    case 'text':
      return renderTextLines(node.lines);
    case 'code':
      return `<pre><code class="language-${escapeHtml(node.lang)}">${node.body}</code></pre>`;
    case 'script':
      const result = executeScript(node.body);
      return `<div class="section-content">${escapeHtml(result)}</div>`;
    case 'literal':
      return `<div class="section-content">${escapeHtml(node.body)}</div>`;
  }
}


export function documentHasKatex(doc: DocumentNode): boolean {
  return doc.sections.some((s) => sectionHasKatex(s, KATEX_PATTERN));
}

function sectionHasKatex(section: SectionNode, pattern: RegExp): boolean {
  return (
    section.subsections.some((sub) =>
      sub.contents.some((node) => {
        if (node.kind !== 'text') return false;
        return node.lines.some((line) => pattern.test(line));
      }),
    ) || section.children.some((c) => sectionHasKatex(c, pattern))
  );
}
