import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createReportingService} from '../src/application/reporting.js';

function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec(`
INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
INSERT INTO projects(id,company_id,name,customer_name,address) VALUES('p1','c1','پروژه یک','مشتری الف','یزد'),('p2','c2','پروژه دو','مشتری ب','تهران');
INSERT INTO pours VALUES('pour1','c1','p1','2026-01-01T08:00:00.000Z');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-01-01T08:00:00.000Z','نمونه‌بردار','کاربر');
INSERT INTO samples VALUES('a7','s1',7,'2026-01-08T08:00:00.000Z');
INSERT INTO result_revisions VALUES('a7',1,31,'approved','2026-01-08T08:00:00.000Z','آزمایشگاه','کاربر','2026-01-08T09:00:00.000Z','مهندس',NULL);
`);return{db,service:createReportingService(db,{companyId:'c1'})};}

test('project QC report is company scoped and standards neutral',t=>{const{service}=fixture(t);const report=service.projectQc({projectId:'p1'});assert.equal(report.schema,'tolou-qc-project-report');assert.equal(report.schemaVersion,1);assert.equal(report.company.name,'شرکت یک');assert.equal(report.project.name,'پروژه یک');assert.equal(report.project.customerName,'مشتری الف');assert.equal(report.counts.samplingSeries,1);assert.equal(report.counts.approvedStrengthResults,1);assert.equal(report.analytics.strength.statistics.mean,31);assert.equal(report.filters.projectId,'p1');assert.equal(report.standards.profile,null);assert.equal(report.standards.acceptanceEvaluated,false);});

test('project QC report rejects missing and foreign-company projects',t=>{const{service}=fixture(t);assert.throws(()=>service.projectQc({}),/پروژه/);assert.throws(()=>service.projectQc({projectId:'p2'}),/پروژه یافت نشد/);});

test('project QC report counts honor the report date range and strength time basis',t=>{const{db,service}=fixture(t);db.exec(`
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s2','c1','customer','p1','pour1','2026-02-01T08:00:00.000Z','نمونه‌بردار','کاربر');
INSERT INTO samples VALUES('a28','s2',28,'2026-03-01T08:00:00.000Z');
INSERT INTO result_revisions VALUES('a28',1,42,'approved','2026-03-01T08:00:00.000Z','آزمایشگاه','کاربر','2026-03-01T09:00:00.000Z','مهندس',NULL);
`);const report=service.projectQc({projectId:'p1',startAt:'2026-01-01T00:00:00.000Z',endAt:'2026-01-31T23:59:59.999Z'});assert.equal(report.counts.samplingSeries,1);assert.equal(report.counts.approvedStrengthResults,1);assert.equal(report.analytics.strength.statistics.count,1);assert.equal(report.analytics.strength.statistics.mean,31);});
