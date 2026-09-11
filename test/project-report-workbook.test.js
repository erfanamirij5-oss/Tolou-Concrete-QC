import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import * as XLSX from 'xlsx';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createReportingService} from '../src/application/reporting.js';
import {projectReportWorkbook} from '../src/main/project-report-workbook.ts';

function reportFixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  migrate(db);
  db.exec(`
INSERT INTO companies VALUES('c1','شرکت یک');
INSERT INTO projects(id,company_id,name,customer_name,address) VALUES('p1','c1','پروژه یک','مشتری الف','یزد');
INSERT INTO pours VALUES('pour1','c1','p1','2026-01-01T08:00:00.000Z');
INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-01-01T08:00:00.000Z','نمونه‌بردار','کاربر');
INSERT INTO samples VALUES('a7','s1',7,'2026-01-08T08:00:00.000Z');
INSERT INTO result_revisions VALUES('a7',1,31,'approved','2026-01-08T08:00:00.000Z','آزمایشگاه','کاربر','2026-01-08T09:00:00.000Z','مهندس',NULL);
`);
  return createReportingService(db,{companyId:'c1'}).projectQc({projectId:'p1'});
}

test('project report workbook survives XLSX binary round-trip with stable branded sheets and numeric cells',t=>{
  const report=reportFixture(t);
  const source=projectReportWorkbook(report);
  const bytes=XLSX.write(source,{bookType:'xlsx',type:'buffer',compression:true});
  assert.ok(Buffer.isBuffer(bytes));
  assert.ok(bytes.length>0);
  const parsed=XLSX.read(bytes);
  assert.deepEqual(parsed.SheetNames,['خلاصه مدیریتی','هویت گزارش','اقدامات و هشدارها','Master QC Dataset','ریز نتایج آزمون','خلاصه نوبت‌های نمونه‌گیری','داده‌های روند','مقاومت برحسب سن']);

  const summary=parsed.Sheets['خلاصه مدیریتی'];
  const rows=XLSX.utils.sheet_to_json(summary,{header:1,raw:true});
  const seriesRow=rows.find(row=>row[0]==='نوبت‌های نمونه‌برداری');
  const approvedRow=rows.find(row=>row[0]==='نتایج مقاومت تأییدشده');
  assert.equal(seriesRow?.[1],1);
  assert.equal(approvedRow?.[1],1);
  assert.equal(summary['B14']?.t,'n');
  assert.equal(summary['B15']?.t,'n');

  const identity=parsed.Sheets['هویت گزارش'];
  const identityRows=XLSX.utils.sheet_to_json(identity,{header:1,raw:true});
  assert.deepEqual(identityRows[1],['نام شرکت','شرکت یک']);

  const master=parsed.Sheets['Master QC Dataset'];
  const masterRows=XLSX.utils.sheet_to_json(master,{header:1,raw:true});
  assert.equal(masterRows.length,2);
  assert.equal(masterRows[1]?.[0],'s1');

  const trend=parsed.Sheets['داده‌های روند'];
  const trendRows=XLSX.utils.sheet_to_json(trend,{header:1,raw:true});
  const strengthRow=trendRows.find(row=>row[0]==='مقاومت فشاری');
  assert.equal(strengthRow?.[2],31);
  assert.equal(strengthRow?.[3],'MPa');
  assert.equal(trend['C2']?.t,'n');
});

test('project report workbook remains standards-neutral when no rule profile is configured',t=>{
  const report=reportFixture(t);
  assert.equal(report.standards.profile,null);
  assert.equal(report.standards.acceptanceEvaluated,false);
  const bytes=XLSX.write(projectReportWorkbook(report),{bookType:'xlsx',type:'buffer'});
  const parsed=XLSX.read(bytes);
  const summaryRows=XLSX.utils.sheet_to_json(parsed.Sheets['خلاصه مدیریتی'],{header:1,raw:true});
  const ruleProfileRow=summaryRows.find(row=>row[0]==='Rule Profile');
  assert.deepEqual(ruleProfileRow,['Rule Profile','—']);
  const evaluationRow=summaryRows.find(row=>row[0]==='Evaluation ثبت‌شده');
  assert.deepEqual(evaluationRow,['Evaluation ثبت‌شده',0]);
  const verdictRows=summaryRows.filter(row=>['Pass','Fail','Not Evaluated'].includes(String(row[0])));
  assert.deepEqual(verdictRows.map(row=>row[1]),[0,0,0]);
});
