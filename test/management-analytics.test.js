import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createManagementAnalyticsService} from '../src/application/management-analytics.js';

function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`
INSERT INTO companies(id,name) VALUES('c1','شرکت تست');
INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه مدیریت','مشتری');
INSERT INTO pours(id,company_id,project_id,occurred_at) VALUES('pour1','c1','p1','2026-01-01T08:00:00.000Z');
INSERT INTO project_strength_requirements(project_id,company_id,characteristic_strength_mpa,seven_day_reference_ratio,created_at,created_by,updated_at,updated_by) VALUES('p1','c1',30,0.60,'2026-01-01T00:00:00.000Z','u','2026-01-01T00:00:00.000Z','u');
INSERT INTO mix_designs(id,company_id,code,title) VALUES('mix1','c1','M400','طرح ۴۰۰');
INSERT INTO mix_design_versions(id,mix_design_id,company_id,revision,cement_kg_m3,created_at,created_by) VALUES('mix1-r1','mix1','c1',1,400,'2026-01-01T00:00:00.000Z','u');
INSERT INTO pour_qc_specifications(pour_id,company_id,project_id,mix_design_version_id,element_name,concrete_class) VALUES('pour1','c1','p1','mix1-r1','فونداسیون','C30');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-01-01T08:00:00.000Z','نمونه‌بردار','u');
INSERT INTO samples(id,series_id,age_days,due_at) VALUES('a7','s1',7,'2026-01-08T08:00:00.000Z'),('a28','s1',28,'2026-01-29T08:00:00.000Z'),('b28','s1',28,'2026-01-29T08:10:00.000Z');
INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason) VALUES
('a7',1,20,'approved','2026-01-08T08:00:00.000Z','lab','u','2026-01-08T09:00:00.000Z','u',NULL),
('a28',1,29,'approved','2026-01-29T08:00:00.000Z','lab','u','2026-01-29T09:00:00.000Z','u',NULL),
('b28',1,33,'approved','2026-01-29T08:10:00.000Z','lab','u','2026-01-29T09:00:00.000Z','u',NULL);
`);return createManagementAnalyticsService(db,{companyId:'c1'});}

test('management analytics uses project operational references without claiming standards acceptance',t=>{const service=fixture(t);const result=service.summary();assert.equal(result.schema,'tolou-qc-management');assert.equal(result.policy.sevenDayReferencePercent,60);assert.equal(result.policy.twentyEightDayReferencePercent,100);assert.equal(result.policy.standardsAcceptanceEvaluated,false);assert.equal(result.kpis.totalSamples,3);assert.equal(result.kpis.approvedResults,3);assert.equal(result.kpis.accepted,2);assert.equal(result.kpis.rejected,1);assert.equal(result.kpis.acceptanceRatePercent,66.67);});

test('management dataset is traceable to strength reference and cement content',t=>{const service=fixture(t);const dataset=service.dataset();const seven=dataset.rows.find(row=>row.sampleId==='a7');const failed28=dataset.rows.find(row=>row.sampleId==='a28');assert.equal(seven.referenceMpa,18);assert.equal(seven.operationalStatus,'met_reference');assert.equal(seven.cementKgM3,400);assert.equal(failed28.referenceMpa,30);assert.equal(failed28.operationalStatus,'below_reference');const summary=service.summary();assert.equal(summary.cementDistribution.length,1);assert.equal(summary.cementDistribution[0].cementKgM3,400);assert.equal(summary.cementDistribution[0].count,3);assert.equal(summary.byMixVersion[0].rejected,1);});

test('management date and project filters are deterministic',t=>{const service=fixture(t);const empty=service.summary({startAt:'2026-02-01T00:00:00.000Z',endAt:'2026-02-28T23:59:59.999Z'});assert.equal(empty.kpis.totalSamples,0);assert.equal(empty.kpis.acceptanceRatePercent,null);assert.throws(()=>service.summary({startAt:'2026-03-01T00:00:00.000Z',endAt:'2026-02-01T00:00:00.000Z'}),/ابتدای بازه/);});
