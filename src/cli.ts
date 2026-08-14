import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parse, ParseError } from './parser/index.ts';
import { renderDocument, documentHasKatex } from './renderer.ts';
import { copyAssets } from './assets.ts';
import { printTitleView, type TitleViewOptions } from './view_title.ts';

interface CliArgs {
  input: string;
  outDir: string;
  serve: boolean;
  viewTitle?: string;
  queryTitle?: string;
}

function printUsage(): void {
  console.log('Usage: mdl2html <input.mdl> [--out <dir>] [--serve]');
  console.log('       mdl2html <input.mdl> --view-title');
  console.log('       mdl2html <input.mdl> --view-title <levels>');
  console.log('       mdl2html <input.mdl> --view-title \'#1 title name\'');
  console.log('       mdl2html <input.mdl> --query-title <text>');
}

function parseArgs(args: string[]): CliArgs {
  let input: string | undefined;
  let outDir = os.tmpdir();
  let serve = false;
  let viewTitle: string | undefined;
  let queryTitle: string | undefined;
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === '--out') {
      i++;
      if (i >= args.length) {
        console.error('✗ --out requires a directory argument');
        process.exit(1);
      }
      outDir = args[i]!;
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

  const result: CliArgs = { input, outDir, serve };
  if (viewTitle !== undefined) result.viewTitle = viewTitle;
  if (queryTitle !== undefined) result.queryTitle = queryTitle;

  return result;
}

async function main(): Promise<void> {
  const { input, outDir, serve, viewTitle, queryTitle } = parseArgs(
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

  fs.mkdirSync(outDir, { recursive: true });

  const source = fs.readFileSync(input, 'utf-8');
  const doc = parse(source);
  const hasKatex = documentHasKatex(doc);
  const html = renderDocument(doc, hasKatex);

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  copyAssets(outDir);

  console.log(`✓ Converted ${input} → ${path.join(outDir, 'index.html')}`);

  if (serve) {
    const port = 8000;
    console.log(`✓ Serving on http://localhost:${port}`);
    spawn('python3', ['-m', 'http.server', String(port)], {
      cwd: outDir,
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
