const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
const div=(a:number,b:number)=>Math.trunc(a/b);
const mod=(a:number,b:number)=>a-Math.trunc(a/b)*b;

function jalCal(jy:number){
  if(jy<breaks[0]||jy>=breaks[breaks.length-1]) throw new Error('سال شمسی خارج از محدوده پشتیبانی است');
  const gy=jy+621; let leapJ=-14; let jp=breaks[0]; let jump=0;
  for(let i=1;i<breaks.length;i+=1){const jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=div(jump,33)*8+div(mod(jump,33),4);jp=jm;}
  let n=jy-jp; leapJ+=div(n,33)*8+div(mod(n,33)+3,4);
  if(mod(jump,33)===4&&jump-n===4) leapJ+=1;
  const leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150;
  const march=20+leapJ-leapG;
  if(jump-n<6) n=n-jump+div(jump+4,33)*33;
  let leap=mod(mod(n+1,33)-1,4); if(leap===-1) leap=4;
  return {leap,gy,march};
}
function g2d(gy:number,gm:number,gd:number){let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408;d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752;return d;}
function d2g(jdn:number){let j=4*jdn+139361631;j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908;const i=div(mod(j,1461),4)*5+308;const gd=div(mod(i,153),5)+1;const gm=mod(div(i,153),12)+1;const gy=div(j,1461)-100100+div(8-gm,6);return {gy,gm,gd};}
function j2d(jy:number,jm:number,jd:number){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-div(jm,7)*(jm-7)+jd-1;}
export function toJalali(gy:number,gm:number,gd:number){const jdn=g2d(gy,gm,gd);const g=d2g(jdn);let jy=g.gy-621;const r=jalCal(jy);const jdn1f=g2d(g.gy,3,r.march);let k=jdn-jdn1f;if(k>=0){if(k<=185)return {jy,jm:1+div(k,31),jd:mod(k,31)+1};k-=186;}else{jy-=1;k+=179;if(r.leap===1)k+=1;}return {jy,jm:7+div(k,30),jd:mod(k,30)+1};}
export function toGregorian(jy:number,jm:number,jd:number){return d2g(j2d(jy,jm,jd));}
export function isValidJalaliDate(jy:number,jm:number,jd:number){if(!Number.isInteger(jy)||!Number.isInteger(jm)||!Number.isInteger(jd)||jm<1||jm>12||jd<1)return false;const max=jm<=6?31:jm<=11?30:(jalCal(jy).leap===0?30:29);return jd<=max;}
const fa='۰۱۲۳۴۵۶۷۸۹';
export function normalizeDigits(value:string){return value.replace(/[۰-۹]/g,(d)=>String(fa.indexOf(d))).replace(/[٠-٩]/g,(d)=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));}
export function isoToPersianLocal(iso:string|null|undefined){if(!iso)return '';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';const j=toJalali(d.getFullYear(),d.getMonth()+1,d.getDate());return `${j.jy.toString().padStart(4,'0')}/${j.jm.toString().padStart(2,'0')}/${j.jd.toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;}
export function nowToPersianLocal(){return isoToPersianLocal(new Date().toISOString());}
export function persianLocalToIso(value:string){const normalized=normalizeDigits(value).trim();const match=/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s+(\d{1,2}):(\d{2})$/.exec(normalized);if(!match)throw new Error('تاریخ را به شکل ۱۴۰۵/۰۶/۱۹ ۱۴:۳۰ وارد کنید');const jy=Number(match[1]),jm=Number(match[2]),jd=Number(match[3]),hour=Number(match[4]),minute=Number(match[5]);if(!isValidJalaliDate(jy,jm,jd)||hour<0||hour>23||minute<0||minute>59)throw new Error('تاریخ و زمان شمسی معتبر نیست');const g=toGregorian(jy,jm,jd);const local=new Date(g.gy,g.gm-1,g.gd,hour,minute,0,0);if(!Number.isFinite(local.getTime()))throw new Error('تاریخ و زمان شمسی معتبر نیست');return local.toISOString();}
