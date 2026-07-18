import type { ContentNode, DocumentNode, SectionNode, SubsectionNode } from './types.js'
import { executeScript } from './executor.js'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, () => '&amp;')
    .replace(/</g, () => '&lt;')
    .replace(/>/g, () => '&gt;')
    .replace(/'/g, () => '&#39;')
}

export function renderDocument(doc: DocumentNode, hasKatex: boolean): string {
  const body = doc.sections.map(renderSection).join('\n')
  const katexLink = hasKatex ? `<link rel="stylesheet" href="assets/katex.min.css">` : ''
  const katexScript = hasKatex
    ? `<script defer src="assets/katex.min.js"></script>
<script defer src="assets/auto-render.min.js"
  onload="renderMathInElement(document.body, {
    delimiters: [
      { left: '$', right: '$', display: false },
      { left: '\\\\(', right: '\\\\)', display: false },
      { left: '\\\\[', right: '\\\\]', display: true }
    ]
  })"
></script>`
    : ''

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
${katexScript}
</body>
</html>`
}

function renderSection(section: SectionNode): string {
  const subs = section.subsections.map(renderSubsection).join('\n')
  const kids = section.children.map(renderSection).join('\n')
  return `<div class="section-container level-${section.level}">
<div class="section-title title-level-${section.level}">${escapeHtml(section.title)}</div>
${subs}
${kids}
</div>`
}

function renderSubsection(sub: SubsectionNode): string {
  const contents = sub.contents.map(renderContent).join('\n')
  return `<div class="subsection">
<div class="subsection-heading">${escapeHtml(sub.title)}</div>
<div class="subsection-body">
${contents}
</div>
</div>`
}

function renderContent(node: ContentNode): string {
  switch (node.kind) {
    case 'text':
      return renderTextLines(node.lines)
    case 'code':
      return `<pre><code class="language-${escapeHtml(node.lang)}">${escapeHtml(node.body)}</code></pre>`
    case 'script': {
      const result = executeScript(node.body)
      return `<div class="section-content script-output">${escapeHtml(result)}</div>`
    }
  }
}

function renderTextLines(lines: string[]): string {
  if (lines.length === 0) return ''
  const text = lines.join('\n')
  return `<div class="section-content">${escapeHtml(text.trimEnd())}</div>`
}

export function documentHasKatex(doc: DocumentNode): boolean {
  const katexPattern = /\$|\\\(|\\\[/
  return doc.sections.some((s) => sectionHasKatex(s, katexPattern))
}

function sectionHasKatex(section: SectionNode, pattern: RegExp): boolean {
  return (
    section.subsections.some((sub) =>
      sub.contents.some((node) => {
        if (node.kind !== 'text') return false
        return node.lines.some((line) => pattern.test(line))
      })
    ) || section.children.some((c) => sectionHasKatex(c, pattern))
  )
}
