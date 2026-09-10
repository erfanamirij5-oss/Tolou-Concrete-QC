import { useEffect, useMemo, useState } from 'react';
import type { SampleSummary } from '../shared/ipc';
import { isoToPersianLocal } from './jalali';

function statusLabel(row:SampleSummary){if(row.state==='approved')return['تأییدشده','done'];if(row.state==='draft')return['منتظر بررسی','warning'];if(row.state==='void')return['باطل','overdue'];if(row.due_at&&Date.parse(row.due_at)<Date.now())return['موعد گذشته','overdue'];if(row.due_at&&Date.parse(row.due_at)-Date.now()<=48*3600_000)return['تا ۴۸ ساعت','warning'];return['برنامه‌ریزی‌شده','scheduled'];}

export function SpecimenListWorkspace({refreshKey=0,onOpenResult}:{refreshKey?:number;onOpenResult?:()=>void}){
  const[rows,setRows]=useState<SampleSummary[]>([]);
  const[message,setMessage]=useState('');
  const[query,setQuery]=useState('');
  useEffect(()=>{void window.tolou.listSamples(500).then(r=>{if(!r.ok)throw new Error(r.message);setRows(r.data);}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری نمونه‌ها انجام نشد'));},[refreshKey]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return rows;return rows.filter(r=>`${r.project_name??''} ${r.title??''} ${r.series_id} ${r.id}`.toLowerCase().includes(q));},[rows,query]);
  return <>
    <section className="workspace-intro"><p className="eyebrow">برنامه آزمایشگاه</p><h2>نمونه‌ها</h2><p>تمام نمونه‌های ۷ روزه، ۲۸ روزه و شاهد را در یک فهرست ساده ببینید. عملیات ثبت نتیجه در صفحه جداگانه انجام می‌شود.</p></section>
    <section className="panel glass specimen-list">
      <div className="specimen-list-head"><div><p className="eyebrow">فهرست نمونه‌ها</p><h3>{filtered.length.toLocaleString('fa-IR')} نمونه</h3></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی پروژه یا نمونه"/></div>
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {!rows.length?<div className="recovery-empty"><h3>هنوز نمونه‌ای ثبت نشده است</h3><p>ابتدا از بخش «نمونه‌برداری» یک سری نمونه ایجاد کنید.</p></div>:<div className="table-wrap"><table><thead><tr><th>پروژه / عنوان</th><th>سن</th><th>موعد</th><th>مقاومت</th><th>وضعیت</th><th></th></tr></thead><tbody>{filtered.map(row=>{const[s,tone]=statusLabel(row);return <tr key={row.id}><td>{row.project_name??row.title??'نمونه آزمایشگاه'}<small className="table-subline">{row.series_id}</small></td><td>{row.age_days===null?'شاهد':`${row.age_days.toLocaleString('fa-IR')} روزه`}</td><td>{row.due_at?isoToPersianLocal(row.due_at):'بدون موعد'}</td><td>{row.strength_mpa==null?'—':`${row.strength_mpa.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</td><td><span className={`specimen-status specimen-status--${tone}`}>{s}</span></td><td>{row.state!=='approved'&&row.state!=='void'&&row.due_at&&<button className="text-button" onClick={onOpenResult}>ثبت نتیجه</button>}</td></tr>})}</tbody></table></div>}
    </section>
  </>;
}
