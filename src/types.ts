export type InlineContent = string
export type CodeBlockNode = { kind: 'code'; lang: string; body: string }
export type ScriptBlockNode = { kind: 'script'; body: string }
export type TextNode = { kind: 'text'; lines: string[] }
export type ContentNode = CodeBlockNode | ScriptBlockNode | TextNode
export type SubsectionNode = { title: string; contents: ContentNode[] }
export type SectionNode = {
  level: number
  title: string
  subsections: SubsectionNode[]
  children: SectionNode[]
}
export type DocumentNode = { sections: SectionNode[] }