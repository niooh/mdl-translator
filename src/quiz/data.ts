import type { DocumentNode, SectionNode, ContentNode } from '../types.ts';
import { executeScript } from '../executor.ts';
import { renderInlineContent, renderTextLines } from '../text_block_renderer.ts';
import { escapeHtml } from '../html.ts';


export interface QuizCard {
  q: string;
  a: string;
  hierarchy: { level: number; title: string }[];
}

function renderContentToHtml(contents: ContentNode[]): string {
  return contents.map(node => {
    switch (node.kind) {
      case 'text':
        return renderTextLines(node.lines);
      case 'code':
        return `<pre><code>${escapeHtml(node.body)}</code></pre>`;
      case 'script': {
        const result = executeScript(node.body);
        return `<div class="section-content">${escapeHtml(result)}</div>`;
      }
      case 'literal':
        return `<div class="section-content">${escapeHtml(node.body)}</div>`;
      default:
        return '';
    }
  }).join('\n');
}

export function extractQuizCards(doc: DocumentNode): QuizCard[] {
  const cards: QuizCard[] = [];

  function walk(sections: SectionNode[], path: SectionNode[]): void {
    for (const section of sections) {
      const newPath = [...path, section];
      for (const sub of section.subsections) {
        if (!sub.title.trim()) continue;
        cards.push({
          q: renderInlineContent(sub.title),
          a: renderContentToHtml(sub.contents),
          hierarchy: newPath.map(sec => ({ level: sec.level, title: sec.title })),
        });
      }
      walk(section.children, newPath);
    }
  }

  walk(doc.sections, []);
  return cards;
}
