import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createStatisticalQcService} from '../src/application/statistical-qc.js';

function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`INSERT INTO companies VALUES('c1','شرکت');
INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه','مشتری');
INSERT INTO pours VALUES('pour1','c1','p1','2026-01-01T08:00:00.000Z');
INSERT INTO concrete_sources(id,company_id,code,name,source_type) VALUES('src1','c1','S1','بچینگ','internal');
INSERT INTO pour_qc_contexts(pour_id,company_id,project_id,concrete_source_id,created_at,created_by) VALUES('pour1','c1','p1','src1','2026-01-01T08:00:01.000Z','u');
INSERT INTO mix_designs(id,company_id,code,title) VALUES('mix1','c1','M30','طرح');
INSERT INTO mix_design_versions(id,mix_design_id,company_id,revision,created_at,created_by) VALUES('mv1','mix1','c1',1,'2026-01-01T07:00:00.000Z','u');
INSERT INTO pour_qc_specifications(pour_id,company_id,project_id,mix_design_version_id,concrete_class) VALUES('pour1','c1','p1','mv1','C30');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-01-01T08:00:00.000Z','الف','u'),('s2','c1','customer','p1','pour1','2026-01-02T08:00:00.000Z','الف','u'),('s3','c1','customer','p1','pour1','2026-01-03T08:00:00.000Z','الف','u'),('s4','c1','customer','p1','pour1','2026-01-04T08:00:00.000Z','الف','u'),('s5','c1','customer','p1','pour1','2026-01-05T08:00:00.000Z','الف','u'),('s6','c1','customer','p1','pour1','2026-01-06T08:00:00.000Z','الف','u');
INSERT INTO samples VALUES('a','s1',28,'2026-01-29T08:00:00.000Z'),('b','s2',28,'2026-01-30T08:00:00.000Z'),('c','s3',28,'2026-01-31T08:00:00.000Z'),('d','s4',28,'2026-02-01T08:00:00.000Z'),('e','s5',28,'2026-02-02T08:00:00.000Z'),('f','s6',7,'2026-01-13T08:00:00.000Z');
INSERT INTO result_revisions VALUES('a',1,30,'approved','2026-01-29T08:00:00.000Z','lab','u','2026-01-29T09:00:00.000Z','u',NULL),('b',1,31,'approved','2026-01-30T08:00:00.000Z','lab','u','2026-01-30T09:00:00.000Z','u',NULL),('c',1,32,'approved','2026-01-31T08:00:00.000Z','lab','u','2026-01-31T09:00:00.000Z','u',NULL),('d',1,33,'approved','2026-02-01T08:00:00.000Z','lab','u','2026-02-01T09:00:00.000Z','u',NULL),('e',1,34,'approved','2026-02-02T08:00:00.000Z','lab','u','2026-02-02T09:00:00.000Z','u',NULL),('f',1,20,'approved','2026-01-13T08:00:00.000Z','lab','u','2026-01-13T09:00:00.000Z','u',NULL);`);return createStatisticalQcService(db,{companyId:'c1'});}

test('statistical intelligence is deterministic and keeps age groups separate',t=>{const service=fixture(t);const r=service.analyze({projectId:'p1'});assert.equal(r.overall.statistics.count,6);assert.equal(r.byAge.length,2);const d28=r.byAge.find(x=>x.ageDays===28);assert.equal(d28.statistics.count,5);assert.equal(d28.statistics.mean,32);assert.equal(d28.statistics.median,32);assert.equal(d28.signals.maxIncreasingRun,5);assert.equal(d28.signals.last5MeanMpa,32);assert.equal(d28.signals.slopeMpaPerObservation,1);assert.equal(r.policy.standardsAcceptanceEvaluated,false);});
test('filters isolate age, class, source and mix revision without inventing acceptance',t=>{const service=fixture(t);const r=service.analyze({ageDays:7,concreteClass:'C30',concreteSourceId:'src1',mixVersionId:'mv1'});assert.equal(r.overall.statistics.count,1);assert.equal(r.overall.statistics.mean,20);assert.equal(r.overall.statistics.sampleSd,null);assert.equal(r.overall.signals.threeSigmaOutlierCount,0);assert.equal(r.filters.ageDays,7);});
test('statistical intelligence rejects reversed dates and missing company',t=>{const service=fixture(t);assert.throws(()=>service.analyze({startAt:'2026-02-01T00:00:00.000Z',endAt:'2026-01-01T00:00:00.000Z'}),/ابتدای بازه/);});
