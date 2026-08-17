import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parse, ParseError } from './parser/index.ts';
import { renderDocument, documentHasKatex } from './note/renderer.ts';
import { renderQuizDocument } from './quiz/renderer.ts';
import { copyKaTeXBaseAssets } from './assets.ts';
import { printTitleView, type TitleViewOptions } from './view/view_title.ts';

interface CliArgs {
  input: string;
  noteOutDir?: string;
  quizOutDir?: string;
  serve: boolean;
  viewTitle?: string;
  queryTitle?: string;
}

function printUsage(): void {
  console.log('Usage: mdl2html <input.mdl> [--out-note <dir>] [--out-quiz <dir>] [--serve]');
  console.log('       mdl2html <input.mdl> --view-title');
  console.log('       mdl2html <input.mdl> --query-title <text>');
}

function parseArgs(args: string[]): CliArgs {
  let input: string | undefined;
  let noteOutDir: string | undefined;
  let quizOutDir: string | undefined;
  let serve = false;
  let viewTitle: string | undefined;
  let queryTitle: string | undefined;
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;
    if (arg === '--out-note' || arg === '--out') {
      i++;
      if (i >= args.length) {
        console.error(`✗ ${arg} requires a directory argument`);
        process.exit(1);
      }
      noteOutDir = args[i]!;
    } else if (arg === '--out-quiz') {
      i++;
      if (i >= args.length) {
        console.error('✗ --out-quiz requires a directory argument');
        process.exit(1);
      }
      quizOutDir = args[i]!;
    } else if (arg === '--serve') {
      serve = true;
    } else if (arg === '--view-title') {
      if (i + 1 < args.length && !args[i + 1]!.startsWith('--')) {
        i++;
        viewTitle = args[i]!;
      } else {
        viewTitle = '';
      }
    } else if (arg === '--query-title') {
      if (i + 1 >= args.length) {
        console.error('✗ --query-title requires an argument');
        process.exit(1);
      }
      i++;
      queryTitle = args[i]!;
    } else if (!input && !arg.startsWith('--')) {
      input = arg;
    } else {
      console.error(`✗ Unknown argument: ${arg}`);
      process.exit(1);
    }
    i++;
  }

  if (!input) {
    console.error('✗ Input file required');
    printUsage();
    process.exit(1);
  }

  if (!noteOutDir && !quizOutDir) {
    noteOutDir = os.tmpdir();
  }

  const result: CliArgs = { input, serve };
  if (noteOutDir) result.noteOutDir = noteOutDir;
  if (quizOutDir) result.quizOutDir = quizOutDir;
  if (viewTitle !== undefined) result.viewTitle = viewTitle;
  if (queryTitle !== undefined) result.queryTitle = queryTitle;
  return result;
}

async function main(): Promise<void> {
  const { input, noteOutDir, quizOutDir, serve, viewTitle, queryTitle } = parseArgs(
    process.argv.slice(2),
  );

  if (viewTitle !== undefined || queryTitle !== undefined) {
    const source = fs.readFileSync(input, 'utf-8');
    const doc = parse(source);

    const options: TitleViewOptions = {};
    if (viewTitle !== undefined) options.viewTitle = viewTitle;
    if (queryTitle !== undefined) options.queryTitle = queryTitle;

    printTitleView(doc, options);
    return;
  }

  const source = fs.readFileSync(input, 'utf-8');
  const doc = parse(source);

  if (noteOutDir) {
    fs.mkdirSync(noteOutDir, { recursive: true });
    const hasKatex = documentHasKatex(doc);
    const noteHtml = renderDocument(doc, hasKatex);
    fs.writeFileSync(path.join(noteOutDir, 'index.html'), noteHtml, 'utf-8');
    copyKaTeXBaseAssets(noteOutDir);
    console.log(`✓ Note → ${path.join(noteOutDir, 'index.html')}`);
  }

  if (quizOutDir) {
    fs.mkdirSync(quizOutDir, { recursive: true });
    const quizHtml = renderQuizDocument(doc);
    fs.writeFileSync(path.join(quizOutDir, 'index.html'), quizHtml, 'utf-8');
    copyKaTeXBaseAssets(quizOutDir);
    console.log(`✓ Quiz → ${path.join(quizOutDir, 'index.html')}`);
  }

  if (serve) {
    const serveDir = noteOutDir ?? quizOutDir!;
    const port = 8000;
    console.log(`✓ Serving on http://localhost:${port}`);
    spawn('python3', ['-m', 'http.server', String(port)], {
      cwd: serveDir,
      stdio: 'inherit',
    });

    const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(openCmd, [`http://localhost:${port}`], {
      stdio: 'ignore',
      detached: true,
    }).unref();

    await new Promise(() => {});
  }
}

main().catch((err) => {
  if (err instanceof ParseError) {
    const rawMsg = err.message.replace(/^Line \d+: /, '');
    const header = `\x1b[31m✖ Parse error in ${process.argv[2]}:${err.line}\x1b[0m`;
    const msg = `\x1b[31m  ${rawMsg}\x1b[0m`;
    console.error(`${header}\n${msg}`);
    if (err.context) {
      console.error(`\n\x1b[90m${err.context}\x1b[0m\n`);
    }
  } else {
    console.error('✗', err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
});
