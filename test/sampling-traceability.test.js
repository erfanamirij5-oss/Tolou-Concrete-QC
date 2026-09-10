import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createSamplingTraceabilityService} from '../src/application/sampling-traceability.js';

function fixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  migrate(db);
  db.exec(`
    INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
    INSERT INTO sampling_series(id,company_id,kind,title,purpose,sampled_at,sampler_name,entered_by)
    VALUES('s1','c1','internal','کنترل تولید','کنترل روزانه','2026-09-10T08:00:00.000Z','نمونه‌بردار','کاربر'),
          ('s2','c2','internal','کنترل دوم','کنترل','2026-09-10T08:00:00.000Z','نمونه‌بردار','کاربر');
  `);
  return {db,service:createSamplingTraceabilityService(db,{companyId:'c1',actor:'کاربر',clock:()=> '2026-10-20T12:00:00.000Z'})};
}

test('comparison party stays linked to one owned sampling series',t=>{
  const {service}=fixture(t);
  const saved=service.addComparisonParty({id:'cmp1',seriesId:'s1',partyType:'laboratory',partyName:'آزمایشگاه همکار',laboratoryName:'آزمایشگاه A',samplerName:'نمونه بردار A'});
  assert.equal(saved.seriesId,'s1');
  assert.equal(service.listComparisonParties('s1').length,1);
  assert.throws(()=>service.addComparisonParty({id:'bad',seriesId:'s2',partyType:'laboratory',partyName:'خارجی'}),/متعلق به این شرکت/);
});

test('mix snapshot preserves dynamic kg per cubic metre components and exposes water cement data quality',t=>{
  const {service}=fixture(t);
  const snapshot=service.saveMixSnapshot({
    seriesId:'s1',sourceMode:'manual',mixCode:'M35',mixRevision:2,characteristicStrengthMpa:35,targetStrengthMpa:42,
    declaredWaterCementRatio:0.50,cementKgM3:400,waterKgM3:180,
    components:[
      {id:'m1',category:'fine_aggregate',materialName:'ماسه',quantityKgM3:760},
      {id:'m2',category:'coarse_aggregate',materialName:'نخودی',quantityKgM3:480},
      {id:'m3',category:'coarse_aggregate',materialName:'بادامی',quantityKgM3:620},
      {id:'m4',category:'chemical_admixture',materialName:'فوق روان کننده',quantityKgM3:5.5}
    ]
  });
  assert.equal(snapshot.calculatedWaterCementRatio,0.45);
  assert.equal(snapshot.waterCementMismatch,true);
  assert.equal(snapshot.totalRecordedMassKgM3,2445.5);
  const read=service.getMixSnapshot('s1');
  assert.equal(read.components.length,4);
  assert.equal(read.components[3].quantityKgM3,5.5);
  assert.throws(()=>service.saveMixSnapshot({seriesId:'s1',sourceMode:'manual'}),/قبلاً ثبت شده/);
});

test('comparison results are revisioned, immutable and age scoped',t=>{
  const {db,service}=fixture(t);
  service.addComparisonParty({id:'cmp1',seriesId:'s1',partyType:'laboratory',partyName:'آزمایشگاه همکار'});
  const first=service.saveComparisonResult({resultId:'r1',seriesId:'s1',comparisonPartyId:'cmp1',expectedRevision:0,ageDays:28,specimenLabel:'28-A',strengthMpa:36.4,testedAt:'2026-10-08T08:00:00.000Z',testedBy:'آزمایشگر A'});
  assert.equal(first.revision,1);
  assert.equal(service.listComparisonResults('s1')[0].strength_mpa,36.4);
  assert.throws(()=>service.saveComparisonResult({resultId:'r1',seriesId:'s1',comparisonPartyId:'cmp1',expectedRevision:0,ageDays:28,specimenLabel:'28-A',strengthMpa:37,testedAt:'2026-10-08T08:00:00.000Z'}),/تغییر کرده/);
  const revised=service.saveComparisonResult({resultId:'r1',seriesId:'s1',comparisonPartyId:'cmp1',expectedRevision:1,ageDays:28,specimenLabel:'28-A',strengthMpa:37,testedAt:'2026-10-08T08:00:00.000Z',reason:'اصلاح گزارش'});
  assert.equal(revised.revision,2);
  assert.equal(service.listComparisonResults('s1')[0].strength_mpa,37);
  assert.equal(db.prepare("SELECT count(*) AS n FROM comparison_result_revisions WHERE result_id='r1'").get().n,2);
  assert.throws(()=>db.exec("UPDATE comparison_result_revisions SET strength_mpa=40 WHERE result_id='r1'"));
});
