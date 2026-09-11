import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createRuleProfileService} from '../src/application/rule-profiles.js';
import {createRuleEvaluationService} from '../src/application/rule-evaluation.js';

function setup(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
 db.exec(`INSERT INTO companies(id,name) VALUES('c1','شرکت آزمایشی');
 INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه','مشتری');
 INSERT INTO project_strength_requirements(project_id,company_id,characteristic_strength_mpa,seven_day_reference_ratio,created_at,created_by,updated_at,updated_by) VALUES('p1','c1',30,0.60,'2026-09-01T00:00:00.000Z','A','2026-09-01T00:00:00.000Z','A');
 INSERT INTO pours(id,company_id,project_id,occurred_at) VALUES('pour1','c1','p1','2026-09-01T07:30:00.000Z');
 INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,sampled_at,sampler_name,entered_by) VALUES('s1','c1','customer','p1','pour1','2026-09-01T08:00:00.000Z','نمونه بردار','A');
 INSERT INTO samples(id,series_id,age_days,due_at) VALUES('sample1','s1',28,'2026-09-29T08:00:00.000Z');
 INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason) VALUES('sample1',1,27,'approved','2026-09-29T08:10:00.000Z','آزمایشگر','A','2026-09-29T08:20:00.000Z','تأییدکننده',NULL);`);
 return db;
}

function activeProfile(db){
 const p=createRuleProfileService(db,{companyId:'c1',actor:'مهندس'});
 p.createProfile({id:'rp1',code:'CUSTOM',title:'پروفایل کنترل پروژه',authority:'مرجع تعریف‌شده پروژه',documentCode:'DOC-X',documentVersion:'1'});
 p.addRule({id:'r1',profileId:'rp1',ruleKey:'ratio-check',ruleVersion:1,ruleType:'minimum_strength_ratio_of_fck',parameters:{ratio:0.90},referenceClause:'Clause A',sourceTitle:'Document X',sourceVersion:'1'});
 p.verifyRule({profileId:'rp1',ruleId:'r1',testCaseCount:2});p.activateProfile('rp1');return p;
}

test('project assignment requires an active profile and evaluation preserves source traceability',t=>{
 const db=setup(t);const profiles=createRuleProfileService(db,{companyId:'c1',actor:'مهندس'});profiles.createProfile({id:'draft',code:'DRAFT',title:'Draft',authority:'مرجع',documentCode:'D',documentVersion:'1'});
 const engine=createRuleEvaluationService(db,{companyId:'c1',actor:'QC'});assert.throws(()=>engine.assignProfile({projectId:'p1',profileId:'draft'}),/فعال/);
 activeProfile(db);engine.assignProfile({projectId:'p1',profileId:'rp1'});const evaluation=engine.evaluateResult({sampleId:'sample1',resultRevision:1});
 assert.equal(evaluation.evaluated,true);assert.equal(evaluation.overallStatus,'pass');assert.equal(evaluation.items[0].referenceClause,'Clause A');assert.equal(evaluation.items[0].sourceTitle,'Document X');assert.equal(evaluation.items[0].sourceVersion,'1');assert.equal(evaluation.items[0].calculation.requiredMpa,27);
 const stored=engine.getEvaluation(evaluation.evaluationId);assert.equal(stored.profile_code,'CUSTOM');assert.equal(stored.items[0].status,'pass');assert.equal(stored.input.strengthMpa,27);
 assert.throws(()=>db.prepare('UPDATE result_rule_evaluations SET overall_status=? WHERE id=?').run('fail',evaluation.evaluationId),/immutable/);
});

test('evaluation is explicit when a project has no assigned profile',t=>{
 const db=setup(t);const engine=createRuleEvaluationService(db,{companyId:'c1',actor:'QC'});const result=engine.evaluateResult({sampleId:'sample1',resultRevision:1});assert.equal(result.evaluated,false);assert.equal(result.reason,'no_profile');
});

test('unsupported rule types never pretend to pass',t=>{
 const db=setup(t);const p=createRuleProfileService(db,{companyId:'c1',actor:'مهندس'});p.createProfile({id:'rp2',code:'FUTURE',title:'آینده',authority:'مرجع',documentCode:'F',documentVersion:'1'});p.addRule({id:'r2',profileId:'rp2',ruleKey:'future-rule',ruleVersion:1,ruleType:'future_engine',parameters:{x:1},referenceClause:'Clause F',sourceTitle:'Future Doc',sourceVersion:'1'});p.verifyRule({profileId:'rp2',ruleId:'r2',testCaseCount:1});p.activateProfile('rp2');const engine=createRuleEvaluationService(db,{companyId:'c1',actor:'QC'});engine.assignProfile({projectId:'p1',profileId:'rp2'});const evaluation=engine.evaluateResult({sampleId:'sample1',resultRevision:1});assert.equal(evaluation.overallStatus,'not_evaluated');assert.equal(evaluation.items[0].status,'not_evaluated');
});
