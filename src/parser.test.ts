import { describe, it, expect } from 'vitest'
import { parse, ParseError } from './parser.js'

describe('parser', () => {
  it('rejects empty document gracefully', () => {
    expect(parse('')).toEqual({ sections: [] })
  })

  it('rejects document not starting with #1', () => {
    expect(() => parse('#2 Wrong')).toThrow(ParseError)
  })

  it('parses a minimal #1 section with ##', () => {
    const src = '#1 Title\n## Sub\nhello'
    const doc = parse(src)
    expect(doc.sections).toHaveLength(1)
    const sec = doc.sections[0]!
    expect(sec.level).toBe(1)
    expect(sec.subsections).toHaveLength(1)
    expect(sec.subsections[0]!.title).toBe('Sub')
    expect(sec.subsections[0]!.contents[0]!.kind).toBe('text')
    expect((sec.subsections[0]!.contents[0] as any).lines).toEqual(['hello'])
  })

  it('parses multiple sibling #2 sections', () => {
    const src = '#1 Root\n## a\n#2 Child1\n## b\n#2 Child2\n## c'
    const doc = parse(src)
    expect(doc.sections).toHaveLength(1)
    const root = doc.sections[0]!
    expect(root.children).toHaveLength(2)
    expect(root.children[0]!.level).toBe(2)
    expect(root.children[1]!.level).toBe(2)
  })

  it('rejects section jump >1', () => {
    expect(() => parse('#1 A\n#3 C')).toThrow(ParseError)
  })

  it('rejects direct text without ##', () => {
    expect(() => parse('#1 A\ndirect text')).toThrow(ParseError)
  })

  it('parses code block and script block', () => {
    const src =
      '#1 Demo\n## sub\n```python\nprint(1)\n```\n```script\nexport default "hi"\n```'
    const doc = parse(src)
    const contents = doc.sections[0]!.subsections[0]!.contents
    expect(contents).toHaveLength(2)
    expect(contents[0]!.kind).toBe('code')
    expect(contents[1]!.kind).toBe('script')
  })

  it('handles Windows line endings', () => {
    const src = '#1 Test\r\n## sub\r\ntext'
    const doc = parse(src)
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0]!.subsections[0]!.contents[0]!.kind).toBe('text')
  })

  
  // 删除该测试，或改为验证文本正常
  it('handles content with a \\r at end', () => {
    const src = '#1 Test\n## sub\ntext with \r ending'
    const doc = parse(src)
    const lines = (doc.sections[0]!.subsections[0]!.contents[0] as any).lines
    // 预期：因为 \r 被视为换行，内容被分为 "text with " 和 " ending"
    expect(lines[0]).toBe('text with ')
    expect(lines[1]).toBe(' ending')
  })
})
