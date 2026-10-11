import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.angular/tests/', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['tests/performance.test.ts', 'tests/seo.test.ts', 'tests/bootstrap.test.ts'],
  outdir: output,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  alias: { src: './src' },
  tsconfig: 'tsconfig.json'
});
const result = spawnSync(process.execPath, ['--test', output + 'performance.test.mjs', output + 'seo.test.mjs', output + 'bootstrap.test.mjs'], { stdio: 'inherit', cwd: root });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
