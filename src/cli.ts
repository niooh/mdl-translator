import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parse } from './parser/index.ts';
import { renderDocument, documentHasKatex } from './renderer.ts';
import { copyAssets } from './assets.ts';

function printUsage(): void {
  console.log(`Usage: node cli.js <input.md> [--out <dir>] [--serve]`);
}

function parseArgs(args: string[]): {
  input: string;
  outDir: string;
  serve: boolean;
} {
  let input: string | undefined;
  let outDir = os.tmpdir();
  let serve = false;
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
  return { input, outDir, serve };
}

async function main(): Promise<void> {
  const { input, outDir, serve } = parseArgs(process.argv.slice(2));
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
  console.error('✗', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
