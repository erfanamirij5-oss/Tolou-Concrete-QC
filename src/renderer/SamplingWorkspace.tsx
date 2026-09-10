import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { CreatedSample, LaboratoryKind, PourSummary, ProjectSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

const nextSeriesId=()=>`TL-${Date.now().toString(36).toUpperCase()}`;
const nextComparisonId=()=>`CMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
type CreatedState={id:string;samples:CreatedSample[]};
type PartyType='laboratory'|'person'|'consultant'|'client'|'supervisor'|'other';
type TraceabilityBridge={addComparisonParty:(input:{id:string;seriesId:string;partyType:PartyType;partyName:string;laboratoryName?:string;samplerName?:string;externalReference?:string;notes?:string})=>Promise<{ok:boolean;data?:unknown;message?:string}>};
const traceability=()=>((window as unknown as {tolouTraceability:TraceabilityBridge}).tolouTraceability);

export function SamplingWorkspace({onChanged,refreshKey=0,initialProjectId='',onOpenSchedule}:{onChanged?:()=>void;refreshKey?:number;initialProjectId?:string;onOpenSchedule?:()=>void}){
  const[kind,setKind]=useState<LaboratoryKind|null>(initialProjectId?'customer':null);
  const[projects,setProjects]=useState<ProjectSummary[]>([]);
  const[pours,setPours]=useState<PourSummary[]>([]);
  const[projectId,setProjectId]=useState(initialProjectId);
  const[pourId,setPourId]=useState('');
  const[comparisonEnabled,setComparisonEnabled]=useState(false);
  const[partyType,setPartyType]=useState<PartyType>('laboratory');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[created,setCreated]=useState<CreatedState|null>(null);

  useEffect(()=>{if(initialProjectId)setKind('customer');},[initialProjectId]);
  useEffect(()=>{void window.tolou.listProjects().then(r=>{if(!r.ok)throw new Error(r.message);const active=r.data.filter(x=>x.archived===0);setProjects(active);setProjectId(current=>active.some(p=>p.id===current)?current:(initialProjectId&&active.some(p=>p.id===initialProjectId)?initialProjectId:(active[0]?.id??'')));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری پروژه‌ها انجام نشد'));},[refreshKey,initialProjectId]);
  useEffect(()=>{if(kind!=='customer'||!projectId){setPours([]);setPourId('');return;}void window.tolou.listPours(projectId).then(r=>{if(!r.ok)throw new Error(r.message);setPours(r.data);setPourId(current=>r.data.some(p=>p.id===current)?current:(r.data[0]?.id??''));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری بتن‌ریزی‌ها انجام نشد'));},[kind,projectId,refreshKey]);

  function chooseKind(next:LaboratoryKind){setKind(next);setCreated(null);setMessage('');if(next==='internal'){setProjectId('');setPourId('');}}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!kind)return;const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');setCreated(null);try{
    const sampledAt=String(data.get('sampledAt')??'');if(!sampledAt)throw new Error('تاریخ و ساعت نمونه‌برداری را وارد کنید.');
    const result=await window.tolou.createSeries({id:nextSeriesId(),kind,projectId:kind==='customer'?projectId:undefined,pourId:kind==='customer'?pourId:undefined,title:kind==='internal'?String(data.get('title')??''):undefined,purpose:kind==='internal'?String(data.get('purpose')??''):undefined,sampledAt,samplerName:String(data.get('samplerName')??'')});
    if(!result.ok)throw new Error(result.message);
    let comparisonSaved=false;
    if(comparisonEnabled){
      const partyName=String(data.get('comparisonPartyName')??'').trim();if(!partyName)throw new Error('نام طرف مقایسه‌ای را وارد کنید.');
      const comparison=await traceability().addComparisonParty({id:nextComparisonId(),seriesId:result.data.id,partyType,partyName,laboratoryName:String(data.get('comparisonLaboratoryName')??''),samplerName:String(data.get('comparisonSamplerName')??''),externalReference:String(data.get('comparisonReference')??''),notes:String(data.get('comparisonNotes')??'')});
      if(!comparison.ok)throw new Error(comparison.message||'ثبت طرف مقایسه‌ای انجام نشد');comparisonSaved=true;
    }
    setCreated({id:result.data.id,samples:result.data.samples});
    setMessage(comparisonSaved?'نمونه‌برداری و طرف مقایسه‌ای ثبت شدند. موعدهای ۷ و ۲۸ روزه ساخته شد.':'نمونه‌برداری ثبت شد. موعدهای ۷ و ۲۸ روزه در برنامه آزمایشگاه قرار گرفتند.');
    form.reset();setComparisonEnabled(false);setPartyType('laboratory');onChanged?.();
  }catch(e){setMessage(e instanceof Error?e.message:'ثبت نمونه‌برداری انجام نشد');}finally{setBusy(false);}}

  const seven=created?.samples.filter(sample=>sample.ageDays===7)??[];
  const twentyEight=created?.samples.filter(sample=>sample.ageDays===28)??[];
  const witness=created?.samples.filter(sample=>sample.ageDays===null)??[];

  return <>
    <section className="workspace-intro"><p className="eyebrow">عملیات آزمایشگاه</p><h2>ثبت نمونه‌برداری</h2><p>ابتدا نوع نمونه‌برداری را مشخص کنید. اطلاعات مقایسه‌ای از همان لحظه نمونه‌برداری به نوبت متصل می‌شود تا بعداً نتیجه طرف مقابل قابل ردیابی باشد.</p></section>
    <section className="workbench glass panel--wide">
      {!kind&&<div className="sampling-entry-cards" aria-label="نوع نمونه‌برداری">
        <button type="button" className="sampling-entry-card" onClick={()=>chooseKind('internal')}><span className="sampling-entry-index">01</span><strong>ثبت نمونه‌برداری داخلی</strong><p>کنترل تولید، آزمون‌های داخلی و نمونه‌هایی که مستقیماً توسط مجموعه شما اخذ می‌شوند.</p><span className="sampling-entry-cta">شروع نمونه‌برداری داخلی ←</span></button>
        <button type="button" className="sampling-entry-card" onClick={()=>chooseKind('customer')}><span className="sampling-entry-index">02</span><strong>ثبت نمونه‌برداری از مشتریان</strong><p>نمونه‌برداری مرتبط با پروژه، بتن‌ریزی و پرونده کنترل کیفیت مشتری.</p><span className="sampling-entry-cta">شروع نمونه‌برداری مشتری ←</span></button>
      </div>}
      {kind&&<>
        <div className="sampling-path-head"><div><p className="eyebrow">مسیر انتخاب‌شده</p><h3>{kind==='internal'?'نمونه‌برداری داخلی':'نمونه‌برداری مشتری'}</h3></div><button type="button" className="text-button" onClick={()=>setKind(null)}>تغییر نوع نمونه‌برداری</button></div>
        {message&&<div className="workbench-message" role="status">{message}</div>}
        {created&&<div className="sampling-success">
          <div className="sampling-success-head"><div><p className="eyebrow">برنامه ایجاد شد</p><h3>نمونه‌برداری با موفقیت ثبت شد</h3></div><button type="button" className="primary-button" onClick={onOpenSchedule}>مشاهده برنامه نمونه‌ها</button></div>
          <div className="sampling-schedule-grid"><div><span>۷ روزه</span><strong>{seven.length.toLocaleString('fa-IR')} نمونه</strong><small>{seven[0]?.dueAt?`موعد: ${isoToPersianLocal(seven[0].dueAt)}`:'—'}</small></div><div><span>۲۸ روزه</span><strong>{twentyEight.length.toLocaleString('fa-IR')} نمونه</strong><small>{twentyEight[0]?.dueAt?`موعد: ${isoToPersianLocal(twentyEight[0].dueAt)}`:'—'}</small></div><div><span>شاهد / ذخیره</span><strong>{witness.length.toLocaleString('fa-IR')} نمونه</strong><small>بدون موعد خودکار</small></div></div>
        </div>}
        <form className="workbench-form" onSubmit={submit}>
          {kind==='customer'?<><label>پروژه<select value={projectId} onChange={e=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={e=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map(pour=><option key={pour.id} value={pour.id}>{isoToPersianLocal(pour.occurred_at)}</option>)}</select></label></>:<><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required/></label><label>هدف<textarea name="purpose" placeholder="هدف آزمایش داخلی" required/></label></>}
          <label>تاریخ و ساعت نمونه‌برداری (شمسی)<PersianDateTimeInput name="sampledAt" required/></label><label>نام نمونه‌بردار<input name="samplerName" required/></label>
          <div className="sampling-option-card sampling-option-card--wide"><label className="sampling-toggle"><input type="checkbox" checked={comparisonEnabled} onChange={e=>setComparisonEnabled(e.target.checked)}/><span><strong>نمونه متناظر / موازی اخذ شده است</strong><small>اگر شخص، مشاور، کارفرما یا آزمایشگاه دیگری هم‌زمان نمونه گرفته، این گزینه را فعال کنید.</small></span></label></div>
          {comparisonEnabled&&<div className="sampling-comparison-fields">
            <label>نوع طرف مقایسه‌ای<select value={partyType} onChange={e=>setPartyType(e.target.value as PartyType)}><option value="laboratory">آزمایشگاه</option><option value="person">شخص</option><option value="consultant">مشاور</option><option value="client">کارفرما / مشتری</option><option value="supervisor">ناظر</option><option value="other">سایر</option></select></label>
            <label>نام طرف مقایسه‌ای<input name="comparisonPartyName" required={comparisonEnabled} placeholder="نام شخص یا مجموعه"/></label>
            <label>نام آزمایشگاه<input name="comparisonLaboratoryName" placeholder="در صورت وجود"/></label>
            <label>نمونه‌بردار طرف مقابل<input name="comparisonSamplerName" placeholder="در صورت مشخص بودن"/></label>
            <label>شماره گزارش / مرجع خارجی<input name="comparisonReference" placeholder="اختیاری؛ بعداً هم قابل تکمیل است"/></label>
            <label>توضیحات<textarea name="comparisonNotes" placeholder="شرایط یا توضیحات نمونه موازی"/></label>
          </div>}
          <div className="sampling-next-note"><strong>مرحله بعدی</strong><span>پس از تثبیت این بخش، «طرح مخلوط این نوبت» و سپس ثبت نتایج طرف مقایسه‌ای به همین نوبت متصل می‌شود.</span></div>
          <button className="primary-button workbench-submit" disabled={busy||(kind==='customer'&&(!projectId||!pourId))}>{busy?'در حال ثبت…':'ثبت نمونه‌برداری و ساخت برنامه آزمایش'}</button>
        </form>
      </>}
    </section>
  </>;
}
