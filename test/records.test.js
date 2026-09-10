import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSamplingContext, planLaboratoryBatch} from '../src/domain/records.js';

test('internal experiment requires purpose but no customer project', () => {
  const context = {kind:'internal', title:'آزمایش افزودنی', purpose:'مقایسه اسلامپ', samplerName:'آزمایشی', enteredBy:'کاربر آزمایشی'};
  assert.equal(validateSamplingContext(context).kind, 'internal');
  assert.throws(() => validateSamplingContext({...context, purpose:''}));
  assert.throws(() => validateSamplingContext({...context, projectId:'project-1'}));
});
test('customer sampling must identify project and pour and both responsible people', () => {
  const context = {kind:'customer', projectId:'p1', pourId:'pour1', samplerName:'آزمایشی', enteredBy:'ثبت آزمایشی'};
  assert.equal(validateSamplingContext(context).pourId, 'pour1');
  for (const field of ['projectId','pourId','samplerName','enteredBy']) assert.throws(() => validateSamplingContext({...context,[field]:''}));
});
test('50 litre batch scales kg/m3 without inventing actual consumption', () => {
  const input = [{id:'cement',kgPerCubicMetre:350},{id:'admixture',kgPerCubicMetre:2}];
  const original = structuredClone(input);
  const result = planLaboratoryBatch(input,50);
  assert.equal(result[0].plannedKg,17.5);
  assert.equal(result[1].plannedKg,0.1);
  assert.equal(result[0].actualKg,null);
  assert.deepEqual(input, original);
});
test('invalid volume, missing mass and duplicate components are rejected', () => {
  assert.throws(() => planLaboratoryBatch([{id:'cement',kgPerCubicMetre:350}],0));
  assert.throws(() => planLaboratoryBatch([{id:'cement',kgPerCubicMetre:null}],50));
  assert.throws(() => planLaboratoryBatch([{id:'cement',kgPerCubicMetre:1},{id:'cement',kgPerCubicMetre:2}],50));
});
