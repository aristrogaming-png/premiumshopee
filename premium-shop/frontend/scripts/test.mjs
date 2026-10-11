import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.angular/tests/', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['tests/performance.test.ts', 'tests/seo.test.ts', 'tests/bootstrap.test.ts', 'tests/handler.test.ts'],
  outdir: output,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  alias: { src: './src' },
  tsconfig: 'tsconfig.json'
});
await build({ absWorkingDir: root, entryPoints: ['server/handler.ts'], outfile: output + 'server-handler.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node22' });
await writeFile(output + 'shell.html', '<html><head><title>Store</title></head><body><app-root></app-root></body></html>');
await writeFile(output + 'public-config.json', '{}');
const result = spawnSync(process.execPath, ['--test', output + 'performance.test.mjs', output + 'seo.test.mjs', output + 'bootstrap.test.mjs', output + 'handler.test.mjs'], { stdio: 'inherit', cwd: root });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
