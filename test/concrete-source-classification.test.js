import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createQcPartiesService} from '../src/application/qc-parties.js';

test('manual concrete sources can remain explicitly unspecified',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
 db.exec("INSERT INTO companies VALUES('c1','شرکت یک')");
 const service=createQcPartiesService(db,{companyId:'c1',actor:'کاربر'});
 service.createConcreteSource({id:'src-manual',code:'AUTO-SRC-1',name:'منبع ثبت دستی',sourceType:'unspecified'});
 const source=service.listConcreteSources()[0];
 assert.equal(source.source_type,'unspecified');
 assert.throws(()=>service.createConcreteSource({id:'src-bad',code:'BAD',name:'نامعتبر',sourceType:'unknown'}),/نوع منشأ بتن معتبر نیست/);
});

test('source classification capability keeps QC context integrity and immutability',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
 db.exec(`INSERT INTO companies VALUES('c1','شرکت یک');
 INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه','مشتری');
 INSERT INTO pours VALUES('pour1','c1','p1','2026-09-11T08:00:00Z');
 INSERT INTO concrete_sources(id,company_id,code,name,source_type) VALUES('src1','c1','S-1','منبع دستی','unspecified');
 INSERT INTO pour_qc_contexts(pour_id,company_id,project_id,concrete_source_id,created_at,created_by) VALUES('pour1','c1','p1','src1','2026-09-11T08:01:00.000Z','کاربر');`);
 assert.equal(db.prepare("SELECT source_type FROM concrete_sources WHERE id='src1'").get().source_type,'unspecified');
 assert.equal(db.prepare("SELECT concrete_source_id FROM pour_qc_contexts WHERE pour_id='pour1'").get().concrete_source_id,'src1');
 assert.throws(()=>db.exec("UPDATE pour_qc_contexts SET concrete_source_id=NULL WHERE pour_id='pour1'"));
 assert.equal(db.prepare('SELECT count(*) AS n FROM schema_capabilities').get().n,1);
 migrate(db);
 assert.equal(db.prepare('SELECT count(*) AS n FROM schema_capabilities').get().n,1);
});
