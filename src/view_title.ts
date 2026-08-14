import type { DocumentNode, SectionNode } from './types.ts';

const colors = ['\x1b[33m', '\x1b[32m', '\x1b[34m'] as const;
const reset = '\x1b[0m';

export interface TitleViewOptions {
  viewTitle?: string;
  queryTitle?: string;
}

function colorForDepth(depth: number): string {
  return colors[depth % colors.length] ?? colors[0];
}

function printSectionTree(
  sections: SectionNode[],
  depth: number,
  levels?: ReadonlySet<number>,
): void {
  for (const section of sections) {
    if (!levels || levels.has(section.level)) {
      const indent = '  '.repeat(depth);
      const color = colorForDepth(depth);
      console.log(
        `${indent}${color}#${section.level} ${section.title}${reset}  ${section.line}`,
      );
    }

    printSectionTree(section.children, depth + 1, levels);
  }
}

function printSubtree(section: SectionNode, depth: number): void {
  const indent = '  '.repeat(depth);
  const color = colorForDepth(depth);

  console.log(
    `${indent}${color}#${section.level} ${section.title}${reset}  ${section.line}`,
  );
  printSectionTree(section.children, depth + 1);
}

function findSectionByLevelAndTitle(
  sections: SectionNode[],
  level: number,
  title: string,
): SectionNode | null {
  for (const section of sections) {
    if (section.level === level && section.title === title) {
      return section;
    }

    const found = findSectionByLevelAndTitle(section.children, level, title);
    if (found) return found;
  }

  return null;
}

function queryTitles(doc: DocumentNode, query: string): void {
  let found = false;

  const walk = (sections: SectionNode[], depth: number): void => {
    for (const section of sections) {
      if (section.title.includes(query)) {
        const indent = '  '.repeat(depth);
        const color = colorForDepth(depth);
        console.log(
          `${indent}${color}#${section.level} ${section.title}${reset}  ${section.line}`,
        );
        found = true;
      }

      walk(section.children, depth + 1);
    }
  };

  walk(doc.sections, 0);

  if (!found) {
    console.log(`No headings matched "${query}".`);
  }
}

/**
 * Prints heading views for quick document navigation.
 *
 * @param doc - Parsed document tree.
 * @param options - View or query options.
 * @throws {Error} If both viewTitle and queryTitle are set, or the view value is invalid.
 */
export function printTitleView(
  doc: DocumentNode,
  options: TitleViewOptions,
): void {
  const { viewTitle, queryTitle } = options;

  if (viewTitle !== undefined && queryTitle !== undefined) {
    throw new Error('--view-title and --query-title cannot be used together');
  }

  if (queryTitle !== undefined) {
    queryTitles(doc, queryTitle);
    return;
  }

  const view = viewTitle ?? '';

  if (view === '') {
    printSectionTree(doc.sections, 0);
    return;
  }

  const levelsMatch = view.match(/^(\d+(?:\s*,\s*\d+)*)$/);
  if (levelsMatch) {
    const levels = new Set(
      levelsMatch[1]!.split(',').map((value) => Number(value.trim())),
    );
    printSectionTree(doc.sections, 0, levels);
    return;
  }

  const exactMatch = view.match(/^#(\d+)\s+(.+)$/);
  if (exactMatch) {
    const level = Number(exactMatch[1]);
    const title = exactMatch[2]!.trim();
    const section = findSectionByLevelAndTitle(doc.sections, level, title);

    if (!section) {
      throw new Error(`Heading not found: ${view}`);
    }

    printSubtree(section, 0);
    return;
  }

  throw new Error(`Invalid --view-title value: ${view}`);
}
