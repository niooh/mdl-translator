import { describe, it, expect } from 'vitest';
import { parse } from '../index.ts';
import { renderDocumentToMarkdown } from '../../note/markdown_renderer.ts';

describe('markdown renderer', () => {
  it('maps #N / ## to markdown headings', () => {
    const doc = parse('#1 Title\n## Sub\nhello\n#2 Next\n## Sub2\nworld');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('# Title');
    expect(md).toContain('## Sub');
    expect(md).toContain('## Next');
    expect(md).toContain('### Sub2');
  });

  it('caps heading depth at 6', () => {
    const src = '#1 A\n#2 B\n#3 C\n#4 D\n#5 E\n#6 F\n#7 G\n## sub';
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('###### G');
    expect(md).not.toContain('####### ');
  });

  it('expands bracket styles to inline HTML', () => {
    const doc = parse('#1 T\n## S\n[r]{red} and [b U]{blue underline}');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('<span class="red-text">red</span>');
    expect(md).toContain(
      '<span class="blue-text"><span class="underline-text">blue underline</span></span>',
    );
  });

  it('escapes HTML outside katex', () => {
    const doc = parse('#1 T\n## S\n<b>x</b> & y');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
  });

  it('keeps katex formulas verbatim including < >', () => {
    const doc = parse('#1 T\n## S\nformula \\(a<b\\) and $c<d$ and \\[e<f\\]');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('\\(a<b\\)');
    expect(md).toContain('$c<d$');
    expect(md).toContain('\\[e<f\\]');
    expect(md).not.toContain('&lt;');
  });

  it('does not expand list markers, markdown handles them natively', () => {
    const doc = parse('#1 T\n## S\n- one\n- two');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('- one\n- two');
    expect(md).not.toContain('<ul><li>');
  });

  it('turns // comments into gray HTML', () => {
    const doc = parse('#1 T\n## S\n// a note');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('<span style="color:#888;">// a note</span>');
  });

  it('emits code/script/literal as fenced blocks, growing fences as needed', () => {
    const src = '#1 T\n## S\n```python\nprint(1)\n```\n```script\nexport default "hi"\n```\n```literal\nraw \\\\[x\\\\]\n```';
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('```python\nprint(1)\n```');
    expect(md).toContain('```script\nexport default "hi"\n```');
    expect(md).toContain('```literal\nraw \\\\[x\\\\]\n```');
  });

  it('grows fence if body contains triple backticks', () => {
    const src = '#1 T\n## S\n````markdown\n```markdown\n```\n````';
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('````markdown\n```markdown\n```\n````');
  });
});
