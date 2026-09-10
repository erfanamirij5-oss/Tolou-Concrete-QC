import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const assets = [
  ['src/infrastructure/sqlite/001-foundation.sql', 'dist-electron/infrastructure/sqlite/001-foundation.sql'],
  ['src/infrastructure/sqlite/002-engineering-qc.sql', 'dist-electron/infrastructure/sqlite/002-engineering-qc.sql'],
  ['src/infrastructure/sqlite/003-witness-schedule-audit.sql', 'dist-electron/infrastructure/sqlite/003-witness-schedule-audit.sql'],
  ['src/infrastructure/sqlite/004-qc-parties-external-results.sql', 'dist-electron/infrastructure/sqlite/004-qc-parties-external-results.sql'],
];

for (const [source, target] of assets) {
  const absoluteTarget = resolve(target);
  mkdirSync(dirname(absoluteTarget), { recursive: true });
  copyFileSync(resolve(source), absoluteTarget);
}
