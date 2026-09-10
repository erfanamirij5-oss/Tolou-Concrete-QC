import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { migrate } from '../infrastructure/sqlite/migrate.js';
import { createLaboratoryService } from '../application/laboratory.js';

const COMPANY_ID = 'tolou-local-company';
const DEFAULT_COMPANY_NAME = 'شرکت شما';
const LOCAL_ACTOR = 'کاربر محلی';

export type LaboratoryService = ReturnType<typeof createLaboratoryService>;

export interface DatabaseRuntime {
  db: DatabaseSync;
  laboratory: LaboratoryService;
}

export function createDatabaseRuntime(): DatabaseRuntime {
  const databasePath = join(app.getPath('userData'), 'tolou-qc.sqlite');
  const db = new DatabaseSync(databasePath);
  migrate(db);

  const company = db.prepare('SELECT id FROM companies WHERE id=?').get(COMPANY_ID);
  if (!company) {
    db.prepare('INSERT INTO companies(id,name) VALUES(?,?)').run(COMPANY_ID, DEFAULT_COMPANY_NAME);
  }

  const laboratory = createLaboratoryService(db, {
    companyId: COMPANY_ID,
    actor: LOCAL_ACTOR,
  });

  return { db, laboratory };
}
