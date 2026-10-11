import { build } from 'esbuild';
import { mkdir, readFile, writeFile, cp, readdir, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, process.argv.includes('--root-output') ? '../../.vercel/output' : '.vercel/output');
const allowedOutputs = [resolve(root, '.vercel/output'), resolve(root, '../../.vercel/output')];
if (!allowedOutputs.includes(output)) throw Error('Unexpected build output path');
// This exact generated directory is the only deletion target; never touch project credentials or source files.
await rm(output, { force: true, recursive: true });
const staticDir = join(output, 'static');
const functionDir = join(output, 'functions/storefront.func');
await mkdir(staticDir, { recursive: true });
await mkdir(functionDir, { recursive: true });
for (const file of await readdir(join(root, 'dist/premium-shop'))) {
  if (file === 'index.html') continue;
  await cp(join(root, 'dist/premium-shop', file), join(staticDir, file), { recursive: true });
}
await cp(join(root, 'dist/premium-shop/index.html'), join(functionDir, 'shell.html'));
const verification = process.env.GOOGLE_SITE_VERIFICATION || '';
const analyticsId = process.env.GA_MEASUREMENT_ID || '';
if (analyticsId && !/^G-[A-Z0-9]+$/.test(analyticsId)) throw Error('GA_MEASUREMENT_ID must be a GA4 G- identifier');
await writeFile(join(functionDir, 'public-config.json'), JSON.stringify({ verification, analyticsId }));
await build({ entryPoints: [join(root, 'server/handler.ts')], outfile: join(functionDir, 'bundle.cjs'), bundle: true, platform: 'node', target: 'node22', format: 'cjs' });
await writeFile(join(functionDir, 'index.js'), "module.exports = require('./bundle.cjs').handler;\n");
await writeFile(join(functionDir, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', maxDuration: 30, launcherType: 'Nodejs', shouldAddHelpers: true }));
await writeFile(join(output, 'config.json'), JSON.stringify({ version: 3, routes: [
  { src: '/(.+\\.[a-f0-9]{8,}\\.(?:js|css))', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { handle: 'filesystem' },
  { src: '/(.*)', dest: '/storefront?__path=$1' }
] }, null, 2));
console.log(`Vercel rendering output ready: ${output}`);
