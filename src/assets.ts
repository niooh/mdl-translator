import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findAssetsRoot(): string {
  const distAssets = path.join(__dirname, 'assets');
  if (fs.existsSync(distAssets)) return distAssets;

  try {
    const require = createRequire(import.meta.url);
    const katexDist = path.dirname(require.resolve('katex/package.json'));
    return path.join(katexDist, 'dist');
  } catch {
    throw new Error('KaTeX not found. Please run `pnpm install`.');
  }
}

const ASSETS_ROOT = findAssetsRoot();

export function copyKatexFonts(fontsSrc: string, fontsDest: string): void {
  if (!fs.existsSync(fontsSrc)) return;
  fs.mkdirSync(fontsDest, { recursive: true });
  for (const file of fs.readdirSync(fontsSrc)) {
    if (file.endsWith('.woff2')) {
      fs.copyFileSync(path.join(fontsSrc, file), path.join(fontsDest, file));
    }
  }
}

/**
 * 复制 KaTeX 基础资源（CSS 和字体文件）。
 * 这些是渲染后公式正常显示所必需的，无法内嵌。
 */
export function copyKaTeXBaseAssets(outDir: string): void {
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const katexCssSrc = path.join(ASSETS_ROOT, 'katex.min.css');
  if (fs.existsSync(katexCssSrc)) {
    fs.copyFileSync(katexCssSrc, path.join(assetsDir, 'katex.min.css'));
  }

  const fontsSrc = path.join(ASSETS_ROOT, 'fonts');
  const fontsDest = path.join(assetsDir, 'fonts');
  copyKatexFonts(fontsSrc, fontsDest);
}
