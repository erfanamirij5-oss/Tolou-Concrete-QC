import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createAnalyticsService} from '../src/application/analytics.js';

function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه یک','مشتری'),('p2','c1','پروژه دو','مشتری');
INSERT INTO pours VALUES('pour1','c1','p1','2026-01-01T08:00:00.000Z'),('pour2','c1','p2','2026-01-01T08:00:00.000Z');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-01-01T08:00:00.000Z','الف','ب'),('s2','c1','customer','p2','pour2','2026-04-01T08:00:00.000Z','الف','ب');
INSERT INTO samples VALUES('a7','s1',7,'2026-01-08T08:00:00.000Z'),('b7','s1',7,'2026-01-08T08:00:00.000Z'),('a28','s1',28,'2026-01-29T08:00:00.000Z'),('c7','s2',7,'2026-04-08T08:00:00.000Z');
INSERT INTO result_revisions VALUES('a7',1,30,'approved','2026-01-08T08:00:00.000Z','lab','u','2026-01-08T09:00:00.000Z','u',NULL),('b7',1,34,'approved','2026-01-08T08:10:00.000Z','lab','u','2026-01-08T09:00:00.000Z','u',NULL),('a28',1,40,'approved','2026-01-29T08:00:00.000Z','lab','u','2026-01-29T09:00:00.000Z','u',NULL),('c7',1,50,'approved','2026-04-08T08:00:00.000Z','lab','u','2026-04-08T09:00:00.000Z','u',NULL);
INSERT INTO fresh_concrete_measurement_revisions VALUES('s1',1,120,24,'2026-01-01T08:10:00.000Z',NULL,'u','2026-01-01T08:11:00.000Z'),('s2',1,150,29,'2026-04-01T08:10:00.000Z',NULL,'u','2026-04-01T08:11:00.000Z');
INSERT INTO specimen_physical_measurement_revisions VALUES('a7',1,'cube',150,150,150,NULL,8.1,0.003375,2400,NULL,'u','2026-01-08T07:00:00.000Z'),('b7',1,'cube',150,150,150,NULL,8.2,0.003375,2429.62962962963,NULL,'u','2026-01-08T07:01:00.000Z'),('c7',1,'cube',150,150,150,NULL,8.0,0.003375,2370.37037037037,NULL,'u','2026-04-08T07:00:00.000Z');`);return{db,service:createAnalyticsService(db,{companyId:'c1'})};}

test('analytics computes deterministic sample statistics and age buckets',t=>{const{service}=fixture(t);const r=service.summary({startAt:'2026-01-01T00:00:00.000Z',endAt:'2026-03-31T23:59:59.999Z',projectId:'p1'});assert.equal(r.strength.statistics.count,3);assert.equal(r.strength.statistics.mean,104/3);assert.ok(Math.abs(r.strength.statistics.sampleSd-5.033222956847166)<1e-12);assert.equal(r.strength.byAge['7'].count,2);assert.equal(r.strength.byAge['28'].mean,40);assert.equal(r.slump.statistics.mean,120);assert.equal(r.concreteTemperature.statistics.mean,24);assert.equal(r.hardenedDensity.statistics.count,2);assert.equal(r.strength.approvedOnly,true);});

test('date and project filters isolate the requested QC period',t=>{const{service}=fixture(t);const r=service.summary({startAt:'2026-04-01T00:00:00.000Z',endAt:'2026-04-30T23:59:59.999Z',projectId:'p2'});assert.equal(r.strength.statistics.count,1);assert.equal(r.strength.statistics.mean,50);assert.equal(r.slump.statistics.mean,150);assert.equal(r.concreteTemperature.statistics.mean,29);assert.equal(r.hardenedDensity.statistics.count,1);assert.equal(r.hardenedDensity.trend[0].projectId,'p2');});

test('analytics never turns missing observations into zero and rejects reversed ranges',t=>{const{db,service}=fixture(t);db.exec("UPDATE fresh_concrete_measurement_revisions SET slump_mm=NULL WHERE series_id='s2'");assert.throws(()=>service.summary({startAt:'2026-05-01T00:00:00.000Z',endAt:'2026-04-01T00:00:00.000Z'}),/ابتدای بازه/);const r=service.summary({projectId:'p2'});assert.equal(r.slump.statistics.count,0);assert.equal(r.slump.statistics.mean,null);});
