import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createProjectService } from '../src/application/projects.js';

function fixture(){
  const db=new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE companies(id TEXT PRIMARY KEY);
    CREATE TABLE projects(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,name TEXT NOT NULL,customer_name TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE pours(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,project_id TEXT NOT NULL,occurred_at TEXT NOT NULL);
    CREATE TABLE customers(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE concrete_sources(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE pour_qc_contexts(pour_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,project_id TEXT NOT NULL,customer_id TEXT,concrete_source_id TEXT,created_at TEXT,created_by TEXT);
    CREATE TABLE sampling_series(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,kind TEXT NOT NULL,project_id TEXT,pour_id TEXT,title TEXT,sampled_at TEXT NOT NULL);
    CREATE TABLE samples(id TEXT PRIMARY KEY,series_id TEXT NOT NULL,age_days INTEGER,due_at TEXT);
    CREATE TABLE result_revisions(sample_id TEXT,revision INTEGER,state TEXT);
    CREATE VIEW current_results AS SELECT rr.sample_id,rr.revision,rr.state FROM result_revisions rr JOIN (SELECT sample_id,max(revision) revision FROM result_revisions GROUP BY sample_id) x ON x.sample_id=rr.sample_id AND x.revision=rr.revision;
    CREATE TABLE witness_schedule_revisions(sample_id TEXT,revision INTEGER,due_at TEXT);
    CREATE VIEW current_witness_schedules AS SELECT wr.sample_id,wr.revision,wr.due_at FROM witness_schedule_revisions wr JOIN (SELECT sample_id,max(revision) revision FROM witness_schedule_revisions GROUP BY sample_id) x ON x.sample_id=wr.sample_id AND x.revision=wr.revision;
  `);
  db.prepare('INSERT INTO companies(id) VALUES(?)').run('c1');
  db.prepare('INSERT INTO projects(id,company_id,name,customer_name,address) VALUES(?,?,?,?,?)').run('p1','c1','پروژه یک','مشتری','');
  return db;
}

test('dashboard classifies overdue, 48-hour warning, and scheduled samples',()=>{
  const db=fixture();
  db.prepare('INSERT INTO sampling_series(id,company_id,kind,project_id,title,sampled_at) VALUES(?,?,?,?,?,?)').run('s1','c1','customer','p1',null,'2026-09-01T00:00:00.000Z');
  const insert=db.prepare('INSERT INTO samples(id,series_id,age_days,due_at) VALUES(?,?,?,?)');
  insert.run('a','s1',7,'2026-09-10T10:00:00.000Z');
  insert.run('b','s1',7,'2026-09-12T00:00:00.000Z');
  insert.run('c','s1',28,'2026-09-15T00:00:00.000Z');
  const service=createProjectService(db,{companyId:'c1',actor:'tester',clock:()=> '2026-09-11T00:00:00.000Z'});
  const result=service.dashboard();
  assert.equal(result.overdueCount,1);
  assert.equal(result.dueSoonCount,1);
  assert.deepEqual(result.dueSchedule.map((x)=>x.status),['overdue','warning','scheduled']);
  assert.equal(result.dueSchedule[1].ageDays,7);
  db.close();
});
