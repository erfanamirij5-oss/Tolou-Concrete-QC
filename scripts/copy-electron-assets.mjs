import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const assets = [
  ['src/infrastructure/sqlite/001-foundation.sql', 'dist-electron/infrastructure/sqlite/001-foundation.sql'],
];

for (const [source, target] of assets) {
  const absoluteTarget = resolve(target);
  mkdirSync(dirname(absoluteTarget), { recursive: true });
  copyFileSync(resolve(source), absoluteTarget);
}
