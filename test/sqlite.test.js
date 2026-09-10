import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';

function fixture(t) {
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  migrate(db);
  db.exec(`INSERT INTO companies VALUES('c1','شرکت آزمایشی'),('c2','شرکت دوم');
    INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه آزمایشی','مشتری آزمایشی'),('p2','c1','پروژه دوم','مشتری دوم');
    INSERT INTO pours VALUES('pour1','c1','p1','2026-09-10T08:00:00Z');`);
  return db;
}
function addInternal(db) {
  db.exec(`INSERT INTO sampling_series(id,company_id,kind,title,purpose,sampled_at,sampler_name,entered_by)
    VALUES('s1','c1','internal','آزمایش','بررسی','2026-09-10T08:00:00Z','نمونه‌بردار','ثبت‌کننده');
    INSERT INTO samples VALUES('sample1','s1',7,'2026-09-17T08:00:00Z');`);
}
test('cross-company and cross-project relationships are rejected by SQLite',t=>{
  const db=fixture(t);
  assert.throws(()=>db.exec("INSERT INTO pours VALUES('bad','c2','p1','2026-09-10T08:00:00Z')"));
  const insert=db.prepare('INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES(?,?,?,?,?,?,?,?)');
  assert.throws(()=>insert.run('s1','c1','customer','p2','pour1','2026-09-10T08:00:00Z','الف','ب'));
  insert.run('s1','c1','customer','p1','pour1','2026-09-10T08:00:00Z','الف','ب');
});
test('internal records and reserve specimen persist without customer and date',t=>{
  const db=fixture(t);addInternal(db);
  db.exec("INSERT INTO samples VALUES('reserve','s1',NULL,NULL)");
  assert.equal(db.prepare("SELECT due_at FROM samples WHERE id='reserve'").get().due_at,null);
  assert.throws(()=>db.exec("INSERT INTO samples VALUES('bad','s1',NULL,'2026-09-10')"));
});
test('approved result corrections preserve old values and require reasons and sequential revisions',t=>{
  const db=fixture(t);addInternal(db);
  const insert=db.prepare('INSERT INTO result_revisions VALUES(?,?,?,?,?,?,?,?,?,?)');
  insert.run('sample1',1,18,'approved','2026-09-17T08:00:00Z','الف','ب','2026-09-17T09:00:00Z','ج',null);
  assert.throws(()=>insert.run('sample1',2,19,'approved','2026-09-17T08:00:00Z','الف','ب','2026-09-17T10:00:00Z','ج',null));
  assert.throws(()=>insert.run('sample1',3,19,'approved','2026-09-17T08:00:00Z','الف','ب','2026-09-17T10:00:00Z','ج','اصلاح'));
  insert.run('sample1',2,19,'approved','2026-09-17T08:00:00Z','الف','ب','2026-09-17T10:00:00Z','ج','اصلاح ورود');
  assert.equal(db.prepare('SELECT strength_mpa FROM current_results').get().strength_mpa,19);
  assert.equal(db.prepare('SELECT strength_mpa FROM result_revisions WHERE revision=1').get().strength_mpa,18);
  assert.throws(()=>db.exec('UPDATE result_revisions SET strength_mpa=20'));
  assert.throws(()=>db.exec('DELETE FROM result_revisions'));
});
test('reopening a real database retains records and repeated migration is harmless',()=>{
  const dir=mkdtempSync(join(tmpdir(),'tolou-sqlite-'));let db;
  try {
    const file=join(dir,'test.db');db=new DatabaseSync(file);migrate(db);
    db.prepare('INSERT INTO companies VALUES(?,?)').run('c1','شرکت آزمایشی');db.close();db=null;
    db=new DatabaseSync(file);migrate(db);migrate(db);
    assert.equal(db.prepare('SELECT name FROM companies').get().name,'شرکت آزمایشی');
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n,1);
  } finally {db?.close();rmSync(dir,{recursive:true,force:true});}
});
test('failed migration rolls back tables and migration registration',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec('CREATE TABLE projects(id TEXT)');
  assert.throws(()=>migrate(db));
  assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name IN ('companies','schema_migrations')").get().n,0);
});
test('database newer than application is refused without mutation',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  migrate(db);
  db.prepare('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)').run(2,'future');
  assert.throws(()=>migrate(db),/جدیدتر/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n,2);
});
test('migration checksum tampering is detected',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  migrate(db);
  db.prepare('UPDATE schema_migrations SET checksum=? WHERE version=1').run('tampered');
  assert.throws(()=>migrate(db),/تعریف نسخه/);
});
test('gapped migration history is rejected',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL) STRICT');
  db.prepare('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)').run(2,'future');
  assert.throws(()=>migrate(db));
});
