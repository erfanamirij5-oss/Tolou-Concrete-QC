import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { LaboratoryKind, PourSummary, ProjectSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

const nextSeriesId=()=>`TL-${Date.now().toString(36).toUpperCase()}`;

export function SamplingWorkspace({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const[kind,setKind]=useState<LaboratoryKind>('customer');
  const[projects,setProjects]=useState<ProjectSummary[]>([]);
  const[pours,setPours]=useState<PourSummary[]>([]);
  const[projectId,setProjectId]=useState('');
  const[pourId,setPourId]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[created,setCreated]=useState<{id:string;samples:number}|null>(null);

  useEffect(()=>{void window.tolou.listProjects().then(r=>{if(!r.ok)throw new Error(r.message);const active=r.data.filter(x=>x.archived===0);setProjects(active);setProjectId(current=>active.some(p=>p.id===current)?current:(active[0]?.id??''));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری پروژه‌ها انجام نشد'));},[refreshKey]);
  useEffect(()=>{if(kind!=='customer'||!projectId){setPours([]);setPourId('');return;}void window.tolou.listPours(projectId).then(r=>{if(!r.ok)throw new Error(r.message);setPours(r.data);setPourId(current=>r.data.some(p=>p.id===current)?current:(r.data[0]?.id??''));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری بتن‌ریزی‌ها انجام نشد'));},[kind,projectId,refreshKey]);

  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');setCreated(null);try{const sampledAt=String(data.get('sampledAt')??'');if(!sampledAt)throw new Error('تاریخ و ساعت نمونه‌برداری را وارد کنید.');const result=await window.tolou.createSeries({id:nextSeriesId(),kind,projectId:kind==='customer'?projectId:undefined,pourId:kind==='customer'?pourId:undefined,title:kind==='internal'?String(data.get('title')??''):undefined,purpose:kind==='internal'?String(data.get('purpose')??''):undefined,sampledAt,samplerName:String(data.get('samplerName')??'')});if(!result.ok)throw new Error(result.message);setCreated({id:result.data.id,samples:result.data.samples.length});setMessage('نمونه‌برداری ثبت شد و برنامه ۷ و ۲۸ روزه به‌صورت خودکار ساخته شد.');form.reset();onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت نمونه‌برداری انجام نشد');}finally{setBusy(false);}}

  return <>
    <section className="workspace-intro"><p className="eyebrow">عملیات آزمایشگاه</p><h2>ثبت نمونه‌برداری</h2><p>فقط اطلاعات نمونه‌برداری را ثبت کنید. موعد نمونه‌های ۷ و ۲۸ روزه توسط سیستم محاسبه می‌شود.</p></section>
    <section className="workbench glass panel--wide">
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {created&&<div className="history-strip"><strong>ثبت موفق</strong><span>{created.samples.toLocaleString('fa-IR')} نمونه ایجاد شد</span><span>سری {created.id}</span></div>}
      <form className="workbench-form" onSubmit={submit}>
        <div className="segmented kind-switch"><button type="button" className={kind==='customer'?'is-active':''} onClick={()=>setKind('customer')}>پروژه مشتری</button><button type="button" className={kind==='internal'?'is-active':''} onClick={()=>setKind('internal')}>کنترل داخلی</button></div>
        {kind==='customer'?<><label>پروژه<select value={projectId} onChange={e=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={e=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map(pour=><option key={pour.id} value={pour.id}>{isoToPersianLocal(pour.occurred_at)}</option>)}</select></label></>:<><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required/></label><label>هدف<textarea name="purpose" placeholder="هدف آزمایش داخلی" required/></label></>}
        <label>تاریخ و ساعت نمونه‌برداری (شمسی)<PersianDateTimeInput name="sampledAt" required/></label>
        <label>نام نمونه‌بردار<input name="samplerName" required/></label>
        <button className="primary-button workbench-submit" disabled={busy||(kind==='customer'&&(!projectId||!pourId))}>{busy?'در حال ثبت…':'ثبت نمونه‌برداری و ایجاد نمونه‌ها'}</button>
      </form>
    </section>
  </>;
}
