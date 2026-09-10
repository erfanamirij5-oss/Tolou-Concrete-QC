import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { FreshConcreteSummary, SeriesSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

export function FreshConcreteWorkspace({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const[series,setSeries]=useState<SeriesSummary[]>([]);
  const[seriesId,setSeriesId]=useState('');
  const[current,setCurrent]=useState<FreshConcreteSummary|null>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  useEffect(()=>{void Promise.all([window.tolou.listSeries('internal'),window.tolou.listSeries('customer')]).then(([a,b])=>{if(!a.ok)throw new Error(a.message);if(!b.ok)throw new Error(b.message);const all=[...a.data,...b.data].sort((x,y)=>y.sampled_at.localeCompare(x.sampled_at));setSeries(all);setSeriesId(cur=>all.some(x=>x.id===cur)?cur:(all[0]?.id??''));}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری سری‌ها انجام نشد'));},[refreshKey]);
  useEffect(()=>{if(!seriesId){setCurrent(null);return;}void window.tolou.getFreshConcrete(seriesId).then(r=>{if(!r.ok)throw new Error(r.message);setCurrent(r.data);}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری بتن تازه انجام نشد'));},[seriesId,refreshKey]);

  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setMessage('');try{const measuredAt=String(data.get('measuredAt')??'');if(!measuredAt)throw new Error('زمان اندازه‌گیری را وارد کنید.');const slump=String(data.get('slumpMm')??'').trim();const temp=String(data.get('temperatureC')??'').trim();const result=await window.tolou.saveFreshConcrete({seriesId,expectedRevision:current?.revision??0,slumpMm:slump?Number(slump):null,concreteTemperatureC:temp?Number(temp):null,measuredAt,reason:String(data.get('reason')??'')});if(!result.ok)throw new Error(result.message);const refreshed=await window.tolou.getFreshConcrete(seriesId);if(!refreshed.ok)throw new Error(refreshed.message);setCurrent(refreshed.data);setMessage('اطلاعات بتن تازه ذخیره شد.');onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت بتن تازه انجام نشد');}finally{setBusy(false);}}

  const selected=series.find(x=>x.id===seriesId);
  return <>
    <section className="workspace-intro"><p className="eyebrow">عملیات آزمایشگاه</p><h2>آزمایش بتن تازه</h2><p>اسلامپ و دمای بتن را برای سری نمونه انتخاب‌شده ثبت یا اصلاح کنید. این صفحه هیچ عملیات مقاومت فشاری ندارد.</p></section>
    <section className="workbench glass panel--wide">
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {!series.length?<div className="recovery-empty"><h3>هنوز نمونه‌برداری ثبت نشده است</h3><p>ابتدا از بخش «نمونه‌برداری» یک سری ایجاد کنید.</p></div>:<form key={`${seriesId}-${current?.revision??0}`} className="workbench-form" onSubmit={submit}>
        <label>سری نمونه<select value={seriesId} onChange={e=>setSeriesId(e.target.value)} required>{series.map(item=><option key={item.id} value={item.id}>{item.kind==='customer'?'پروژه مشتری':item.title??'کنترل داخلی'} — {isoToPersianLocal(item.sampled_at)}</option>)}</select></label>
        {selected&&<div className="history-strip"><strong>نمونه‌برداری</strong><span>{isoToPersianLocal(selected.sampled_at)}</span></div>}
        <label>اسلامپ (mm)<input name="slumpMm" type="number" min="0" step="1" defaultValue={current?.slump_mm??''}/></label>
        <label>دمای بتن (°C)<input name="temperatureC" type="number" step="0.1" defaultValue={current?.concrete_temperature_c??''}/></label>
        <label>زمان اندازه‌گیری (شمسی)<PersianDateTimeInput name="measuredAt" defaultIso={current?.measured_at??selected?.sampled_at??null} required/></label>
        {current&&<label>علت اصلاح<textarea name="reason" required placeholder="علت اصلاح داده قبلی"/></label>}
        <button className="primary-button workbench-submit" disabled={busy||!seriesId}>{busy?'در حال ذخیره…':current?'ثبت اصلاح بتن تازه':'ثبت بتن تازه'}</button>
      </form>}
    </section>
  </>;
}
