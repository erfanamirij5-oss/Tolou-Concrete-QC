import { app } from 'electron';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hostname, homedir, arch, platform, release } from 'node:os';

const PRODUCT='tolou-concrete-qc';
const LICENSE_FILE='tolou-license.json';
const CLOCK_FILE='tolou-license-clock.json';
const CLOCK_TOLERANCE_MS=10*60*1000;
const ALLOWED_PLANS=[3,6,12,24] as const;
const PUBLIC_KEY_DER_BASE64='MCowBQYDK2VwAyEAYIake+yqFOBX4ffjiQAKGa1wsWXX5rHVkKsWmhnGthA=';

export type SubscriptionMonths=3|6|12|24;
export type LicenseState='unlicensed'|'active'|'expired'|'invalid'|'clock_error';
export type LicensePayload={v:1;product:string;licenseId:string;machineId:string;planMonths:SubscriptionMonths;issuedAt:string;expiresAt:string;customerName?:string};
type StoredLicense={productKey:string;payload:LicensePayload;activatedAt:string};
type ClockState={lastSeenAt:string};
export type LicenseStatus={state:LicenseState;active:boolean;machineId:string;planMonths:SubscriptionMonths|null;issuedAt:string|null;expiresAt:string|null;daysRemaining:number;licenseId:string|null;message:string};

function licensePath(){return join(app.getPath('userData'),LICENSE_FILE);}
function clockPath(){return join(app.getPath('userData'),CLOCK_FILE);}
function base64UrlDecode(value:string){return Buffer.from(value.replace(/-/g,'+').replace(/_/g,'/'),'base64');}
function machineGuid(){if(process.platform!=='win32')return'';try{const output=execFileSync('reg.exe',['query','HKLM\\SOFTWARE\\Microsoft\\Cryptography','/v','MachineGuid'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']});const match=output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);return match?.[1]?.trim()??'';}catch{return'';}}
export function getMachineId(){const stable=[machineGuid(),hostname(),homedir(),platform(),arch(),release()].join('|');const digest=createHash('sha256').update(stable,'utf8').digest('hex').toUpperCase();return digest.slice(0,20).match(/.{1,5}/g)!.join('-');}
function parseKey(productKey:string):LicensePayload{const normalized=String(productKey??'').trim();const parts=normalized.split('.');if(parts.length!==3||parts[0]!=='TLQ1')throw new Error('کد فعال‌سازی معتبر نیست.');const payloadBytes=base64UrlDecode(parts[1]);const signature=base64UrlDecode(parts[2]);const publicKey=createPublicKey({key:Buffer.from(PUBLIC_KEY_DER_BASE64,'base64'),format:'der',type:'spki'});if(!verify(null,payloadBytes,publicKey,signature))throw new Error('امضای کد فعال‌سازی معتبر نیست.');let payload:LicensePayload;try{payload=JSON.parse(payloadBytes.toString('utf8')) as LicensePayload;}catch{throw new Error('ساختار کد فعال‌سازی معتبر نیست.');}if(payload.v!==1||payload.product!==PRODUCT||!payload.licenseId||!payload.machineId||!ALLOWED_PLANS.includes(payload.planMonths))throw new Error('اطلاعات کد فعال‌سازی معتبر نیست.');const issued=Date.parse(payload.issuedAt),expires=Date.parse(payload.expiresAt);if(!Number.isFinite(issued)||!Number.isFinite(expires)||expires<=issued)throw new Error('تاریخ اشتراک در کد فعال‌سازی معتبر نیست.');return payload;}
export function validateProductKey(productKey:string,planMonths:SubscriptionMonths){const payload=parseKey(productKey);if(payload.machineId!==getMachineId())throw new Error('این کد فعال‌سازی برای این دستگاه صادر نشده است.');if(payload.planMonths!==planMonths)throw new Error('مدت اشتراک انتخاب‌شده با کد فعال‌سازی مطابقت ندارد.');if(Date.now()>=Date.parse(payload.expiresAt))throw new Error('اعتبار این کد فعال‌سازی پایان یافته است.');return payload;}
export function persistLicense(productKey:string,payload:LicensePayload){const record:StoredLicense={productKey:String(productKey).trim(),payload,activatedAt:new Date().toISOString()};writeFileSync(licensePath(),JSON.stringify(record),'utf8');writeFileSync(clockPath(),JSON.stringify({lastSeenAt:new Date().toISOString()} satisfies ClockState),'utf8');return readLicenseStatus();}
function statusBase(state:LicenseState,message:string):LicenseStatus{return{state,active:false,machineId:getMachineId(),planMonths:null,issuedAt:null,expiresAt:null,daysRemaining:0,licenseId:null,message};}
export function readLicenseStatus():LicenseStatus{const machineId=getMachineId(),path=licensePath();if(!existsSync(path))return statusBase('unlicensed','برای استفاده از نرم‌افزار، اشتراک باید فعال شود.');let stored:StoredLicense;try{stored=JSON.parse(readFileSync(path,'utf8')) as StoredLicense;}catch{return statusBase('invalid','اطلاعات اشتراک قابل خواندن نیست.');}let payload:LicensePayload;try{payload=parseKey(stored.productKey);}catch{return statusBase('invalid','کد فعال‌سازی ذخیره‌شده معتبر نیست.');}if(payload.machineId!==machineId)return statusBase('invalid','اشتراک به دستگاه دیگری تعلق دارد.');const now=Date.now();if(existsSync(clockPath())){try{const clock=JSON.parse(readFileSync(clockPath(),'utf8')) as ClockState;const last=Date.parse(clock.lastSeenAt);if(Number.isFinite(last)&&now+CLOCK_TOLERANCE_MS<last)return{...statusBase('clock_error','تاریخ یا ساعت سیستم به عقب تغییر کرده است. برای ادامه، زمان ویندوز را اصلاح کنید.'),planMonths:payload.planMonths,issuedAt:payload.issuedAt,expiresAt:payload.expiresAt,licenseId:payload.licenseId};}catch{}}
 const expires=Date.parse(payload.expiresAt);const remaining=Math.max(0,Math.ceil((expires-now)/86400000));if(now>=expires)return{state:'expired',active:false,machineId,planMonths:payload.planMonths,issuedAt:payload.issuedAt,expiresAt:payload.expiresAt,daysRemaining:0,licenseId:payload.licenseId,message:'اشتراک نرم‌افزار به پایان رسیده است و نیاز به تمدید دارد.'};
 try{writeFileSync(clockPath(),JSON.stringify({lastSeenAt:new Date(now).toISOString()} satisfies ClockState),'utf8');}catch{}
 return{state:'active',active:true,machineId,planMonths:payload.planMonths,issuedAt:payload.issuedAt,expiresAt:payload.expiresAt,daysRemaining:remaining,licenseId:payload.licenseId,message:'اشتراک فعال است.'};}
