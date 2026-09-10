import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ConcreteSourceSummary, CustomerSummary, PourContextSummary, PourSummary, ProjectSummary, SampleSummary, SeriesSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './project-workbench.css';

const nextId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}`;
type ProjectView='list'|'new'|'detail';
type ProjectTab='overview'|'pours'|'samples'|'results'|'reports';

export function ProjectWorkbench({onChanged,refreshKey=0,onStartSampling,onOpenResults,onOpenReports}:{onChanged?:()=>void;refreshKey?:number;onStartSampling?:(projectId:string)=>void;onOpenResults?:(projectId:string)=>void;onOpenReports?:(projectId:string)=>void}){
 const[projects,setProjects]=useState<ProjectSummary[]>([]);
 const[pours,setPours]=useState<PourSummary[]>([]);
 const[customers,setCustomers]=useState<CustomerSummary[]>([]);
 const[sources,setSources]=useState<ConcreteSourceSummary[]>([]);
 const[contexts,setContexts]=useState<PourContextSummary[]>([]);
 const[series,setSeries]=useState<SeriesSummary[]>([]);
 const[samples,setSamples]=useState<SampleSummary[]>([]);
 const[selectedProject,setSelectedProject]=useState('');
 const[view,setView]=useState<ProjectView>('list');
 const[tab,setTab]=useState<ProjectTab>('overview');
 const[showPourForm,setShowPourForm]=useState(false);
 const[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false);

 async function reloadProjects(){const result=await window.tolou.listProjects();if(!result.ok)throw new Error(result.message);setProjects(result.data);}
 async function reloadParties(){const[c,s]=await Promise.all([window.tolou.listCustomers(),window.tolou.listConcreteSources()]);if(!c.ok)throw new Error(c.message);if(!s.ok)throw new Error(s.message);setCustomers(c.data.filter(x=>x.archived===0));setSources(s.data.filter(x=>x.archived===0));}
 async function reloadProjectDetail(projectId:string){
  const[p,c,s,allSamples]=await Promise.all([window.tolou.listPours(projectId),window.tolou.listPourContexts(projectId),window.tolou.listSeries('customer',projectId),window.tolou.listSamples(1000)]);
  if(!p.ok)throw new Error(p.message);if(!c.ok)throw new Error(c.message);if(!s.ok)throw new Error(s.message);if(!allSamples.ok)throw new Error(allSamples.message);
  setPours(p.data);setContexts(c.data);setSeries(s.data);setSamples(allSamples.data.filter(x=>x.project_id===projectId));
 }
 useEffect(()=>{void Promise.all([reloadProjects(),reloadParties()]).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری اطلاعات انجام نشد'));},[refreshKey]);
 useEffect(()=>{if(!selectedProject){setPours([]);setContexts([]);setSeries([]);setSamples([]);return;}void reloadProjectDetail(selectedProject).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری پرونده پروژه انجام نشد'));},[selectedProject,refreshKey]);

 const activeProjects=projects.filter(p=>p.archived===0);
 const current=useMemo(()=>projects.find(p=>p.id===selectedProject)??null,[projects,selectedProject]);
 const contextByPour=useMemo(()=>new Map(contexts.map(x=>[x.pour_id,x])),[contexts]);
 const overdue=samples.filter(x=>x.state!=='approved'&&x.state!=='void'&&x.due_at&&Date.parse(x.due_at)<Date.now());
 const dueSoon=samples.filter(x=>x.state!=='approved'&&x.state!=='void'&&x.due_at&&Date.parse(x.due_at)>=Date.now()&&Date.parse(x.due_at)-Date.now()<=48*3600_000);
 const awaitingReview=samples.filter(x=>x.state==='draft');
 const approved=samples.filter(x=>x.state==='approved');
 const seven=samples.filter(x=>x.age_days===7);
 const twentyEight=samples.filter(x=>x.age_days===28);
 const average=(rows:SampleSummary[])=>{const values=rows.map(x=>x.strength_mpa).filter((x):x is number=>x!=null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};

 function openProject(id:string){setSelectedProject(id);setView('detail');setTab('overview');setShowPourForm(false);setMessage('');}
 async function submitProject(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');try{const id=nextId('PRJ');const result=await window.tolou.createProject({id,name:String(data.get('name')),customerName:String(data.get('customerName')),address:String(data.get('address')??'')});if(!result.ok)throw new Error(result.message);await reloadProjects();setSelectedProject(id);setView('detail');setTab('overview');form.reset();setMessage('پروژه ایجاد شد. حالا بتن‌ریزی را ثبت کنید.');onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت پروژه انجام نشد');}finally{setBusy(false);}}
 async function submitPour(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selectedProject)return;const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');try{const occurredAt=String(data.get('occurredAt')??'');if(!occurredAt)throw new Error('زمان بتن‌ریزی را وارد کنید.');const customerId=String(data.get('customerId')??'')||null;const concreteSourceId=String(data.get('concreteSourceId')??'')||null;if(!customerId&&!concreteSourceId)throw new Error('حداقل مشتری یا منبع بتن را انتخاب کنید.');const created=await window.tolou.createPour({id:nextId('POUR'),projectId:selectedProject,occurredAt,customerId,concreteSourceId});if(!created.ok)throw new Error(created.message);await reloadProjectDetail(selectedProject);setShowPourForm(false);form.reset();setMessage('بتن‌ریزی ثبت شد. مرحله بعد: نمونه‌برداری.');onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت بتن‌ریزی انجام نشد');}finally{setBusy(false);}}

 if(view==='new')return <section className="project-workbench glass"><div className="panel-heading"><div><p className="eyebrow">مرحله ۱</p><h3>ایجاد پروژه جدید</h3></div><button className="text-button" type="button" onClick={()=>setView('list')}>بازگشت</button></div>{message&&<div className="workbench-message" role="status">{message}</div>}<form className="workbench-form" onSubmit={submitProject}><label>نام پروژه<input name="name" required autoFocus/></label><label>نام مشتری<input name="customerName" required/></label><label>آدرس پروژه<input name="address"/></label><button className="primary-button" disabled={busy}>{busy?'در حال ثبت…':'ایجاد پروژه'}</button></form></section>;

 if(view==='detail'&&current)return <section className="project-workbench glass project-dossier">
  <div className="panel-heading"><div><p className="eyebrow">پرونده دیجیتال پروژه</p><h3>{current.name}</h3><small>{current.customer_name}{current.address?` · ${current.address}`:''}</small></div><button className="text-button" type="button" onClick={()=>setView('list')}>همه پروژه‌ها</button></div>
  {message&&<div className="workbench-message" role="status">{message}</div>}
  <div className="result-stepper project-tabs" aria-label="بخش‌های پرونده پروژه">
    <button className={tab==='overview'?'is-active':''} onClick={()=>setTab('overview')}>نمای کلی</button>
    <button className={tab==='pours'?'is-active':''} onClick={()=>setTab('pours')}>بتن‌ریزی‌ها</button>
    <button className={tab==='samples'?'is-active':''} onClick={()=>setTab('samples')}>نمونه‌ها</button>
    <button className={tab==='results'?'is-active':''} onClick={()=>setTab('results')}>نتایج</button>
    <button className={tab==='reports'?'is-active':''} onClick={()=>setTab('reports')}>گزارش‌ها</button>
  </div>

  {tab==='overview'&&<>
    <div className="dossier-metrics">
      <div><small>بتن‌ریزی</small><strong>{pours.length.toLocaleString('fa-IR')}</strong></div>
      <div><small>نمونه‌برداری</small><strong>{series.length.toLocaleString('fa-IR')}</strong></div>
      <div><small>موعد تا ۴۸ ساعت</small><strong>{dueSoon.length.toLocaleString('fa-IR')}</strong></div>
      <div><small>موعد گذشته</small><strong>{overdue.length.toLocaleString('fa-IR')}</strong></div>
      <div><small>منتظر تأیید</small><strong>{awaitingReview.length.toLocaleString('fa-IR')}</strong></div>
      <div><small>نتیجه تأییدشده</small><strong>{approved.length.toLocaleString('fa-IR')}</strong></div>
    </div>
    <div className="quick-actions dossier-actions">
      <button className="quick-action" onClick={()=>onStartSampling?.(current.id)}><span><strong>نمونه‌برداری جدید</strong><small>ثبت نوبت جدید برای همین پروژه</small></span></button>
      <button className="quick-action" onClick={()=>setTab('samples')}><span><strong>برنامه نمونه‌ها</strong><small>مشاهده موعدهای ۷ و ۲۸ روزه</small></span></button>
      <button className="quick-action" onClick={()=>onOpenResults?.(current.id)}><span><strong>ثبت نتیجه</strong><small>ورود نتایج موعدرسیده پروژه</small></span></button>
      <button className="quick-action" onClick={()=>onOpenReports?.(current.id)}><span><strong>گزارش پروژه</strong><small>خروجی PDF و Excel حرفه‌ای</small></span></button>
    </div>
  </>}

  {tab==='pours'&&<><div className="panel-heading"><div><p className="eyebrow">بتن‌ریزی‌های پروژه</p><h3>سوابق بتن‌ریزی</h3></div><button className="primary-button mini-button" type="button" onClick={()=>setShowPourForm(v=>!v)}>{showPourForm?'بستن فرم':'ثبت بتن‌ریزی جدید'}</button></div>{showPourForm&&<form className="workbench-form" onSubmit={submitPour}><label>مشتری QC<select name="customerId"><option value="">انتخاب کنید</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>منبع بتن<select name="concreteSourceId"><option value="">انتخاب کنید</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>زمان بتن‌ریزی (شمسی)<PersianDateTimeInput name="occurredAt" required/></label>{!customers.length&&!sources.length&&<div className="workbench-message">ابتدا مشتری یا منبع بتن را از تنظیمات ← اطلاعات پایه ثبت کنید.</div>}<button className="primary-button" disabled={busy}>{busy?'در حال ثبت…':'ثبت بتن‌ریزی'}</button></form>}<div className="pour-list">{pours.map(pour=>{const ctx=contextByPour.get(pour.id);return <div key={pour.id}><strong>{isoToPersianLocal(pour.occurred_at)}</strong><small>{ctx?`${ctx.customer_name??'—'} · ${ctx.concrete_source_name??'—'}`:'اطلاعات QC ثبت نشده'}</small></div>})}{!pours.length&&<div className="recovery-empty"><h3>هنوز بتن‌ریزی ثبت نشده است</h3><p>برای ادامه، اولین بتن‌ریزی این پروژه را ثبت کنید.</p></div>}</div>{pours.length>0&&<div className="history-strip"><strong>مرحله بعد</strong><span>بتن‌ریزی ثبت شده است؛ اکنون نمونه‌برداری را شروع کنید.</span><button type="button" className="primary-button mini-button" onClick={()=>onStartSampling?.(current.id)}>شروع نمونه‌برداری</button></div>}</>}

  {tab==='samples'&&<><div className="panel-heading"><div><p className="eyebrow">برنامه آزمایشگاه</p><h3>نمونه‌ها و موعدها</h3></div></div>{!samples.length?<div className="recovery-empty"><h3>هنوز نمونه‌ای برای این پروژه ثبت نشده است</h3><p>از همین پرونده نمونه‌برداری را شروع کنید.</p><button className="primary-button" onClick={()=>onStartSampling?.(current.id)}>شروع نمونه‌برداری</button></div>:<div className="table-wrap"><table><thead><tr><th>سن</th><th>موعد</th><th>مقاومت</th><th>وضعیت</th></tr></thead><tbody>{samples.map(row=>{const status=row.state==='approved'?'تأییدشده':row.state==='draft'?'منتظر بررسی':row.state==='void'?'باطل':row.due_at&&Date.parse(row.due_at)<Date.now()?'موعد گذشته':row.due_at&&Date.parse(row.due_at)-Date.now()<=48*3600_000?'تا ۴۸ ساعت':'برنامه‌ریزی‌شده';return <tr key={row.id}><td>{row.age_days===null?'شاهد':`${row.age_days.toLocaleString('fa-IR')} روزه`}</td><td>{row.due_at?isoToPersianLocal(row.due_at):'بدون موعد'}</td><td>{row.strength_mpa==null?'—':`${row.strength_mpa.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</td><td>{status}</td></tr>})}</tbody></table></div>}</>}

  {tab==='results'&&<><div className="dossier-metrics"><div><small>میانگین ۷ روزه</small><strong>{average(seven)==null?'—':`${average(seven)!.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</strong></div><div><small>میانگین ۲۸ روزه</small><strong>{average(twentyEight)==null?'—':`${average(twentyEight)!.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</strong></div><div><small>تأییدشده</small><strong>{approved.length.toLocaleString('fa-IR')}</strong></div><div><small>منتظر بررسی</small><strong>{awaitingReview.length.toLocaleString('fa-IR')}</strong></div></div><div className="history-strip"><strong>ثبت نتیجه</strong><span>برای ورود یا اصلاح نتیجه، وارد فضای اختصاصی ثبت نتایج شوید.</span><button className="primary-button mini-button" onClick={()=>onOpenResults?.(current.id)}>رفتن به ثبت نتایج</button></div></>}

  {tab==='reports'&&<><div className="recovery-empty"><h3>مرکز گزارش‌های این پروژه</h3><p>گزارش فارسی رسمی، PDF و Excel مهندسی از داده‌های همین پرونده ساخته می‌شود.</p><button className="primary-button" onClick={()=>onOpenReports?.(current.id)}>ساخت گزارش پروژه</button></div></>}
 </section>;

 return <section className="project-workbench glass"><div className="panel-heading"><div><p className="eyebrow">پروژه‌های فعال</p><h3>پروژه‌ها</h3></div><button className="primary-button mini-button" type="button" onClick={()=>{setMessage('');setView('new')}}>پروژه جدید</button></div>{message&&<div className="workbench-message" role="status">{message}</div>}{!activeProjects.length?<div className="recovery-empty"><h3>هنوز هیچ پروژه‌ای ثبت نشده است</h3><p>برای شروع اولین پرونده کنترل کیفیت، یک پروژه ایجاد کنید.</p><button className="primary-button" type="button" onClick={()=>setView('new')}>ایجاد پروژه</button></div>:<div className="mini-list">{activeProjects.map(project=><button type="button" key={project.id} onClick={()=>openProject(project.id)}><strong>{project.name}</strong><small>{project.customer_name}{project.address?` · ${project.address}`:''}</small></button>)}</div>}</section>;
}
