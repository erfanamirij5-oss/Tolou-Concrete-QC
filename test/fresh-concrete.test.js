import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createFreshConcreteService} from '../src/application/fresh-concrete.js';

function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
 db.exec(`INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
 INSERT INTO sampling_series(id,company_id,kind,title,purpose,sampled_at,sampler_name,entered_by) VALUES
 ('s1','c1','internal','کنترل روزانه','کنترل بتن تازه','2026-09-10T08:00:00.000Z','الف','ب'),
 ('s2','c2','internal','کنترل دوم','کنترل','2026-09-10T08:00:00.000Z','الف','ب');`);
 return {db,service:createFreshConcreteService(db,{companyId:'c1',actor:'کاربر نشست',clock:()=> '2026-09-10T12:00:00.000Z'})};
}

test('slump and concrete temperature persist at sampling-series level',t=>{
 const {service}=fixture(t);
 const saved=service.save({seriesId:'s1',expectedRevision:0,slumpMm:115,concreteTemperatureC:27.4,measuredAt:'2026-09-10T08:10:00.000Z'});
 assert.equal(saved.slumpMm,115);assert.equal(saved.concreteTemperatureC,27.4);assert.equal(saved.revision,1);
 const current=service.get('s1');assert.equal(current.slump_mm,115);assert.equal(current.concrete_temperature_c,27.4);
});

test('fresh concrete corrections are immutable and stale edits are rejected',t=>{
 const {db,service}=fixture(t);
 service.save({seriesId:'s1',expectedRevision:0,slumpMm:110,concreteTemperatureC:26,measuredAt:'2026-09-10T08:05:00.000Z'});
 assert.throws(()=>service.save({seriesId:'s1',expectedRevision:0,slumpMm:120,concreteTemperatureC:26,measuredAt:'2026-09-10T08:05:00.000Z'}),/تغییر کرده/);
 service.save({seriesId:'s1',expectedRevision:1,slumpMm:120,concreteTemperatureC:26.5,measuredAt:'2026-09-10T08:06:00.000Z',reason:'اصلاح قرائت'});
 assert.equal(service.history('s1').length,2);assert.throws(()=>db.exec('UPDATE fresh_concrete_measurement_revisions SET slump_mm=130'));
});

test('missing values are not converted to zero and ownership is enforced',t=>{
 const {service}=fixture(t);
 assert.throws(()=>service.save({seriesId:'s1',expectedRevision:0,slumpMm:null,concreteTemperatureC:null,measuredAt:'2026-09-10T08:05:00.000Z'}),/حداقل یکی/);
 const onlyTemperature=service.save({seriesId:'s1',expectedRevision:0,slumpMm:null,concreteTemperatureC:28.1,measuredAt:'2026-09-10T08:05:00.000Z'});
 assert.equal(onlyTemperature.slumpMm,null);assert.equal(onlyTemperature.concreteTemperatureC,28.1);
 assert.throws(()=>service.get('s2'),/متعلق به این شرکت/);
});

test('measurement time cannot precede sampling or be in the future',t=>{
 const {service}=fixture(t);
 assert.throws(()=>service.save({seriesId:'s1',expectedRevision:0,slumpMm:100,measuredAt:'2026-09-10T07:59:00.000Z'}),/پیش از نمونه‌برداری/);
 assert.throws(()=>service.save({seriesId:'s1',expectedRevision:0,slumpMm:100,measuredAt:'2026-09-10T12:01:00.000Z'}),/آینده/);
});
