import { defineConfig } from 'vite'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))

function copyKatexAssets() {
  let outDir: string

  return {
    name: 'copy-katex-assets',
    apply: 'build',                    // 仅构建时执行
    configResolved(config: any) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const require = createRequire(import.meta.url)
      const katexDist = resolve(
        dirname(require.resolve('katex/package.json')),
        'dist'
      )

      const destDir = resolve(outDir, 'assets')
      mkdirSync(destDir, { recursive: true })

      const files: [string, string][] = [
        ['katex.min.css', 'katex.min.css'],
        ['katex.min.js', 'katex.min.js'],
        ['auto-render.min.js', 'contrib/auto-render.min.js'],
      ]
      for (const [dest, src] of files) {
        const srcPath = resolve(katexDist, src)
        if (existsSync(srcPath)) {
          cpSync(srcPath, resolve(destDir, dest))
        }
      }

      const fontsSrc = resolve(katexDist, 'fonts')
      const fontsDest = resolve(destDir, 'fonts')
      if (existsSync(fontsSrc)) {
        cpSync(fontsSrc, fontsDest, { recursive: true })
      }

      console.log('✓ KaTeX assets copied to dist/assets')
    },
  }
}

export default defineConfig({
  root: 'src',
  // 将 Vite 缓存目录设在项目根，避免污染 src/
  cacheDir: '../.vite-cache',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    ssr: true,
    target: 'node20',
    minify: 'oxc',
    rollupOptions: {
      external: [],
    },
    lib: {
      entry: 'cli.ts',
      formats: ['es'],
      fileName: () => 'cli.js',
    },
  },
  plugins: [copyKatexAssets()],
})
