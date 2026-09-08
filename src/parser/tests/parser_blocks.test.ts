import { describe, it, expect } from 'vitest';
import { parse, ParseError } from '../index.ts';
import { renderTextLines } from '../../text_block_renderer.ts';

describe('code blocks', () => {
  it('parses a normal code block and a script block', () => {
    const src = `#1 Demo
## sub
\`\`\`python
print(1)
\`\`\`
\`\`\`script
export default "hi"
\`\`\``;
    const doc = parse(src);
    const contents = doc.sections[0]!.subsections[0]!.contents;
    expect(contents).toHaveLength(2);
    expect(contents[0]!.kind).toBe('code');
    expect(contents[1]!.kind).toBe('script');
  });

  it('parses a literal block', () => {
    const src = `#1 A
## sub
\`\`\`literal
raw \\[formula\\]
\`\`\``;
    const doc = parse(src);
    const node = doc.sections[0]!.subsections[0]!.contents[0]!;
    expect(node.kind).toBe('literal');
    if (node.kind === 'literal') {
      expect(node.body).toBe('raw \\[formula\\]');
    }
  });

  it('supports 4-backtick fences', () => {
    const src = `#1 A
## sub
\`\`\`\`py
code
\`\`\`\``;
    const doc = parse(src);
    const node = doc.sections[0]!.subsections[0]!.contents[0]!;
    expect(node.kind).toBe('code');
    if (node.kind === 'code') {
      expect(node.lang).toBe('py');
      expect(node.body).toBe('code');
    }
  });

  it('throws on unclosed code block', () => {
    const src = `#1 A
## sub
\`\`\`js
code`;
    expect(() => parse(src)).toThrow(ParseError);
    try {
      parse(src);
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).message).toContain('Unclosed code block');
    }
  });

  it('handles empty code block', () => {
    const src = `#1 A
## sub
\`\`\`
\`\`\``;
    const doc = parse(src);
    const node = doc.sections[0]!.subsections[0]!.contents[0]!;
    if (node.kind === 'code') {
      expect(node.body).toBe('');
    }
  });
});

describe('line continuations', () => {
  it('treats more backslashes as literal, no join', () => {
    const src = `#1 A
## sub
line1\\\\
line2`;
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines).toEqual(['line1\\\\', 'line2']);
  });

  it('chains multiple continuations', () => {
    const src = `#1 A
## sub
a\\
b\\
c`;
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines).toEqual(['abc']);
  });

  it('drops trailing continuation at end of file', () => {
    const src = `#1 A
## sub
last\\`;
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines).toEqual(['last']);
  });

  it('handles mixed pattern: three backslashes', () => {
    const src = `#1 A
## sub
x\\\\\\
y\
z`;
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines).toEqual(['x\\\\\\', 'yz']);
  });
});

describe('line endings', () => {
  it('handles Windows-style \\r\\n', () => {
    const src = '#1 Test\r\n## sub\r\ntext';
    const doc = parse(src);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]!.subsections[0]!.contents[0]!.kind).toBe('text');
  });

  it('treats lone \\r as line break', () => {
    const src = '#1 Test\n## sub\ntext with \r ending';
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines[0]).toBe('text with ');
    expect(lines[1]).toBe(' ending');
  });
 
it('does not insert blank lines between normal text lines', () => {
  const src = `#1 A
## sub
line1
line2
line3`;

  const doc = parse(src);

  const node = doc.sections[0]!.subsections[0]!.contents[0]!;

  expect(node.kind).toBe('text');

  if (node.kind === 'text') {
    expect(node.lines).toEqual([
      'line1',
      'line2',
      'line3',
    ]);
  }
});
it('renders normal lines without inserting blank lines', () => {
  const html = renderTextLines([
    'line1',
    'line2',
    'line3',
  ]);

  expect(html).toBe(
    '<div class="section-content">line1\nline2\nline3</div>',
  );
});
it('keeps plain multiline text unchanged', () => {
  const html = renderTextLines([
    'a',
    'b',
    'c',
  ]);

  expect(html).not.toContain('a\n\nb');
  expect(html).not.toContain('b\n\nc');
});
});
