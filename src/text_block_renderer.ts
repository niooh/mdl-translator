import katex from 'katex';

export function renderInlineMath(text: string): string {
  const render = (formula: string, displayMode: boolean) =>
    katex.renderToString(formula, { displayMode, throwOnError: false });

  return text
    .replace(/\\\[([\s\S]*?)\\\][ \t]*\n?/g, (_, f) => render(f, true).trim())
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => render(f, false))
    .replace(/(?<!\$)\$(?!\$)([\s\S]*?)(?<!\$)\$(?!\$)/g, (_, f) =>
      render(f, false),
    );
}

/** 行内内容渲染（公式 + 括号语法），不含外层容器 */
export function renderInlineContent(text: string): string {
  return renderInlineMath(parseBracketSyntax(text));
}

export function renderTextLines(lines: string[]): string {
  if (lines.length === 0) return '';
  return `<div class="section-content">${renderInlineContent(lines.join('\n'))}</div>`;
}

export interface BracketSyntaxOptions {
  /** 是否把 `- ` 行转换为 `<ul><li>`（默认 true） */
  transformLists?: boolean;
  /** 是否把 `//` 注释包裹成灰色 span（默认 true） */
  transformComments?: boolean;
}

// 括号语法解析函数
export function parseBracketSyntax(
  input: string,
  options: BracketSyntaxOptions = {},
): string {
  const { transformLists = true, transformComments = true } = options;
  input = preprocess(input);
  let output = '';
  let pos = 0;
  const len = input.length;

  const styleMap: Record<string, string> = {
    'r': 'red-text', 'g': 'green-text', 'b': 'blue-text', 'k': 'black-text',
    'o': 'orange-text', 'B': 'bold-text', 'I': 'italic-text',
    'C': 'center-text', 'O': 'overline-text', 'U': 'underline-text',
    'gra': 'gray-text',
    's': 'subscript-text', 'S': 'superscript-text', 'n': 'nostyle-text',
  };

  const validTagStartRegex = /^[a-zA-Z]/;

  while (pos < len) {
    if (input[pos] === '[' && pos + 1 < len) {
      const nextChar = input[pos + 1]!;

      if (validTagStartRegex.test(nextChar)) {
        const potentialTagEnd = input.indexOf(']', pos + 1);

        if (potentialTagEnd !== -1 && potentialTagEnd + 1 < len && input[potentialTagEnd + 1] === '{') {
          const stylesStr = input.slice(pos + 1, potentialTagEnd);
          const styles = stylesStr.split(' ');
          const validStyles = styles.filter(s => styleMap[s] !== undefined);

          if (validStyles.length > 0) {
            let contentStart = potentialTagEnd + 2;
            let braceLevel = 1;
            let contentEnd = contentStart;
            while (contentEnd < len && braceLevel > 0) {
              if (input[contentEnd] === '{') braceLevel++;
              else if (input[contentEnd] === '}') braceLevel--;
              contentEnd++;
            }

            if (braceLevel === 0) {
              output += validStyles.map(s => `<span class="${styleMap[s]!}">`).join('');
              const content = input.slice(contentStart, contentEnd - 1);
              output += parseBracketSyntax(content, options);
              output += '</span>'.repeat(validStyles.length);
              pos = contentEnd;
              continue;
            }
          }
        }
      }
    }
    output += input[pos];
    pos++;
  }

  let result = output;
  if (transformLists) {
    result = result.replace(/^(- )(.*?)(\n|$)/gm, '<ul><li>$2</li></ul>');
  }
  if (transformComments) {
    result = result.replace(
      /(?<=^\s*|;\s*)(\/\/.*)$/gm,
      '<span style="color:#888;">$1</span>',
    );
  }
  return result;
}

// repTex函数，用于预处理过程的替换。保护[...]{里的内容不被替换
function repTex(str: string, find: string, replace: string) {
  const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedFind, 'g');
  const parts = str.split(/(\[[a-zA-Z][^\]]*\]{)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = (parts[i] as string).replace(regex, replace);
    }
  }
  return parts.join('');
};

function preprocess(input: string) {
  let output = '';
  let pos = 0;
  const len = input.length;

  while (pos < len) {
    const nextChar = input[pos + 1];
    if (input[pos] === '[' && pos + 1 < len && nextChar !== undefined && /^[a-zA-Z]/.test(nextChar)) {
      const tagStart = pos;
      let tagEnd = input.indexOf(']', pos + 1);

      if (tagEnd !== -1 && tagEnd + 1 < len && input[tagEnd + 1] === '{') {
        const stylesStr = input.slice(tagStart + 1, tagEnd);

        let isComplexSelector = stylesStr.includes('(');

        if (isComplexSelector) {
          let contentStart = tagEnd + 2;
          let braceLevel = 1;
          let contentEnd = contentStart;
          while (contentEnd < len && braceLevel > 0) {
            if (input[contentEnd] === '{') braceLevel++;
            else if (input[contentEnd] === '}') braceLevel--;
            contentEnd++;
          }
          contentEnd--;

          if (braceLevel === 0 && input[contentEnd] === '}') {
            const globalStyles = [];
            const selectorStyles = [];
            const styleRegex = /([a-zA-Z]+)(?:\(([^)]*)\))?/g;
            let styleMatch;
            let parseOK = false;
            let tempPos = 0;

            styleRegex.lastIndex = 0;
            while ((styleMatch = styleRegex.exec(stylesStr)) !== null) {
              const styleName = styleMatch[1];
              const wordsStr = styleMatch[2];

              if (wordsStr !== undefined) {
                const trimmedWords = wordsStr.trim();
                if (trimmedWords) {
                  const words = trimmedWords.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
                  if (words.length > 0) {
                    selectorStyles.push({ name: styleName, words });
                    parseOK = true;
                  }
                }
              } else {
                globalStyles.push(styleName);
                parseOK = true;
              }
              tempPos = styleRegex.lastIndex;
            }

            if (parseOK) {
              let processedContent = input.slice(contentStart, contentEnd);
              for (const { name, words } of selectorStyles) {
                for (const word of words) {
                  processedContent = repTex(processedContent, word, `[${name}]{${word}}`);
                }
              }

              if (globalStyles.length > 0) {
                output += `[${globalStyles.join(' ')}]{${processedContent}}`;
              } else {
                output += processedContent;
              }

              pos = contentEnd + 1;
              continue;
            }
          }
        }

        output += input[pos];
        pos++;
        continue;
      } else {
        output += input[pos];
        pos++;
        continue;
      }
    } else {
      output += input[pos++];
    }
  }
  return output;
}
