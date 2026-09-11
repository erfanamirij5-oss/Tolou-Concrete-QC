import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createRuleProfileService} from '../src/application/rule-profiles.js';

test('rule profile activation requires referenced verified tested rules and stays immutable through retirement',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.prepare('INSERT INTO companies(id,name) VALUES(?,?)').run('c1','شرکت آزمایشی');
 const service=createRuleProfileService(db,{companyId:'c1',actor:'مهندس'});
 service.createProfile({id:'rp1',code:'TEST',title:'پروفایل آزمایشی',authority:'مرجع آزمایشی',documentCode:'DOC-1',documentVersion:'2026'});
 service.addRule({id:'r1',profileId:'rp1',ruleKey:'strength-rule',ruleVersion:1,ruleType:'threshold',parameters:{basis:'approved_strength'},referenceClause:'Clause X',sourceTitle:'Document X',sourceVersion:'2026'});
 assert.throws(()=>service.activateProfile('rp1'),/تست تأییدشده/);
 service.verifyRule({profileId:'rp1',ruleId:'r1',testCaseCount:3});
 const active=service.activateProfile('rp1');assert.equal(active.status,'active');
 const profile=service.getProfile('rp1');assert.equal(profile.rules[0].verification_status,'verified');assert.equal(profile.rules[0].test_case_count,3);
 assert.throws(()=>db.prepare('UPDATE rule_profiles SET title=? WHERE id=?').run('تغییر','rp1'),/immutable/);
 assert.throws(()=>db.prepare('UPDATE rule_profile_rules SET enabled=0 WHERE id=?').run('r1'),/immutable/);
 const retired=service.retireProfile('rp1');assert.equal(retired.status,'retired');
 const after=service.getProfile('rp1');assert.equal(after.profile.status,'retired');assert.ok(after.profile.retired_at);assert.equal(after.profile.retired_by,'مهندس');
 assert.throws(()=>db.prepare('UPDATE rule_profiles SET title=? WHERE id=?').run('تغییر','rp1'),/immutable/);
 assert.throws(()=>db.prepare('UPDATE rule_profile_rules SET enabled=0 WHERE id=?').run('r1'),/immutable/);
});

test('rule profiles stay company scoped and contain no built-in standards rules',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);db.exec("INSERT INTO companies(id,name) VALUES('c1','یک'),('c2','دو')");
 const s1=createRuleProfileService(db,{companyId:'c1',actor:'A'});const s2=createRuleProfileService(db,{companyId:'c2',actor:'B'});
 s1.createProfile({id:'rp1',code:'P1',title:'پروفایل یک',authority:'مرجع',documentCode:'D',documentVersion:'1'});
 assert.equal(s1.listProfiles().length,1);assert.equal(s2.listProfiles().length,0);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM rule_profile_rules').get().n,0);
});
