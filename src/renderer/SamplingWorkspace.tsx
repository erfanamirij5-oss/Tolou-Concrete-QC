import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { CreatedSample, LaboratoryKind, PourSummary, ProjectSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

const nextSeriesId=()=>`TL-${Date.now().toString(36).toUpperCase()}`;

type CreatedState={id:string;samples:CreatedSample[]};

export function SamplingWorkspace({onChanged,refreshKey=0,initialProjectId='',onOpenSchedule}:{onChanged?:()=>void;refreshKey?:number;initialProjectId?:string;onOpenSchedule?:()=>void}){
  const[kind,setKind]=useState<LaboratoryKind>('customer');
  const[projects,setProjects]=useState<ProjectSummary[]>([]);
  const[pours,setPours]=useState<PourSummary[]>([]);
  const[projectId,setProjectId]=useState(initialProjectId);
  const[pourId,setPourId]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[created,setCreated]=useState<CreatedState|null>(null);

  useEffect(()=>{void window.tolou.listProjects().then(r=>{if(!r.ok)throw new Error(r.message);const active=r.data.filter(x=>x.archived===0);setProjects(active);setProjectId(current=>active.some(p=>p.id===current)?current:(initialProjectId&&active.some(p=>p.id===initialProjectId)?initialProjectId:(active[0]?.id??'')));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری پروژه‌ها انجام نشد'));},[refreshKey,initialProjectId]);
  useEffect(()=>{if(kind!=='customer'||!projectId){setPours([]);setPourId('');return;}void window.tolou.listPours(projectId).then(r=>{if(!r.ok)throw new Error(r.message);setPours(r.data);setPourId(current=>r.data.some(p=>p.id===current)?current:(r.data[0]?.id??''));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری بتن‌ریزی‌ها انجام نشد'));},[kind,projectId,refreshKey]);

  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');setCreated(null);try{const sampledAt=String(data.get('sampledAt')??'');if(!sampledAt)throw new Error('تاریخ و ساعت نمونه‌برداری را وارد کنید.');const result=await window.tolou.createSeries({id:nextSeriesId(),kind,projectId:kind==='customer'?projectId:undefined,pourId:kind==='customer'?pourId:undefined,title:kind==='internal'?String(data.get('title')??''):undefined,purpose:kind==='internal'?String(data.get('purpose')??''):undefined,sampledAt,samplerName:String(data.get('samplerName')??'')});if(!result.ok)throw new Error(result.message);setCreated({id:result.data.id,samples:result.data.samples});setMessage('نمونه‌برداری ثبت شد. موعدهای ۷ و ۲۸ روزه در برنامه آزمایشگاه قرار گرفتند.');form.reset();onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت نمونه‌برداری انجام نشد');}finally{setBusy(false);}}

  const seven=created?.samples.filter(sample=>sample.ageDays===7)??[];
  const twentyEight=created?.samples.filter(sample=>sample.ageDays===28)??[];
  const witness=created?.samples.filter(sample=>sample.ageDays===null)??[];

  return <>
    <section className="workspace-intro"><p className="eyebrow">عملیات آزمایشگاه</p><h2>ثبت نمونه‌برداری</h2><p>نمونه را امروز ثبت کنید؛ نرم‌افزار موعدهای آزمایش را محاسبه می‌کند و در زمان مناسب برای ثبت نتیجه یادآوری خواهد کرد.</p></section>
    <section className="workbench glass panel--wide">
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {created&&<div className="sampling-success">
        <div className="sampling-success-head"><div><p className="eyebrow">برنامه ایجاد شد</p><h3>نمونه‌برداری با موفقیت ثبت شد</h3></div><button type="button" className="primary-button" onClick={onOpenSchedule}>مشاهده برنامه نمونه‌ها</button></div>
        <div className="sampling-schedule-grid">
          <div><span>۷ روزه</span><strong>{seven.length.toLocaleString('fa-IR')} نمونه</strong><small>{seven[0]?.dueAt?`موعد: ${isoToPersianLocal(seven[0].dueAt)}`:'—'}</small></div>
          <div><span>۲۸ روزه</span><strong>{twentyEight.length.toLocaleString('fa-IR')} نمونه</strong><small>{twentyEight[0]?.dueAt?`موعد: ${isoToPersianLocal(twentyEight[0].dueAt)}`:'—'}</small></div>
          <div><span>شاهد / ذخیره</span><strong>{witness.length.toLocaleString('fa-IR')} نمونه</strong><small>بدون موعد خودکار</small></div>
        </div>
        <p className="form-help">در موعد هر گروه، از داشبورد یا بخش «نمونه‌ها» وارد ثبت نتیجه شوید. تا قبل از موعد، نمونه فقط در برنامه آینده نمایش داده می‌شود.</p>
      </div>}
      <form className="workbench-form" onSubmit={submit}>
        <div className="segmented kind-switch"><button type="button" className={kind==='customer'?'is-active':''} onClick={()=>setKind('customer')}>پروژه مشتری</button><button type="button" className={kind==='internal'?'is-active':''} onClick={()=>setKind('internal')}>کنترل داخلی</button></div>
        {kind==='customer'?<><label>پروژه<select value={projectId} onChange={e=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={e=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map(pour=><option key={pour.id} value={pour.id}>{isoToPersianLocal(pour.occurred_at)}</option>)}</select></label></>:<><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required/></label><label>هدف<textarea name="purpose" placeholder="هدف آزمایش داخلی" required/></label></>}
        <label>تاریخ و ساعت نمونه‌برداری (شمسی)<PersianDateTimeInput name="sampledAt" required/></label>
        <label>نام نمونه‌بردار<input name="samplerName" required/></label>
        <button className="primary-button workbench-submit" disabled={busy||(kind==='customer'&&(!projectId||!pourId))}>{busy?'در حال ثبت…':'ثبت نمونه‌برداری و ساخت برنامه آزمایش'}</button>
      </form>
    </section>
  </>;
}
