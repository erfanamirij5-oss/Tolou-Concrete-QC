import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { migrate } from '../infrastructure/sqlite/migrate.js';
import { createLaboratoryService } from '../application/laboratory.js';
import { createProjectService } from '../application/projects.js';
import { createEngineeringService } from '../application/engineering.js';
import { createQcPartiesService } from '../application/qc-parties.js';

const COMPANY_ID = 'tolou-local-company';
const DEFAULT_COMPANY_NAME = 'شرکت شما';
const LOCAL_ACTOR = 'کاربر محلی';

export type LaboratoryService = ReturnType<typeof createLaboratoryService>;
export type ProjectService = ReturnType<typeof createProjectService>;
export type EngineeringService = ReturnType<typeof createEngineeringService>;
export type QcPartiesService = ReturnType<typeof createQcPartiesService>;

export interface DatabaseRuntime {
  db: DatabaseSync;
  laboratory: LaboratoryService;
  projects: ProjectService;
  engineering: EngineeringService;
  qcParties: QcPartiesService;
}

export function createDatabaseRuntime(): DatabaseRuntime {
  const databasePath = join(app.getPath('userData'), 'tolou-qc.sqlite');
  const db = new DatabaseSync(databasePath);
  migrate(db);
  const company = db.prepare('SELECT id FROM companies WHERE id=?').get(COMPANY_ID);
  if (!company) db.prepare('INSERT INTO companies(id,name) VALUES(?,?)').run(COMPANY_ID, DEFAULT_COMPANY_NAME);
  return {
    db,
    laboratory: createLaboratoryService(db, {companyId: COMPANY_ID, actor: LOCAL_ACTOR}),
    projects: createProjectService(db, {companyId: COMPANY_ID}),
    engineering: createEngineeringService(db, {companyId: COMPANY_ID, actor: LOCAL_ACTOR}),
    qcParties: createQcPartiesService(db, {companyId: COMPANY_ID, actor: LOCAL_ACTOR}),
  };
}
