import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ResultRevision, SampleSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

type Action = { mode:'correction'|'void'; row:SampleSummary } | null;

export function ReviewWorkspace({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const[rows,setRows]=useState<SampleSummary[]>([]);
  const[selected,setSelected]=useState<SampleSummary|null>(null);
  const[history,setHistory]=useState<ResultRevision[]>([]);
  const[action,setAction]=useState<Action>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  const reload=useCallback(async()=>{
    const result=await window.tolou.reviewQueue(200);
    if(!result.ok)throw new Error(result.message);
    setRows(result.data);
    setSelected(current=>current&&result.data.some(x=>x.id===current.id)?result.data.find(x=>x.id===current.id)??null:(result.data[0]??null));
  },[]);

  useEffect(()=>{void reload().catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری صف بررسی انجام نشد'));},[reload,refreshKey]);
  useEffect(()=>{if(!selected){setHistory([]);return;}void window.tolou.resultHistory(selected.id).then(r=>{if(r.ok)setHistory(r.data);});},[selected,refreshKey]);

  async function approve(){if(!selected?.revision)return;setBusy(true);setMessage('');try{const r=await window.tolou.approveDraft({sampleId:selected.id,expectedRevision:selected.revision});if(!r.ok)throw new Error(r.message);setMessage('نتیجه تأیید شد.');setSelected(null);await reload();onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'تأیید نتیجه انجام نشد');}finally{setBusy(false);}}

  async function submitAction(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!action?.row.revision)return;const f=new FormData(event.currentTarget);setBusy(true);setMessage('');try{
    if(action.mode==='void'){
      const r=await window.tolou.voidResult({sampleId:action.row.id,expectedRevision:action.row.revision,reason:String(f.get('reason')??'')});
      if(!r.ok)throw new Error(r.message);
      setMessage('نتیجه باطل شد.');
    }else{
      const testedAt=String(f.get('testedAt')??'');
      if(!testedAt)throw new Error('زمان آزمون را وارد کنید.');
      const r=await window.tolou.requestCorrection({sampleId:action.row.id,expectedRevision:action.row.revision,strengthMpa:Number(f.get('strengthMpa')),testedAt,testedBy:String(f.get('testedBy')??''),reason:String(f.get('reason')??'')});
      if(!r.ok)throw new Error(r.message);
      setMessage('نسخه اصلاحی ایجاد شد و دوباره در صف بررسی قرار گرفت.');
    }
    setAction(null);setSelected(null);await reload();onChanged?.();
  }catch(e){setMessage(e instanceof Error?e.message:'عملیات بررسی انجام نشد');}finally{setBusy(false);}}

  return <>
    <section className="workspace-intro"><p className="eyebrow">کنترل کیفیت</p><h2>بررسی و تأیید نتایج</h2><p>فقط نتایجی که نیاز به تصمیم QC دارند در این صفحه نمایش داده می‌شوند.</p></section>
    {message&&<div className="workbench-message" role="status">{message}</div>}
    {!rows.length?<section className="panel glass panel--wide"><div className="recovery-empty"><h3>نتیجه‌ای در انتظار بررسی نیست</h3><p>پس از ثبت پیش‌نویس نتیجه، آن نمونه به این صف اضافه می‌شود.</p></div></section>:<section className="review-layout panel--wide">
      <div className="review-queue glass">
        <div className="panel-heading"><div><p className="eyebrow">صف بررسی</p><h3>{rows.length.toLocaleString('fa-IR')} نتیجه</h3></div></div>
        <div className="review-queue-list">{rows.map(row=><button type="button" key={row.id} className={`review-queue-item ${selected?.id===row.id?'is-active':''}`} onClick={()=>setSelected(row)}><strong>{row.project_name??row.title??'نمونه آزمایشگاه'}</strong><span>{row.age_days===null?'شاهد':`${row.age_days.toLocaleString('fa-IR')} روزه`} · {row.strength_mpa?.toLocaleString('fa-IR',{maximumFractionDigits:2})??'—'} MPa</span><small>{isoToPersianLocal(row.tested_at)}</small></button>)}</div>
      </div>
      {selected&&<div className="review-detail glass">
        <div className="panel-heading"><div><p className="eyebrow">جزئیات نتیجه</p><h3>{selected.project_name??selected.title??'نمونه آزمایشگاه'}</h3></div><span className="count-badge">R{selected.revision?.toLocaleString('fa-IR')}</span></div>
        <div className="review-summary-grid">
          <div><span>سن نمونه</span><strong>{selected.age_days===null?'شاهد':`${selected.age_days.toLocaleString('fa-IR')} روزه`}</strong></div>
          <div><span>موعد</span><strong>{isoToPersianLocal(selected.due_at)}</strong></div>
          <div><span>مقاومت</span><strong>{selected.strength_mpa?.toLocaleString('fa-IR',{maximumFractionDigits:2})??'—'} MPa</strong></div>
          <div><span>زمان آزمون</span><strong>{isoToPersianLocal(selected.tested_at)}</strong></div>
        </div>
        {selected.reason&&<div className="review-reason"><span>علت / توضیح</span><p>{selected.reason}</p></div>}
        <div className="review-primary-actions"><button className="primary-button" disabled={busy} onClick={()=>void approve()}>تأیید نتیجه</button><button className="secondary-button" disabled={busy} onClick={()=>setAction({mode:'correction',row:selected})}>اصلاح نتیجه</button><button className="text-button danger-text" disabled={busy} onClick={()=>setAction({mode:'void',row:selected})}>ابطال</button></div>
        <div className="review-history"><h4>تاریخچه</h4>{history.length===0?<p>تاریخچه‌ای ثبت نشده است.</p>:history.map(item=><div key={item.revision}><strong>R{item.revision.toLocaleString('fa-IR')}</strong><span>{item.strength_mpa?.toLocaleString('fa-IR',{maximumFractionDigits:2})??'—'} MPa</span><small>{isoToPersianLocal(item.tested_at)} · {item.state}</small></div>)}</div>
      </div>}
    </section>}
    {action&&<section className="panel glass panel--wide"><form className="workbench-form" onSubmit={submitAction}><h3>{action.mode==='void'?'ابطال نتیجه':'اصلاح نتیجه'}</h3>{action.mode==='correction'&&<><label>مقاومت اصلاح‌شده (MPa)<input name="strengthMpa" type="number" min="0" step="0.1" defaultValue={action.row.strength_mpa??''} required/></label><label>زمان آزمون (شمسی)<PersianDateTimeInput name="testedAt" defaultIso={action.row.tested_at} required/></label><label>آزمایش‌کننده<input name="testedBy" defaultValue={action.row.tested_by??''} required/></label></>}<label>علت<textarea name="reason" required placeholder={action.mode==='void'?'علت ابطال نتیجه':'علت اصلاح نتیجه'}/></label><div className="row-actions"><button className="primary-button" disabled={busy}>{busy?'در حال ثبت…':action.mode==='void'?'تأیید ابطال':'ثبت نسخه اصلاحی'}</button><button type="button" className="secondary-button" onClick={()=>setAction(null)}>انصراف</button></div></form></section>}
  </>;
}
