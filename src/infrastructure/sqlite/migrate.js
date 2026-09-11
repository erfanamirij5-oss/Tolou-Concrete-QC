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
];

const capabilityFiles = [
  [1, './C001-concrete-source-unspecified.sql'],
];

function loadDefinitions(files) {
  return files.map(([version, file]) => {
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

function validateApplied(applied,definitions,{newerMessage}) {
  const latestKnown = definitions.at(-1)?.version ?? 0;
  if (applied.some((row) => row.version > latestKnown)) throw new Error(newerMessage);
  for (let index = 0; index < applied.length; index += 1) {
    const expectedVersion = index + 1;
    const row = applied[index];
    if (row.version !== expectedVersion) throw new Error('تاریخچه نسخه‌های پایگاه داده ناقص است');
    const definition = definitions[index];
    if (!definition || row.checksum !== definition.checksum) throw new Error('تعریف نسخه پایگاه داده تغییر کرده است');
  }
}

function applyDefinitions(db,{table,definitions,applied}) {
  const insert = db.prepare(`INSERT INTO ${table}(version,checksum) VALUES(?,?)`);
  for (const migration of definitions.slice(applied.length)) {
    db.exec(migration.sql);
    insert.run(migration.version,migration.checksum);
  }
}

// Driver-independent migration interface: db.exec(), db.prepare().get/all/run().
export function migrate(db) {
  const migrations = loadDefinitions(migrationFiles);
  const capabilities = loadDefinitions(capabilityFiles);
  assertMigrationPlan(migrations);
  assertMigrationPlan(capabilities);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) throw new Error('کنترل ارتباط داده‌ها فعال نشد');

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL) STRICT');
    const appliedMigrations = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
    validateApplied(appliedMigrations,migrations,{newerMessage:'نسخه پایگاه داده از برنامه جدیدتر است'});
    applyDefinitions(db,{table:'schema_migrations',definitions:migrations,applied:appliedMigrations});

    db.exec('CREATE TABLE IF NOT EXISTS schema_capabilities(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL) STRICT');
    const appliedCapabilities = db.prepare('SELECT version,checksum FROM schema_capabilities ORDER BY version').all();
    validateApplied(appliedCapabilities,capabilities,{newerMessage:'نسخه قابلیت‌های پایگاه داده از برنامه جدیدتر است'});
    applyDefinitions(db,{table:'schema_capabilities',definitions:capabilities,applied:appliedCapabilities});

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
