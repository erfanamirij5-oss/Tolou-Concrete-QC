import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const assets = [
  ['src/infrastructure/sqlite/001-foundation.sql', 'dist-electron/infrastructure/sqlite/001-foundation.sql'],
  ['src/infrastructure/sqlite/002-engineering-qc.sql', 'dist-electron/infrastructure/sqlite/002-engineering-qc.sql'],
  ['src/infrastructure/sqlite/003-witness-schedule-audit.sql', 'dist-electron/infrastructure/sqlite/003-witness-schedule-audit.sql'],
  ['src/infrastructure/sqlite/004-qc-parties-external-results.sql', 'dist-electron/infrastructure/sqlite/004-qc-parties-external-results.sql'],
  ['src/infrastructure/sqlite/005-specimen-physical-measurements.sql', 'dist-electron/infrastructure/sqlite/005-specimen-physical-measurements.sql'],
  ['src/infrastructure/sqlite/006-fresh-concrete-measurements.sql', 'dist-electron/infrastructure/sqlite/006-fresh-concrete-measurements.sql'],
  ['src/infrastructure/sqlite/007-pour-qc-context.sql', 'dist-electron/infrastructure/sqlite/007-pour-qc-context.sql'],
  ['src/infrastructure/sqlite/008-company-profile.sql', 'dist-electron/infrastructure/sqlite/008-company-profile.sql'],
  ['src/infrastructure/sqlite/009-sampling-comparison-parties.sql', 'dist-electron/infrastructure/sqlite/009-sampling-comparison-parties.sql'],
  ['src/infrastructure/sqlite/010-sampling-mix-snapshot.sql', 'dist-electron/infrastructure/sqlite/010-sampling-mix-snapshot.sql'],
  ['src/infrastructure/sqlite/011-comparison-result-revisions.sql', 'dist-electron/infrastructure/sqlite/011-comparison-result-revisions.sql'],
  ['src/infrastructure/sqlite/012-project-strength-requirements.sql', 'dist-electron/infrastructure/sqlite/012-project-strength-requirements.sql'],
  ['src/infrastructure/sqlite/013-company-profile-branding.sql', 'dist-electron/infrastructure/sqlite/013-company-profile-branding.sql'],
  ['src/infrastructure/sqlite/014-rule-profiles.sql', 'dist-electron/infrastructure/sqlite/014-rule-profiles.sql'],
  ['src/infrastructure/sqlite/015-project-rule-evaluation.sql', 'dist-electron/infrastructure/sqlite/015-project-rule-evaluation.sql'],
  ['src/infrastructure/sqlite/016-rule-profile-retirement.sql', 'dist-electron/infrastructure/sqlite/016-rule-profile-retirement.sql'],
  ['assets/icons/Tolou-Concrete-QC.ico', 'dist-electron/assets/icons/Tolou-Concrete-QC.ico'],
];

for (const [source, target] of assets) {
  const absoluteTarget = resolve(target);
  mkdirSync(dirname(absoluteTarget), { recursive: true });
  copyFileSync(resolve(source), absoluteTarget);
}
