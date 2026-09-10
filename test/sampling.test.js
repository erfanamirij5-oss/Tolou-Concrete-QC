import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSampleSchedule, earlyWarning } from '../src/domain/sampling.js';

test('six samples retain a reserve without a deadline across the Persian new year', () => {
  const samples = createSampleSchedule('2026-03-19T10:00:00+03:30', 'series-1');
  assert.deepEqual(samples.map(x => x.ageDays), [7,7,28,28,28,null]);
  assert.equal(samples[0].dueAt, '2026-03-26T06:30:00.000Z');
  assert.equal(samples[5].dueAt, null);
  assert.equal(new Set(samples.map(x => x.id)).size, 6);
});
test('timezone ambiguity is rejected', () => {
  assert.throws(() => createSampleSchedule('2026-03-19T10:00:00', 'series-1'));
});
test('internal early warning never declares acceptance or invents a prediction', () => {
  const result = earlyWarning([17,18], 30);
  assert.equal(result.mean, 17.5);
  assert.equal(result.status, 'caution');
  assert.equal(result.acceptance, 'not-evaluated');
  assert.equal(result.prediction, null);
  assert.equal(earlyWarning([18,18], 30).status, 'threshold-met');
});
test('missing observations are not zero and zero targets are rejected', () => {
  assert.throws(() => earlyWarning([null,18], 30));
  assert.throws(() => earlyWarning([], 30));
  assert.throws(() => earlyWarning([18], 0));
});
