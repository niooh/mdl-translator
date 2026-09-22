import katex from 'katex';

/**
 * 渲染行内/块级 KaTeX 公式。
 */
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

// 括号语法解析函数
function parseBracketSyntax(input: string) {
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
              output += parseBracketSyntax(content);          
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

  return output
    // 处理`- `
    .replace(/^(- )(.*?)(\n|$)/gm, '<ul><li>$2</li></ul>')
    // 处理`//`。正则匹配两类场景：1. 行首空/仅空格+//  2. 任意位置";+若干空格"+//    
    .replace(/(?<=^\s*|;\s*)(\/\/.*)$/gm, '<span style="color:#888;">$1</span>');
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
      let tagEnd = input.indexOf(']', pos + 1); // Find the first closing bracket

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
          contentEnd--; // Backtrack to the position of the closing '}'

          if (braceLevel === 0 && input[contentEnd] === '}') {
            const globalStyles = [];
            const selectorStyles = [];
            const styleRegex = /([a-zA-Z]+)(?:\(([^)]*)\))?/g; // Regex to parse 'style' or 'style(params)'
            let styleMatch;
            let parseOK = false; // Flag to track if at least one style was parsed successfully
            let tempPos = 0; // To potentially check if the whole stylesStr was consumed

            styleRegex.lastIndex = 0; // Reset regex state before loop
            while ((styleMatch = styleRegex.exec(stylesStr)) !== null) {
              const styleName = styleMatch[1];
              const wordsStr = styleMatch[2]; // Content within parentheses

              if (wordsStr !== undefined) { // Selector style like 'g(a b)'
                const trimmedWords = wordsStr.trim();
                if (trimmedWords) { // Ensure params are not just whitespace
                   // Sort words by length descending to replace longer matches first
                  const words = trimmedWords.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
                  if (words.length > 0) {
                    selectorStyles.push({ name: styleName, words });
                    parseOK = true; // Successfully parsed a selector
                  }
                }
              } else { // Global style like 'r'
                globalStyles.push(styleName);
                parseOK = true; // Successfully parsed a global style
              }
              tempPos = styleRegex.lastIndex; // Keep track of regex position
            }

            if (parseOK) {
              let processedContent = input.slice(contentStart, contentEnd); // Extract content
              for (const { name, words } of selectorStyles) {
                for (const word of words) {
                  // repTex protects already existing [tag]{...} inside content
                  processedContent = repTex(processedContent, word, `[${name}]{${word}}`);
                }
              }

              // Wrap the (potentially modified) content with global styles
              if (globalStyles.length > 0) {
                // Output in the simple format parseBracketSyntax understands
                output += `[${globalStyles.join(' ')}]{${processedContent}}`;
              } else {
                // If only selectors were present, output the modified content directly
                output += processedContent;
              }

              pos = contentEnd + 1; // Move position past the entire processed block
              continue; // Continue the main while loop
            } // End if (parseOK)
          } // End if (braceLevel === 0)
        } // End if (isComplexSelector)

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

