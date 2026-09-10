import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Driver-independent migration interface: db.exec(), db.prepare().get/all/run().
// Node's SQLite driver is used for verification; the desktop driver is not locked yet.
export function migrate(db) {
  const sql = readFileSync(new URL('./001-foundation.sql', import.meta.url), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) throw new Error('کنترل ارتباط داده‌ها فعال نشد');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL) STRICT');
    const versions = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
    if (versions.some(row => row.version !== 1)) throw new Error('نسخه پایگاه داده با برنامه سازگار نیست');
    if (versions.length) {
      if (versions[0].checksum !== checksum) throw new Error('تعریف نسخه پایگاه داده تغییر کرده است');
    } else {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(1,checksum);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
