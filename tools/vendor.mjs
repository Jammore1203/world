// Copies browser dependencies from node_modules into game/vendor so the game
// stays a plain static site (no bundler). Run after bumping a dependency.
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'game/vendor/three');
await mkdir(out, { recursive: true });
for (const f of ['build/three.module.js', 'build/three.core.js', 'LICENSE']) {
  await cp(join(root, 'node_modules/three', f), join(out, f.split('/').pop()));
}
console.log('vendored three.js ->', out);
