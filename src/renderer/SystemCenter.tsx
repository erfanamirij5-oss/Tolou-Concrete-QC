import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type Profile={companyName:string;qcManagerName:string;managingDirectorName:string;isConfigured:boolean};
type Mode='sidebar'|'topbar'|'settings'|'onboarding';
type SystemBridge={
  getCompanyProfile:()=>Promise<{ok:boolean;data?:Profile;message?:string}>;
  saveCompanyProfile:(input:Omit<Profile,'isConfigured'>)=>Promise<{ok:boolean;data?:Profile;message?:string}>;
  createBackup:()=>Promise<{ok:boolean;data?:{cancelled:boolean;path?:string};message?:string}>;
  restoreBackup:()=>Promise<{ok:boolean;data?:{cancelled:boolean;restarting:boolean};message?:string}>;
};
const fallback:Profile={companyName:'',qcManagerName:'',managingDirectorName:'',isConfigured:false};
const system=()=>((window as unknown as {tolouSystem:SystemBridge}).tolouSystem);
const THEME_KEY='tolou-qc-theme';

export function SystemCenter({mode}:{mode:Mode}){
  const[profile,setProfile]=useState<Profile>(fallback);
  const[loaded,setLoaded]=useState(false);
  const[editing,setEditing]=useState(false);
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState(false);
  const[dark,setDark]=useState(()=>localStorage.getItem(THEME_KEY)==='dark');

  async function load(){try{const result=await system().getCompanyProfile();if(!result.ok||!result.data)throw new Error(result.message||'بارگذاری مشخصات شرکت انجام نشد');setProfile(result.data);}catch(e){setMessage(e instanceof Error?e.message:'بارگذاری مشخصات شرکت انجام نشد');}finally{setLoaded(true);}}
  useEffect(()=>{void load();const handler=()=>void load();window.addEventListener('tolou-profile-changed',handler);return()=>window.removeEventListener('tolou-profile-changed',handler);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem(THEME_KEY,dark?'dark':'light');},[dark]);

  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setMessage('');try{const result=await system().saveCompanyProfile({companyName:String(data.get('companyName')??''),qcManagerName:String(data.get('qcManagerName')??''),managingDirectorName:String(data.get('managingDirectorName')??'')});if(!result.ok||!result.data)throw new Error(result.message||'ذخیره مشخصات انجام نشد');setProfile(result.data);setEditing(false);setMessage('مشخصات سازمانی ذخیره شد.');window.dispatchEvent(new Event('tolou-profile-changed'));}catch(e){setMessage(e instanceof Error?e.message:'ذخیره مشخصات انجام نشد');}finally{setBusy(false);}}
  async function backup(){setBusy(true);setMessage('');try{const result=await system().createBackup();if(!result.ok)throw new Error(result.message||'تهیه بکاپ انجام نشد');if(!result.data?.cancelled)setMessage('نسخه پشتیبان پایگاه داده و پیوست‌ها با موفقیت ذخیره شد.');}catch(e){setMessage(e instanceof Error?e.message:'تهیه بکاپ انجام نشد');}finally{setBusy(false);}}
  async function restore(){if(!confirm('با بازیابی بکاپ، داده‌های فعلی نرم‌افزار با نسخه انتخابی جایگزین می‌شوند و برنامه دوباره اجرا خواهد شد. ادامه می‌دهید؟'))return;setBusy(true);setMessage('');try{const result=await system().restoreBackup();if(!result.ok)throw new Error(result.message||'بازیابی بکاپ انجام نشد');if(result.data?.restarting)setMessage('بکاپ معتبر است؛ نرم‌افزار برای اعمال بازیابی دوباره اجرا می‌شود.');}catch(e){setMessage(e instanceof Error?e.message:'بازیابی بکاپ انجام نشد');setBusy(false);}}

  if(mode==='topbar')return <button type="button" className="theme-toggle" onClick={()=>setDark(v=>!v)} title={dark?'حالت روشن':'حالت تاریک'} aria-label={dark?'فعال‌کردن حالت روشن':'فعال‌کردن حالت تاریک'}>{dark?'☀':'☾'}</button>;

  if(mode==='sidebar')return <button type="button" className="company-chip" onClick={()=>setEditing(true)} title="ویرایش مشخصات شرکت"><strong>{profile.companyName||'تکمیل مشخصات شرکت'}</strong>{profile.qcManagerName&&<span>کنترل کیفیت: {profile.qcManagerName}</span>}{profile.managingDirectorName&&<span>مدیرعامل: {profile.managingDirectorName}</span>}</button>;

  const showForm=mode==='onboarding'?loaded&&!profile.isConfigured:editing;
  if(mode==='onboarding'&&!showForm)return null;

  if(mode==='settings')return <section className="system-card glass panel--wide"><div className="panel-heading"><div><p className="eyebrow">سیستم و اطلاعات سازمانی</p><h3>{profile.companyName||'مشخصات شرکت'}</h3></div><button className="secondary-button" type="button" onClick={()=>setEditing(true)}>ویرایش مشخصات</button></div><div className="organization-summary"><span><small>مسئول کنترل کیفیت</small><strong>{profile.qcManagerName||'ثبت نشده'}</strong></span><span><small>مدیرعامل</small><strong>{profile.managingDirectorName||'ثبت نشده'}</strong></span></div><div className="backup-actions"><button type="button" className="primary-button" disabled={busy} onClick={()=>void backup()}>تهیه نسخه پشتیبان</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>void restore()}>بارگذاری نسخه پشتیبان</button></div>{message&&<div className="workbench-message">{message}</div>}{editing&&<ProfileDialog profile={profile} busy={busy} message={message} onSubmit={save} onClose={()=>setEditing(false)}/>}</section>;

  return showForm?<ProfileDialog profile={profile} busy={busy} message={message} onSubmit={save} onClose={mode==='onboarding'?undefined:()=>setEditing(false)} firstRun={mode==='onboarding'}/>:null;
}

function ProfileDialog({profile,busy,message,onSubmit,onClose,firstRun=false}:{profile:Profile;busy:boolean;message:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onClose?:()=>void;firstRun?:boolean}){
  return <div className="setup-overlay" role="dialog" aria-modal="true" aria-label="مشخصات سازمانی"><form className="setup-dialog glass" onSubmit={onSubmit}><div><p className="eyebrow eyebrow--accent">{firstRun?'راه‌اندازی اولیه':'تنظیمات سازمانی'}</p><h2>{firstRun?'خوش آمدید به طلوع کنترل کیفیت بتن':'مشخصات شرکت'}</h2><p>{firstRun?'برای شروع، مشخصات اصلی شرکت را یک‌بار ثبت کنید. این اطلاعات در سربرگ و گزارش‌های مرتبط استفاده می‌شود.':'اطلاعات سازمانی را ویرایش کنید.'}</p></div><label>نام شرکت<input name="companyName" defaultValue={profile.companyName==='شرکت شما'?'':profile.companyName} required autoFocus/></label><label>مسئول کنترل کیفیت<input name="qcManagerName" defaultValue={profile.qcManagerName} required/></label><label>مدیرعامل<input name="managingDirectorName" defaultValue={profile.managingDirectorName} required/></label>{message&&<div className="workbench-message">{message}</div>}<div className="row-actions"><button className="primary-button" disabled={busy}>{busy?'در حال ذخیره…':'ثبت و ادامه'}</button>{onClose&&<button type="button" className="secondary-button" onClick={onClose}>انصراف</button>}</div></form></div>;
}
