import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createLaboratoryService} from '../src/application/laboratory.js';

test('a strength result may be recorded before its planned due date while retaining both timestamps',t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  migrate(db);
  db.exec("INSERT INTO companies VALUES('c1','شرکت آزمایشی')");
  const service=createLaboratoryService(db,{companyId:'c1',actor:'کاربر نشست',clock:()=> '2026-09-10T12:00:00.000Z'});
  service.createSeries({id:'early',kind:'internal',title:'کنترل زودهنگام',purpose:'آزمون گردش ثبت زودتر از موعد',samplerName:'نمونه‌بردار',sampledAt:'2026-09-01T08:00:00.000Z'});
  const sample=db.prepare("SELECT id,due_at FROM samples WHERE series_id='early' AND due_at>'2026-09-10T12:00:00.000Z' ORDER BY due_at LIMIT 1").get();
  assert.ok(sample,'fixture must include a specimen whose due date is still in the future');
  const testedAt='2026-09-10T11:00:00.000Z';
  const saved=service.saveDraft({sampleId:sample.id,expectedRevision:0,strengthMpa:24.6,testedAt,testedBy:'آزمایشگر'});
  assert.equal(saved.state,'draft');
  const row=service.listSamples({limit:200}).find(item=>item.id===sample.id);
  assert.equal(row.tested_at,testedAt);
  assert.equal(row.due_at,sample.due_at);
  assert.ok(row.tested_at<row.due_at,'early result remains deterministically identifiable from immutable test and due timestamps');
});
