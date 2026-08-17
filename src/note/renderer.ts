import type {
  ContentNode,
  DocumentNode,
  SectionNode,
  SubsectionNode,
} from '../types.ts';
import { executeScript } from '../executor.ts';
import { renderTextLines } from '../text_block_renderer.ts';
import { escapeHtml } from '../html.ts';
import { CONTENT_STYLE_CSS } from '../content_styles.ts';

const NOTE_STYLE_CSS = `\
body {
  font-family: monospace, sans-serif;
  line-height: 1.6;
  margin: 0; padding: 0;
  background-color: #f4f4f9;
}

.document {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.section-container {
  padding: 0;
  margin: 0;
}

.level-1 {
  padding: 10px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.section-title {
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 10px;
}

.title-level-1 { color: #1561E5; font-size: 1.1em; padding-bottom: 8px; }
.title-level-2 { color: #059BE1; }
.title-level-3 { color: #18BBD8; }
.title-level-4 { color: #15AFA5; }
.title-level-5 { color: #15BD90; }
.title-level-6 { color: #15CA7B; }
.title-level-7 { color: #15D865; }
.title-level-8 { color: #15E550; }

.section-content {
  white-space: pre-wrap;
  word-break: break-all;
}

pre {
  background: #f0f2f5;
  padding: 1rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}
pre code {
  font-family: inherit;
  font-size: 0.9rem;
  color: #333;
}
img{ max-width:350px; }
${CONTENT_STYLE_CSS}`;

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
<style>
${NOTE_STYLE_CSS}
</style>
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
<br/></div></div>`;
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
