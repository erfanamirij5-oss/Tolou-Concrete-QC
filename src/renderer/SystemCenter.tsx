import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './system-navigation.css';
import './license-gate.css';

type Profile={companyName:string;qcManagerName:string;managingDirectorName:string;isConfigured:boolean};
type LicenseState='unlicensed'|'active'|'expired'|'invalid'|'clock_error';
type LicenseStatus={state:LicenseState;active:boolean;machineId:string;planMonths:3|6|12|24|null;issuedAt:string|null;expiresAt:string|null;daysRemaining:number;licenseId:string|null;message:string};
type Mode='sidebar'|'topbar'|'settings'|'onboarding';
type ActivationInput={companyName:string;qcManagerName:string;managingDirectorName:string;planMonths:3|6|12|24;productKey:string};
type SystemBridge={
  getCompanyProfile:()=>Promise<{ok:boolean;data?:Profile;message?:string}>;
  saveCompanyProfile:(input:Omit<Profile,'isConfigured'>)=>Promise<{ok:boolean;data?:Profile;message?:string}>;
  getLicenseStatus:()=>Promise<{ok:boolean;data?:LicenseStatus;message?:string}>;
  activateLicense:(input:ActivationInput)=>Promise<{ok:boolean;data?:{profile:Profile;license:LicenseStatus};message?:string}>;
  createBackup:()=>Promise<{ok:boolean;data?:{cancelled:boolean;path?:string};message?:string}>;
  restoreBackup:()=>Promise<{ok:boolean;data?:{cancelled:boolean;restarting:boolean};message?:string}>;
};
const fallback:Profile={companyName:'',qcManagerName:'',managingDirectorName:'',isConfigured:false};
const licenseFallback:LicenseStatus={state:'unlicensed',active:false,machineId:'—',planMonths:null,issuedAt:null,expiresAt:null,daysRemaining:0,licenseId:null,message:'برای استفاده از نرم‌افزار، اشتراک باید فعال شود.'};
const system=()=>((window as unknown as {tolouSystem:SystemBridge}).tolouSystem);
const THEME_KEY='tolou-qc-theme';
const planLabel=(months:LicenseStatus['planMonths'])=>months===3?'سه‌ماهه':months===6?'شش‌ماهه':months===12?'یک‌ساله':months===24?'دوساله':'—';

