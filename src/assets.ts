import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 智能定位 KaTeX 资源根目录，兼容开发与打包后运行。
 */
function findAssetsRoot(): string {
  const distAssets = path.join(__dirname, 'assets');
  if (fs.existsSync(distAssets)) {
    return distAssets;
  }

  try {
    const require = createRequire(import.meta.url);
    const katexDist = path.dirname(require.resolve('katex/package.json'));
    return path.join(katexDist, 'dist');
  } catch {
    throw new Error('KaTeX not found. Please run `pnpm install`.');
  }
}

const ASSETS_ROOT = findAssetsRoot();

export const STYLE_CSS = `
body {
  font-family: monospace, sans-serif;
  line-height: 1.6;
  margin: 0; padding: 0;
  background-color: #f4f4f9;
}

.document {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.section-container {
  padding: 0;
  margin: 0;
}

.level-1 {
  padding: 10px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.section-title {
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 10px;
}

.title-level-1 { color: #1561E5; font-size: 1.1em; padding-bottom: 8px; }
.title-level-2 { color: #059BE1; }
.title-level-3 { color: #18BBD8; }
.title-level-4 { color: #15AFA5; }
.title-level-5 { color: #15BD90; }
.title-level-6 { color: #15CA7B; }
.title-level-7 { color: #15D865; }
.title-level-8 { color: #15E550; }

.section-content {
  white-space: pre-wrap;
  word-break: break-all;
}

pre {
  background: #f0f2f5;
  padding: 1rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}
pre code {
  font-family: inherit;
  font-size: 0.9rem;
  color: #333;
}
img{ max-width:350px; }

/* 与style标签对应的样式 */
.section-content .red-text {color: red;}
.section-content .green-text {color: green;}
.section-content .blue-text {color: blue;}
.section-content .orange-text{color: orange;}
.section-content .black-text{color: black;}
.section-content .gray-text{color: gray;}
.section-content .bold-text {font-weight: bold;}
.section-content .italic-text {font-style: italic;}
.section-content .subscript-text {vertical-align: sub; font-size: smaller;}
.section-content .superscript-text {vertical-align: super; font-size: smaller;}
.section-content .overline-text {text-decoration: overline;}
.section-content .underline-text {text-decoration: underline;}
.section-content .center-text {display: block; text-align: center;}
.section-content .nostyle-text {
  font: initial; /* 字体族/大小/粗细/行高 */
  text-decoration: initial;
  color: initial; /* 恢复为继承颜色 */
  text-align: initial;
  text-shadow: initial;
}
.section-content ul { margin:0 0 0 1rem; padding:0 }
`;

/**
 * 只复制 .woff2 字体文件到目标目录。
 */
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
 * 将 KaTeX 资源与自定义样式复制到用户输出目录的 assets/ 子目录。
 */
export function copyAssets(outDir: string): void {
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // 资源文件，注意 auto-render.min.js 在开发时位于 contrib/ 下
  const fileMap: Record<string, string> = {
    'katex.min.css': 'katex.min.css',
    'katex.min.js': 'katex.min.js',
    'auto-render.min.js': 'auto-render.min.js',
  };

  for (const [destName, srcName] of Object.entries(fileMap)) {
    const srcPath = path.join(ASSETS_ROOT, srcName);
    const finalSrc = fs.existsSync(srcPath)
      ? srcPath
      : path.join(ASSETS_ROOT, 'contrib', srcName);
    if (fs.existsSync(finalSrc)) {
      fs.copyFileSync(finalSrc, path.join(assetsDir, destName));
    }
  }

  // 字体文件，仅复制 .woff2
  const fontsSrc = path.join(ASSETS_ROOT, 'fonts');
  const fontsDest = path.join(assetsDir, 'fonts');
  copyKatexFonts(fontsSrc, fontsDest);

  // 自定义样式
  fs.writeFileSync(path.join(assetsDir, 'style.css'), STYLE_CSS, 'utf-8');
}
