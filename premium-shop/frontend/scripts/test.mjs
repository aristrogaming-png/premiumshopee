import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.angular/tests/performance.test.mjs', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['tests/performance.test.ts'],
  outfile: output,
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  alias: { src: './src' },
  tsconfig: 'tsconfig.json'
});
const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
