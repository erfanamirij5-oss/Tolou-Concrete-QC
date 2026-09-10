import {isValidJalaliDate,toGregorian,toJalali} from './jalali';

export type PeriodicPreset='month'|'season'|'year';
export interface PeriodicRange {preset:PeriodicPreset;year:number;index:number|null;startAt:string;endAt:string;label:string;}
const seasons=['بهار','تابستان','پاییز','زمستان'];
const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function iso(jy:number,jm:number,jd:number,end=false){if(!isValidJalaliDate(jy,jm,jd))throw new Error('بازه شمسی معتبر نیست');const g=toGregorian(jy,jm,jd);const d=new Date(g.gy,g.gm-1,g.gd,end?23:0,end?59:0,end?59:0,end?999:0);return d.toISOString();}
function lastDay(jy:number,jm:number){if(jm<=6)return 31;if(jm<=11)return 30;return isValidJalaliDate(jy,12,30)?30:29;}
export function resolvePeriodicRange(preset:PeriodicPreset,year:number,index?:number|null):PeriodicRange{
 if(!Number.isInteger(year)||year<1200||year>1600)throw new Error('سال شمسی معتبر نیست');
 if(preset==='year')return{preset,year,index:null,startAt:iso(year,1,1),endAt:iso(year,12,lastDay(year,12),true),label:`سال ${year.toLocaleString('fa-IR')}`};
 if(preset==='season'){
  const season=Number(index);if(!Number.isInteger(season)||season<1||season>4)throw new Error('فصل معتبر نیست');const startMonth=(season-1)*3+1,endMonth=startMonth+2;
  return{preset,year,index:season,startAt:iso(year,startMonth,1),endAt:iso(year,endMonth,lastDay(year,endMonth),true),label:`${seasons[season-1]} ${year.toLocaleString('fa-IR')}`};
 }
 const month=Number(index);if(!Number.isInteger(month)||month<1||month>12)throw new Error('ماه معتبر نیست');return{preset,year,index:month,startAt:iso(year,month,1),endAt:iso(year,month,lastDay(year,month),true),label:`${months[month-1]} ${year.toLocaleString('fa-IR')}`};
}
export function currentJalaliYear(){const now=new Date(),j=toJalali(now.getFullYear(),now.getMonth()+1,now.getDate());return j.jy;}
export function previousPeriodicRange(range:PeriodicRange){if(range.preset==='year')return resolvePeriodicRange('year',range.year-1);if(range.preset==='season'){const i=range.index??1;return i===1?resolvePeriodicRange('season',range.year-1,4):resolvePeriodicRange('season',range.year,i-1);}const i=range.index??1;return i===1?resolvePeriodicRange('month',range.year-1,12):resolvePeriodicRange('month',range.year,i-1);}
