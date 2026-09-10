import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createLaboratoryService,utcTimestamp} from '../src/application/laboratory.js';

function fixture(t) {
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
  db.exec(`INSERT INTO companies VALUES('c1','شرکت آزمایشی'),('c2','شرکت دوم');
    INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه','مشتری');
    INSERT INTO pours VALUES('pour1','c1','p1','2026-09-01T08:00:00.000Z');`);
  const service=createLaboratoryService(db,{companyId:'c1',actor:'کاربر نشست',clock:()=> '2026-09-10T12:00:00.000Z'});
  return {db,service};
}
const internal={id:'s1',kind:'internal',title:'آزمایش',purpose:'بررسی',samplerName:'نمونه‌بردار',sampledAt:'2026-09-01T08:00:00.000Z'};
const draft={sampleId:'s1-1',expectedRevision:0,strengthMpa:18,testedAt:'2026-09-08T08:00:00.000Z',testedBy:'آزمایشگر'};

test('service persists internal series and six samples with trusted actor',t=>{
  const {db,service}=fixture(t);
  service.createSeries({...internal,enteredBy:'نام جعلی ورودی'});
  assert.equal(db.prepare('SELECT count(*) n FROM samples').get().n,6);
  assert.equal(service.listSeries({kind:'internal'})[0].entered_by,'کاربر نشست');
  assert.equal(service.listSeries({kind:'customer'}).length,0);
  assert.throws(()=>service.createSeries(internal));
  assert.equal(db.prepare('SELECT count(*) n FROM samples').get().n,6);
});
test('customer series require valid company-owned pour and retain repeat pours in one project',t=>{
  const {db,service}=fixture(t);
  const input={id:'a',kind:'customer',projectId:'p1',pourId:'pour1',samplerName:'الف',sampledAt:internal.sampledAt};
  service.createSeries(input);
  db.exec("INSERT INTO pours VALUES('pour2','c1','p1','2026-09-02T08:00:00.000Z')");
  service.createSeries({...input,id:'b',pourId:'pour2'});
  assert.equal(service.listSeries({kind:'customer',projectId:'p1'}).length,2);
  const foreign=createLaboratoryService(db,{companyId:'c2',actor:'کاربر دوم'});
  assert.throws(()=>foreign.createSeries({...input,id:'bad'}));
  assert.equal(foreign.listSeries({kind:'customer'}).length,0);
});
test('partial specimen failure rolls back the whole series',t=>{
  const {db,service}=fixture(t);
  db.exec("CREATE TRIGGER fail_sample BEFORE INSERT ON samples WHEN NEW.id='s1-3' BEGIN SELECT RAISE(ABORT,'simulated failure'); END");
  assert.throws(()=>service.createSeries(internal));
  assert.equal(db.prepare('SELECT count(*) n FROM sampling_series').get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM samples').get().n,0);
});
test('draft corrections preserve history and stale edits are refused',t=>{
  const {db,service}=fixture(t);service.createSeries(internal);service.saveDraft(draft);
  assert.throws(()=>service.saveDraft({...draft,strengthMpa:19}));
  assert.throws(()=>service.saveDraft({...draft,expectedRevision:1,strengthMpa:19}));
  service.saveDraft({...draft,expectedRevision:1,strengthMpa:19,reason:'اصلاح ورود'});
  assert.equal(db.prepare('SELECT count(*) n FROM result_revisions').get().n,2);
  assert.equal(db.prepare('SELECT strength_mpa FROM current_results').get().strength_mpa,19);
});
test('invalid dates and impossible test ordering never persist',t=>{
  const {db,service}=fixture(t);
  assert.throws(()=>utcTimestamp('2026-02-30T00:00:00.000Z'));
  assert.throws(()=>utcTimestamp('2026-09-01T08:00:00'));
  service.createSeries(internal);
  assert.throws(()=>service.saveDraft({...draft,testedAt:'2026-08-30T08:00:00.000Z'}));
  assert.throws(()=>service.saveDraft({...draft,testedAt:'2026-09-11T08:00:00.000Z'}));
  assert.throws(()=>service.saveDraft({...draft,strengthMpa:null}));
  assert.throws(()=>service.saveDraft({...draft,sampleId:'s1-6'}));
  assert.equal(db.prepare('SELECT count(*) n FROM result_revisions').get().n,0);
});
test('company isolation and approved result gate prevent unauthorized draft replacement',t=>{
  const {db,service}=fixture(t);service.createSeries(internal);
  const foreign=createLaboratoryService(db,{companyId:'c2',actor:'دوم',clock:()=> '2026-09-10T12:00:00.000Z'});
  assert.throws(()=>foreign.saveDraft(draft));
  db.prepare('INSERT INTO result_revisions VALUES(?,?,?,?,?,?,?,?,?,?)').run('s1-1',1,18,'approved',draft.testedAt,'الف','ب','2026-09-08T09:00:00.000Z','ج',null);
  assert.throws(()=>service.saveDraft({...draft,expectedRevision:1,reason:'تغییر'}));
  assert.equal(db.prepare('SELECT revision FROM current_results').get().revision,1);
});
