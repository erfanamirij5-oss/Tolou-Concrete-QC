import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createAttachmentService} from '../src/application/attachments.js';

function fixture(t){const dir=mkdtempSync(join(tmpdir(),'tolou-attachments-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
 INSERT INTO sampling_series(id,company_id,kind,title,purpose,sampled_at,sampler_name,entered_by) VALUES('s1','c1','internal','آزمایش','کنترل','2026-09-10T08:00:00.000Z','الف','ب'),('s2','c2','internal','آزمایش','کنترل','2026-09-10T08:00:00.000Z','الف','ب');
 INSERT INTO samples VALUES('sample1','s1',7,'2026-09-17T08:00:00.000Z'),('sample2','s2',7,'2026-09-17T08:00:00.000Z');
 INSERT INTO testing_laboratories(id,company_id,code,name,lab_type) VALUES('lab1','c1','L1','آزمایشگاه یک','external'),('lab2','c2','L2','آزمایشگاه دو','external');
 INSERT INTO external_result_events(id,company_id,sample_id,testing_laboratory_id,external_event_id,received_at,received_by) VALUES('e1','c1','sample1','lab1','EXT-1','2026-09-10T09:00:00.000Z','الف'),('e2','c2','sample2','lab2','EXT-2','2026-09-10T09:00:00.000Z','ب');`);return{db,dir,service:createAttachmentService(db,{companyId:'c1',actor:'کاربر',storageRoot:dir,clock:()=> '2026-09-10T10:00:00.000Z'})};}

test('attachment is copied under managed storage and hashed before metadata registration',t=>{const{db,dir,service}=fixture(t);const source=join(dir,'report sample.pdf');const bytes=Buffer.from('tolou-qc-report');writeFileSync(source,bytes);const result=service.addFromPath('e1',source);assert.equal(result.fileName,'report_sample.pdf');assert.equal(result.sha256,createHash('sha256').update(bytes).digest('hex'));const row=db.prepare('SELECT relative_path,sha256,size_bytes,added_by FROM external_result_attachments WHERE id=?').get(result.id);assert.equal(row.sha256,result.sha256);assert.equal(row.size_bytes,bytes.length);assert.equal(row.added_by,'کاربر');assert.deepEqual(readFileSync(join(dir,row.relative_path)),bytes);assert.equal(service.list('e1').length,1);});

test('attachment ownership is company scoped and invalid files never create metadata',t=>{const{db,dir,service}=fixture(t);const source=join(dir,'x.txt');writeFileSync(source,'x');assert.throws(()=>service.addFromPath('e2',source),/متعلق به این شرکت/);assert.throws(()=>service.addFromPath('e1',join(dir,'missing.pdf')),/یافت نشد/);const disallowed=join(dir,'payload.exe');writeFileSync(disallowed,'MZ');assert.throws(()=>service.addFromPath('e1',disallowed),/نوع فایل پیوست مجاز نیست/);assert.equal(db.prepare('SELECT count(*) n FROM external_result_attachments').get().n,0);});
