import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 智能定位 KaTeX 资源根目录，兼容开发与打包后运行。
 * - 打包后：dist/assets/ 存在，直接使用。
 * - 开发时：dist 不存在，直接从 node_modules 读取。
 */
function findAssetsRoot(): string {
  // 打包后：cli.js 在 dist/，assets/ 在 dist/assets/
  const distAssets = path.join(__dirname, 'assets')
  if (fs.existsSync(distAssets)) {
    return distAssets
  }

  // 开发模式：从 node_modules/katex/dist 直接读取
  try {
    const require = createRequire(import.meta.url)
    const katexDist = path.dirname(require.resolve('katex/package.json'))
    return path.join(katexDist, 'dist')
  } catch {
    throw new Error(
      'KaTeX not found. Please run `pnpm install`.'
    )
  }
}

const ASSETS_ROOT = findAssetsRoot()

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
}`

/**
 * 将 KaTeX 资源与 style.css 复制到用户输出目录的 assets/ 子目录。
 */
export function copyAssets(outDir: string): void {
  const assetsDir = path.join(outDir, 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })

  // 核心文件（注意 auto-render.min.js 在开发时位于 contrib/ 下）
  const fileMap: Record<string, string> = {
    'katex.min.css': 'katex.min.css',
    'katex.min.js': 'katex.min.js',
    'auto-render.min.js': 'auto-render.min.js',
  }

  for (const [destName, srcName] of Object.entries(fileMap)) {
    const srcPath = path.join(ASSETS_ROOT, srcName)
    // 如果是开发环境且文件在 contrib/ 下，调整路径
    const finalSrc = fs.existsSync(srcPath)
      ? srcPath
      : path.join(ASSETS_ROOT, 'contrib', srcName) // 针对 auto-render.min.js
    if (fs.existsSync(finalSrc)) {
      fs.copyFileSync(finalSrc, path.join(assetsDir, destName))
    }
  }

  // 字体目录
  const fontsSrc = path.join(ASSETS_ROOT, 'fonts')
  const fontsDest = path.join(assetsDir, 'fonts')
  if (fs.existsSync(fontsSrc)) {
    fs.cpSync(fontsSrc, fontsDest, { recursive: true })
  }

  // 自定义样式
  fs.writeFileSync(path.join(assetsDir, 'style.css'), STYLE_CSS, 'utf-8')
}