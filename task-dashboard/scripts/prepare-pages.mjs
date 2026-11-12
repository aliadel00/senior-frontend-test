/**
 * GitHub Pages has no SPA fallback. After `ng build --configuration=pages`,
 * copy index.html to 404.html and to each client route folder so hard refresh
 * on /dashboard, /analytics, /users still loads the app.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'task-dashboard', 'browser');
const indexHtml = join(outDir, 'index.html');

if (!existsSync(indexHtml)) {
  console.error(`Missing build output: ${indexHtml}`);
  process.exit(1);
}

copyFileSync(indexHtml, join(outDir, '404.html'));

const routes = ['dashboard', 'analytics', 'users'];
for (const route of routes) {
  const dir = join(outDir, route);
  mkdirSync(dir, { recursive: true });
  copyFileSync(indexHtml, join(dir, 'index.html'));
}

console.log(`Prepared GitHub Pages SPA fallbacks: 404.html + ${routes.join(', ')}`);
