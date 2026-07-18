import { execSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';

// Vite 构建 CLI
execSync('npx vite build', { stdio: 'inherit' });

// 将 assets 目录复制到 dist/assets，供运行时使用
const src = new URL('../assets', import.meta.url).pathname;
const dest = new URL('../dist/assets', import.meta.url).pathname;
if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
}

console.log('✓ Build complete');
