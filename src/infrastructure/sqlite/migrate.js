import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const migrationFiles = [
  [1, './001-foundation.sql'],
  [2, './002-engineering-qc.sql'],
  [3, './003-witness-schedule-audit.sql'],
  [4, './004-qc-parties-external-results.sql'],
  [5, './005-specimen-physical-measurements.sql'],
  [6, './006-fresh-concrete-measurements.sql'],
  [7, './007-pour-qc-context.sql'],
  [8, './008-company-profile.sql'],
  [9, './009-sampling-comparison-parties.sql'],
  [10, './010-sampling-mix-snapshot.sql'],
  [11, './011-comparison-result-revisions.sql'],
];

function loadMigrations() {
  return migrationFiles.map(([version, file]) => {
    const sql = readFileSync(new URL(file, import.meta.url), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    return { version, sql, checksum };
  });
}

function assertMigrationPlan(migrations) {
  for (let index = 0; index < migrations.length; index += 1) {
    const expected = index + 1;
    if (migrations[index].version !== expected) throw new Error('ترتیب نسخه‌های پایگاه داده معتبر نیست');
  }
}

// Driver-independent migration interface: db.exec(), db.prepare().get/all/run().
export function migrate(db) {
  const migrations = loadMigrations();
  assertMigrationPlan(migrations);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) throw new Error('کنترل ارتباط داده‌ها فعال نشد');

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL) STRICT');
    const applied = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
    const latestKnown = migrations.at(-1)?.version ?? 0;

    if (applied.some((row) => row.version > latestKnown)) throw new Error('نسخه پایگاه داده از برنامه جدیدتر است');

    for (let index = 0; index < applied.length; index += 1) {
      const expectedVersion = index + 1;
      const row = applied[index];
      if (row.version !== expectedVersion) throw new Error('تاریخچه نسخه‌های پایگاه داده ناقص است');
      const definition = migrations[index];
      if (!definition || row.checksum !== definition.checksum) throw new Error('تعریف نسخه پایگاه داده تغییر کرده است');
    }

    const insertMigration = db.prepare('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)');
    for (const migration of migrations.slice(applied.length)) {
      db.exec(migration.sql);
      insertMigration.run(migration.version, migration.checksum);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
