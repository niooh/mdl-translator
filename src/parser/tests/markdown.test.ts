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

  it('does not double-escape HTML entities like &#92;', () => {
    const doc = parse('#1 T\n## S\n// tips: use &#92;( ... &#92;)');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('&#92;');
    expect(md).not.toContain('&amp;#92;');
    expect(md).toContain('<span style="color:#888;">');
  });

  it('keeps inline katex formulas verbatim, including < and &', () => {
    const doc = parse(
      '#1 T\n## S\nformula \\(a<b\\) and $c<d$ and \\(x \\& y\\)',
    );
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('\\(a<b\\)');
    expect(md).toContain('$c<d$');
    expect(md).toContain('\\(x \\& y\\)');
    expect(md).not.toContain('&lt;');
    expect(md).not.toContain('&amp;');
  });

  it('keeps multiline \\[...\\] block verbatim, including &', () => {
    const src = `#1 T
## S
\\[
\\begin{array}{ccc}
A & B & C \\\\
1 & 2 & 3
\\end{array}
\\]`;
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('A & B & C');
    expect(md).toContain('1 & 2 & 3');
    expect(md).not.toContain('&amp;');
  });

  it('keeps title containing \\(...\\) intact', () => {
    const doc = parse('#1 Top\n#2 Formula \\(test\\)\n## S\nx');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('## Formula \\(test\\)');
  });

  it('does not expand list markers, markdown handles them natively', () => {
    const doc = parse('#1 T\n## S\n- one\n- two');
    const md = renderDocumentToMarkdown(doc);
    expect(md).toContain('- one\n- two');
    expect(md).not.toContain('<ul><li>');
  });

  it('emits code/script/literal as fenced blocks, growing fences as needed', () => {
    const src =
      '#1 T\n## S\n```python\nprint(1)\n```\n```script\nexport default "hi"\n```\n```literal\nraw \\\\[x\\\\]\n```';
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

  it('does not emit extra blank lines caused by empty text blocks', () => {
    const src = '#1 T\n## S\n\n```js\nx\n```';
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);
    expect(md).not.toMatch(/\n{4,}/);
    expect(md).toContain('## S\n\n```js');
  });

  it('renders code_blocks.mdl example end-to-end without over-escaping', () => {
    const src = `#1 Formula Test

## Script Output

\`\`\`script
export default \`Calculate 1+1 = \${1+1}\`
\`\`\`

#2 Formula \\(test\\)

## Inline Formula
Mass-energy equation \\(E=mc^2\\) and Pythagorean theorem \\(a^2 + b^2 = c^2\\).
// tips: use &#92;( … &#92;)

## Block Formula
\\[
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\\]
`;
    const doc = parse(src);
    const md = renderDocumentToMarkdown(doc);

    expect(md).toContain('# Formula Test');
    expect(md).toContain('## Script Output');
    expect(md).toContain('```script\nexport default `Calculate 1+1 = ${1+1}`\n```');
    expect(md).toContain('## Formula \\(test\\)');
    expect(md).toContain('### Inline Formula');
    expect(md).toContain('\\(E=mc^2\\)');
    expect(md).toContain('&#92;');
    expect(md).not.toContain('&amp;#92;');
    expect(md).toContain('### Block Formula');
    expect(md).toContain('\\int_0^\\infty');
    expect(md).toContain('\\frac{\\sqrt{\\pi}}{2}');
    // 空 text node 被过滤，不留多余空行
    expect(md).not.toMatch(/\n{4,}/);
  });
});
