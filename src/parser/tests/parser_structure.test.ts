import { describe, it, expect } from 'vitest';
import { parse, ParseError } from '../index.ts';

describe('parser structure', () => {
  it('returns empty sections for empty document', () => {
    expect(parse('')).toEqual({ sections: [] });
  });

  it('throws if document does not start with #1', () => {
    expect(() => parse('#2 Wrong')).toThrow(ParseError);
  });

  it('parses a minimal #1 section with ## and a text line', () => {
    const src = `#1 Title
## Sub
hello`;
    const doc = parse(src);
    expect(doc.sections).toHaveLength(1);
    const sec = doc.sections[0]!;
    expect(sec.level).toBe(1);
    expect(sec.subsections).toHaveLength(1);
    const sub = sec.subsections[0]!;
    expect(sub.title).toBe('Sub');
    expect(sub.contents).toHaveLength(1);
    expect(sub.contents[0]!.kind).toBe('text');
    expect((sub.contents[0] as any).lines).toEqual(['hello']);
  });

  it('supports multiple top-level #1 sections', () => {
    const src = `#1 A
## a
#1 B
## b`;
    const doc = parse(src);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0]!.level).toBe(1);
    expect(doc.sections[1]!.level).toBe(1);
  });

  it('allows level decrease from #3 back to #1', () => {
    const src = `#1 Top
#2 Mid
#3 Deep
## d
#1 Another`;
    const doc = parse(src);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0]!.children).toHaveLength(1);
    expect(doc.sections[0]!.children[0]!.children).toHaveLength(1);
    expect(doc.sections[0]!.children[0]!.children[0]!.level).toBe(3);
    expect(doc.sections[1]!.level).toBe(1);
  });

  it('ignores blank lines around and between sections', () => {
    const src = `

#1 A

## sub

#2 B
## sub2

`;
    const doc = parse(src);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]!.children).toHaveLength(1);
    expect(doc.sections[0]!.children[0]!.level).toBe(2);
  });

  it('handles sibling #2 sections', () => {
    const src = `#1 Root
## a
#2 Child1
## b
#2 Child2
## c`;
    const doc = parse(src);
    const root = doc.sections[0]!;
    expect(root.children).toHaveLength(2);
    expect(root.children[0]!.level).toBe(2);
    expect(root.children[1]!.level).toBe(2);
  });

  it('rejects jump from #1 to #3', () => {
    expect(() => parse('#1 A\n#3 C')).toThrow(ParseError);
  });

  it('rejects text directly under #1 without ##', () => {
    expect(() => parse('#1 A\ndirect text')).toThrow(ParseError);
  });

  it('allows subsection with no content', () => {
    const src = `#1 A
## empty
#2 B
## sub`;
    const doc = parse(src);
    expect(doc.sections[0]!.subsections[0]!.contents).toEqual([]);
  });

  it('supports multiple subsections in one section', () => {
    const src = `#1 A
## first
text1
## second
text2`;
    const doc = parse(src);
    const sec = doc.sections[0]!;
    expect(sec.subsections).toHaveLength(2);
    expect(sec.subsections[1]!.title).toBe('second');
  });

  it('preserves internal blank lines in text block', () => {
    const src = `#1 A
## sub
line1

line2`;
    const doc = parse(src);
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines;
    expect(lines).toEqual(['line1', '', 'line2']);
  });
});

describe('error line numbers', () => {
  it('reports line 1 for missing #1', () => {
    try {
      parse('#2 Bad');
    } catch (e) {
      expect((e as ParseError).line).toBe(1);
    }
  });

  it('reports correct line for jump error', () => {
    try {
      parse('#1 A\n#3 C');
    } catch (e) {
      expect((e as ParseError).line).toBe(2);
    }
  });

  it('reports correct line for text without ##', () => {
    try {
      parse('#1 A\ntext');
    } catch (e) {
      expect((e as ParseError).line).toBe(2);
    }
  });
});
