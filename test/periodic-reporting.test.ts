import test from 'node:test';
import assert from 'node:assert/strict';
import {previousPeriodicRange,resolvePeriodicRange} from '../src/renderer/periodic-reporting.ts';
import {isoToPersianLocal} from '../src/renderer/jalali.ts';

test('season preset resolves exact Jalali quarter boundaries',()=>{const r=resolvePeriodicRange('season',1405,2);assert.match(isoToPersianLocal(r.startAt),/^1405\/04\/01 00:00$/);assert.match(isoToPersianLocal(r.endAt),/^1405\/06\/31 23:59$/);assert.equal(r.label,'تابستان ۱٬۴۰۵');});
test('winter respects Jalali leap year boundary',()=>{const leap=resolvePeriodicRange('season',1403,4),normal=resolvePeriodicRange('season',1404,4);assert.match(isoToPersianLocal(leap.endAt),/^1403\/12\/30 23:59$/);assert.match(isoToPersianLocal(normal.endAt),/^1404\/12\/29 23:59$/);});
test('previous seasonal period crosses year boundary',()=>{const p=previousPeriodicRange(resolvePeriodicRange('season',1405,1));assert.equal(p.year,1404);assert.equal(p.index,4);});
test('monthly and yearly presets are deterministic',()=>{const month=resolvePeriodicRange('month',1405,7),year=resolvePeriodicRange('year',1405);assert.match(isoToPersianLocal(month.startAt),/^1405\/07\/01 00:00$/);assert.match(isoToPersianLocal(month.endAt),/^1405\/07\/30 23:59$/);assert.match(isoToPersianLocal(year.startAt),/^1405\/01\/01 00:00$/);assert.match(isoToPersianLocal(year.endAt),/^1405\/12\/29 23:59$/);});