export function SystemCenter({mode}:{mode:Mode}){
  const[profile,setProfile]=useState<Profile>(fallback);
  const[license,setLicense]=useState<LicenseStatus>(licenseFallback);
  const[loaded,setLoaded]=useState(false);
  const[editing,setEditing]=useState(false);
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState(false);
  const[dark,setDark]=useState(()=>localStorage.getItem(THEME_KEY)==='dark');

  async function load(){try{const[p,l]=await Promise.all([system().getCompanyProfile(),system().getLicenseStatus()]);if(!p.ok||!p.data)throw new Error(p.message||'بارگذاری مشخصات شرکت انجام نشد');if(!l.ok||!l.data)throw new Error(l.message||'بارگذاری وضعیت اشتراک انجام نشد');setProfile(p.data);setLicense(l.data);}catch(e){setMessage(e instanceof Error?e.message:'بارگذاری اطلاعات سیستم انجام نشد');}finally{setLoaded(true);}}
  useEffect(()=>{void load();const handler=()=>void load();window.addEventListener('tolou-profile-changed',handler);window.addEventListener('tolou-license-changed',handler);return()=>{window.removeEventListener('tolou-profile-changed',handler);window.removeEventListener('tolou-license-changed',handler);};},[]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem(THEME_KEY,dark?'dark':'light');},[dark]);

  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setMessage('');try{const result=await system().saveCompanyProfile({companyName:String(data.get('companyName')??''),qcManagerName:String(data.get('qcManagerName')??''),managingDirectorName:String(data.get('managingDirectorName')??'')});if(!result.ok||!result.data)throw new Error(result.message||'ذخیره مشخصات انجام نشد');setProfile(result.data);setEditing(false);setMessage('مشخصات سازمانی ذخیره شد.');window.dispatchEvent(new Event('tolou-profile-changed'));}catch(e){setMessage(e instanceof Error?e.message:'ذخیره مشخصات انجام نشد');}finally{setBusy(false);}}
  async function activate(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setMessage('');try{const result=await system().activateLicense({companyName:String(data.get('companyName')??''),qcManagerName:String(data.get('qcManagerName')??''),managingDirectorName:String(data.get('managingDirectorName')??''),planMonths:Number(data.get('planMonths')) as 3|6|12|24,productKey:String(data.get('productKey')??'')});if(!result.ok||!result.data)throw new Error(result.message||'فعال‌سازی انجام نشد');setProfile(result.data.profile);setLicense(result.data.license);window.dispatchEvent(new Event('tolou-profile-changed'));window.dispatchEvent(new Event('tolou-license-changed'));}catch(e){setMessage(e instanceof Error?e.message:'فعال‌سازی انجام نشد');}finally{setBusy(false);}}
  async function backup(){setBusy(true);setMessage('');try{const result=await system().createBackup();if(!result.ok)throw new Error(result.message||'تهیه بکاپ انجام نشد');if(!result.data?.cancelled)setMessage('نسخه پشتیبان با موفقیت ذخیره شد.');}catch(e){setMessage(e instanceof Error?e.message:'تهیه بکاپ انجام نشد');}finally{setBusy(false);}}
  async function restore(){if(!confirm('با بازیابی بکاپ، داده‌های فعلی نرم‌افزار با نسخه انتخابی جایگزین می‌شوند و برنامه دوباره اجرا خواهد شد. ادامه می‌دهید؟'))return;setBusy(true);setMessage('');try{const result=await system().restoreBackup();if(!result.ok)throw new Error(result.message||'بازیابی بکاپ انجام نشد');if(result.data?.restarting)setMessage('بکاپ معتبر است؛ نرم‌افزار برای اعمال بازیابی دوباره اجرا می‌شود.');else setBusy(false);}catch(e){setMessage(e instanceof Error?e.message:'بازیابی بکاپ انجام نشد');setBusy(false);}}

  if(mode==='topbar')return <div className="system-topbar-tools"><button type="button" className="system-utility-button" disabled={busy} onClick={()=>void backup()} title="تهیه نسخه پشتیبان">بکاپ</button><button type="button" className="system-utility-button" disabled={busy} onClick={()=>void restore()} title="بازیابی نسخه پشتیبان">بازیابی</button><button type="button" className="theme-toggle" onClick={()=>setDark(v=>!v)} title={dark?'حالت روشن':'حالت تاریک'} aria-label={dark?'فعال‌کردن حالت روشن':'فعال‌کردن حالت تاریک'}>{dark?'☀':'☾'}</button>{message&&<span className="system-topbar-message" role="status">{message}</span>}</div>;

  if(mode==='sidebar')return <div className="company-chip company-chip--license"><strong>{profile.companyName||'طلوع کنترل کیفیت بتن'}</strong>{profile.qcManagerName&&<span>کنترل کیفیت: {profile.qcManagerName}</span>}<span className={license.active?'license-mini license-mini--active':'license-mini license-mini--locked'}>{license.active?`${license.daysRemaining.toLocaleString('fa-IR')} روز از اشتراک باقی مانده`:'اشتراک غیرفعال'}</span></div>;

  if(mode==='onboarding'){
    if(!loaded)return <div className="license-overlay"><div className="license-loading glass">در حال بررسی اشتراک…</div></div>;
    if(license.active)return null;
    return <LicenseActivationDialog profile={profile} license={license} busy={busy} message={message} onSubmit={activate}/>;
  }

  if(mode==='settings')return <section className="system-card glass panel--wide"><div className="panel-heading"><div><p className="eyebrow">سیستم و اطلاعات سازمانی</p><h3>{profile.companyName||'مشخصات شرکت'}</h3></div><button className="secondary-button" type="button" onClick={()=>setEditing(true)}>ویرایش مشخصات</button></div><div className="organization-summary"><span><small>مسئول کنترل کیفیت</small><strong>{profile.qcManagerName||'ثبت نشده'}</strong></span><span><small>مدیرعامل</small><strong>{profile.managingDirectorName||'ثبت نشده'}</strong></span><span><small>وضعیت اشتراک</small><strong>{license.active?`${planLabel(license.planMonths)} · ${license.daysRemaining.toLocaleString('fa-IR')} روز باقی‌مانده`:'غیرفعال / نیازمند تمدید'}</strong></span></div><div className="backup-actions"><button type="button" className="primary-button" disabled={busy} onClick={()=>void backup()}>تهیه نسخه پشتیبان</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>void restore()}>بارگذاری نسخه پشتیبان</button></div>{message&&<div className="workbench-message">{message}</div>}{editing&&<ProfileDialog profile={profile} busy={busy} message={message} onSubmit={save} onClose={()=>setEditing(false)}/>}</section>;

  return null;
}

