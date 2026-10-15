import { execSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';

execSync('npx vite build', { stdio: 'inherit' });

// Copy the assets directory to dist/assets for runtime use.
const src = new URL('../assets', import.meta.url).pathname;
const dest = new URL('../dist/assets', import.meta.url).pathname;
if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
}

console.log('✓ Build complete');
