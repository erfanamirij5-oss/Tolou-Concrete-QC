import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SampleSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

export function ResultEntryWorkspace({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const[samples,setSamples]=useState<SampleSummary[]>([]);
  const[sampleId,setSampleId]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  async function reload(){const result=await window.tolou.listSamples(300);if(!result.ok)throw new Error(result.message);const eligible=result.data.filter(x=>x.due_at!==null&&x.state!=='approved'&&x.state!=='void');setSamples(eligible);setSampleId(current=>eligible.some(x=>x.id===current)?current:(eligible[0]?.id??''));}
  useEffect(()=>{void reload().catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری نمونه‌ها انجام نشد'));},[refreshKey]);

  const selected=samples.find(x=>x.id===sampleId);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget);setBusy(true);setMessage('');try{const testedAt=String(data.get('testedAt')??'');if(!testedAt)throw new Error('زمان آزمون را وارد کنید.');const result=await window.tolou.saveDraft({sampleId:selected.id,expectedRevision:selected.revision??0,strengthMpa:Number(data.get('strengthMpa')),testedAt,testedBy:String(data.get('testedBy')??''),reason:String(data.get('reason')??'')});if(!result.ok)throw new Error(result.message);setMessage('نتیجه به‌صورت پیش‌نویس ذخیره و برای بررسی آماده شد.');await reload();onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت نتیجه انجام نشد');}finally{setBusy(false);}}

  return <>
    <section className="workspace-intro"><p className="eyebrow">آزمون مقاومت</p><h2>ثبت نتیجه آزمون</h2><p>یک نمونه را انتخاب کنید، نتیجه را ثبت کنید و سپس آن را از بخش «بررسی و تأیید» نهایی کنید.</p></section>
    <section className="workbench glass panel--wide">
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {!samples.length?<div className="recovery-empty"><h3>نمونه آماده ثبت نتیجه وجود ندارد</h3><p>نمونه‌های دارای موعد از بخش نمونه‌برداری به این صف اضافه می‌شوند.</p></div>:<form className="workbench-form" onSubmit={submit}>
        <label>نمونه<select value={sampleId} onChange={e=>setSampleId(e.target.value)} required>{samples.map(sample=><option key={sample.id} value={sample.id}>{sample.project_name??sample.title??'نمونه آزمایشگاه'} — {sample.age_days===null?'شاهد':`${sample.age_days.toLocaleString('fa-IR')} روزه`}</option>)}</select></label>
        {selected&&<div className="history-strip"><strong>{selected.project_name??selected.title??'نمونه آزمایشگاه'}</strong><span>{selected.age_days===null?'شاهد':`${selected.age_days.toLocaleString('fa-IR')} روزه`}</span><span>موعد: {isoToPersianLocal(selected.due_at)}</span><span>{selected.state==='draft'?'پیش‌نویس موجود':'در انتظار نتیجه'}</span></div>}
        <label>مقاومت فشاری (MPa)<input name="strengthMpa" type="number" min="0" step="0.1" required/></label>
        <label>زمان آزمون (شمسی)<PersianDateTimeInput name="testedAt" required/></label>
        <label>آزمایش‌کننده<input name="testedBy" required/></label>
        {(selected?.revision??0)>0&&<label>علت اصلاح<textarea name="reason" required placeholder="علت اصلاح نتیجه قبلی"/></label>}
        <button className="primary-button workbench-submit" disabled={busy||!selected}>{busy?'در حال ذخیره…':'ذخیره پیش‌نویس نتیجه'}</button>
      </form>}
    </section>
  </>;
}
