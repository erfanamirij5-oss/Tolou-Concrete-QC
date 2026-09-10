import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isValidJalaliDate,normalizeDigits,persianLocalToIso,toGregorian,toJalali} from '../src/renderer/jalali.ts';

test('Jalali conversion covers Nowruz and round trips representative dates',()=>{
  assert.deepEqual(toGregorian(1405,1,1),{gy:2026,gm:3,gd:21});
  assert.deepEqual(toJalali(2026,3,21),{jy:1405,jm:1,jd:1});
  for(const [jy,jm,jd] of [[1404,12,29],[1405,1,1],[1405,6,19],[1405,12,29],[1399,12,30]] as const){
    const g=toGregorian(jy,jm,jd); assert.deepEqual(toJalali(g.gy,g.gm,g.gd),{jy,jm,jd});
  }
});

test('Jalali validation handles leap Esfand and invalid month/day values',()=>{
  assert.equal(isValidJalaliDate(1399,12,30),true);
  assert.equal(isValidJalaliDate(1400,12,30),false);
  assert.equal(isValidJalaliDate(1405,7,31),false);
  assert.equal(isValidJalaliDate(1405,6,31),true);
  assert.equal(isValidJalaliDate(1405,13,1),false);
});

test('Persian and Arabic digits normalize before parsing',()=>{
  assert.equal(normalizeDigits('۱۴۰۵/۰۶/۱۹ ۱۴:۳۰'),'1405/06/19 14:30');
  assert.equal(normalizeDigits('١٤٠٥/٠٦/١٩ ١٤:٣٠'),'1405/06/19 14:30');
});

test('Persian local input becomes an ISO instant and rejects malformed input',()=>{
  const iso=persianLocalToIso('۱۴۰۵/۰۶/۱۹ ۱۴:۳۰');
  assert.match(iso,/^2026-09-10T/);
  const instant=new Date(iso); assert.equal(Number.isFinite(instant.getTime()),true);
  assert.throws(()=>persianLocalToIso('۱۴۰۵/۱۳/۰۱ ۱۴:۳۰'),/معتبر/);
  assert.throws(()=>persianLocalToIso('۱۴۰۵/۰۶/۱۹ ۲۴:۰۰'),/معتبر/);
  assert.throws(()=>persianLocalToIso('۱۴۰۵-۰۶-۱۹'),/شکل/);
});