function LicenseActivationDialog({profile,license,busy,message,onSubmit}:{profile:Profile;license:LicenseStatus;busy:boolean;message:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  const renewal=license.state==='expired';
  return <div className="license-overlay" role="dialog" aria-modal="true" aria-label="فعال‌سازی اشتراک طلوع"><form className="license-dialog glass" onSubmit={onSubmit}><div className="license-hero"><div><p className="eyebrow eyebrow--accent">TOLOU LICENSE</p><h2>{renewal?'اشتراک نرم‌افزار نیاز به تمدید دارد':'فعال‌سازی اشتراک نرم‌افزار'}</h2><p>{renewal?'مدت اشتراک قبلی پایان یافته است. پس از تمدید، کد فعال‌سازی جدید را وارد کنید.':'برای شروع استفاده، مشخصات مجموعه را ثبت کرده و مدت اشتراک را انتخاب کنید.'}</p></div><div className={renewal?'license-state-badge license-state-badge--expired':'license-state-badge'}>{renewal?'اشتراک پایان یافته':'فعال‌سازی اولیه'}</div></div><div className="license-machine"><span>کد این دستگاه</span><strong dir="ltr">{license.machineId}</strong><small>این کد را همراه با مدت اشتراک انتخابی برای پشتیبانی طلوع ارسال کنید.</small></div><div className="license-profile-grid"><label>نام شرکت / مجموعه<input name="companyName" defaultValue={profile.companyName==='شرکت شما'?'':profile.companyName} required autoFocus/></label><label>مسئول کنترل کیفیت<input name="qcManagerName" defaultValue={profile.qcManagerName} required/></label><label>مدیرعامل / مدیر مجموعه<input name="managingDirectorName" defaultValue={profile.managingDirectorName} required/></label></div><fieldset className="license-plans"><legend>مدت اشتراک</legend>{([3,6,12,24] as const).map((months,index)=><label key={months}><input type="radio" name="planMonths" value={months} defaultChecked={index===2}/><span><strong>{planLabel(months)}</strong><small>{months.toLocaleString('fa-IR')} ماه</small></span></label>)}</fieldset><label className="license-key-field"><span>Product Key / کد فعال‌سازی</span><input type="password" name="productKey" required autoComplete="off" spellCheck={false} dir="ltr" onCopy={e=>e.preventDefault()} onCut={e=>e.preventDefault()} onContextMenu={e=>e.preventDefault()} placeholder="••••••••••••••••••••••••"/><small>کد پس از ورود به‌صورت مخفی نمایش داده می‌شود و امکان Copy از این فیلد غیرفعال است.</small></label>{license.state==='clock_error'&&<div className="license-warning">{license.message}</div>}{message&&<div className="workbench-message">{message}</div>}<div className="license-contact"><span>برای خرید یا تمدید اشتراک</span><strong dir="ltr">09133240205</strong><small>toloueapp.ir · erfanamirij5@gmail.com</small></div><div className="row-actions"><button className="primary-button license-activate-button" disabled={busy}>{busy?'در حال بررسی و فعال‌سازی…':'فعال‌سازی و ورود به نرم‌افزار'}</button></div></form></div>;
}

function ProfileDialog({profile,busy,message,onSubmit,onClose}:{profile:Profile;busy:boolean;message:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onClose?:()=>void}){
  return <div className="setup-overlay" role="dialog" aria-modal="true" aria-label="مشخصات سازمانی"><form className="setup-dialog glass" onSubmit={onSubmit}><div><p className="eyebrow eyebrow--accent">تنظیمات سازمانی</p><h2>مشخصات شرکت</h2><p>اطلاعات سازمانی را ویرایش کنید.</p></div><label>نام شرکت<input name="companyName" defaultValue={profile.companyName==='شرکت شما'?'':profile.companyName} required autoFocus/></label><label>مسئول کنترل کیفیت<input name="qcManagerName" defaultValue={profile.qcManagerName} required/></label><label>مدیرعامل<input name="managingDirectorName" defaultValue={profile.managingDirectorName} required/></label>{message&&<div className="workbench-message">{message}</div>}<div className="row-actions"><button className="primary-button" disabled={busy}>{busy?'در حال ذخیره…':'ذخیره تغییرات'}</button>{onClose&&<button type="button" className="secondary-button" onClick={onClose}>انصراف</button>}</div></form></div>;
}
