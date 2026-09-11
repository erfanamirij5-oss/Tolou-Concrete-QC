import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createQcExceptionService} from '../src/application/qc-exceptions.js';
import {createQcExceptionSyncService} from '../src/application/qc-exception-sync.js';

function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`
INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه یک','مشتری'),('p2','c2','پروژه دو','مشتری');
INSERT INTO pours VALUES('pour1','c1','p1','2026-09-01T08:00:00.000Z'),('pour2','c2','p2','2026-09-01T08:00:00.000Z');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-09-01T08:00:00.000Z','الف','ب'),('s2','c2','customer','p2','pour2','2026-09-01T08:00:00.000Z','الف','ب');
INSERT INTO samples VALUES('sample1','s1',7,'2099-09-08T08:00:00.000Z'),('sample2','s2',7,'2099-09-08T08:00:00.000Z');
INSERT INTO project_strength_requirements(project_id,company_id,characteristic_strength_mpa,created_at,created_by,updated_at,updated_by) VALUES('p1','c1',30,'2026-09-01T08:00:00.000Z','u','2026-09-01T08:00:00.000Z','u');
INSERT INTO result_revisions VALUES('sample1',1,15,'approved','2026-09-08T08:00:00.000Z','lab','u','2026-09-08T09:00:00.000Z','approver',NULL);
`);return db;}

test('live sync opens operational exception and auto-resolves after corrected result',t=>{const db=fixture(t);const sync=createQcExceptionSyncService(db,{companyId:'c1',actor:'tester'});let result=sync.sync();assert.equal(result.open,1);assert.equal(result.items[0].category,'operational_reference');assert.equal(result.items[0].sampleId,'sample1');db.prepare('INSERT INTO result_revisions VALUES(?,?,?,?,?,?,?,?,?,?)').run('sample1',2,25,'approved','2026-09-08T10:00:00.000Z','lab','u','2026-09-08T10:05:00.000Z','approver','اصلاح نتیجه');result=sync.sync();assert.equal(result.open,0);assert.equal(result.autoResolved,1);assert.equal(result.items.find(x=>x.exceptionKey==='auto:operational:sample1').status,'resolved');const history=createQcExceptionService(db,{companyId:'c1',actor:'tester'}).history('auto:operational:sample1');assert.equal(history.length,2);assert.equal(history[0].eventType,'opened');assert.equal(history[1].eventType,'resolved');assert.throws(()=>db.exec("UPDATE qc_exception_events SET title='x'"));});

test('exception ledger rejects cross-company sample references',t=>{const db=fixture(t);assert.throws(()=>db.prepare(`INSERT INTO qc_exception_events(id,company_id,exception_key,event_type,category,severity,sample_id,title,detail,source_type,observed_at,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('e1','c1','manual:x','opened','workflow','warning','sample2','عنوان','شرح','manual','2026-09-11T00:00:00.000Z','u','2026-09-11T00:00:00.000Z'),/company mismatch/);});
