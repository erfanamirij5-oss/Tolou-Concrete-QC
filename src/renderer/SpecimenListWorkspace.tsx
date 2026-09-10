import { useEffect, useMemo, useState } from 'react';
import type { SampleSummary } from '../shared/ipc';
import { isoToPersianLocal } from './jalali';

type ScheduleTone='scheduled'|'warning'|'overdue'|'done';
type Group={key:string;project:string;ageDays:number|null;rows:SampleSummary[];pending:SampleSummary[];dueAt:string|null;tone:ScheduleTone;label:string};

function pendingTone(rows:SampleSummary[]):[string,ScheduleTone]{
  const pending=rows.filter(row=>row.state!=='approved'&&row.state!=='void');
  if(!pending.length)return['تکمیل‌شده','done'];
  const dated=pending.filter(row=>row.due_at);
  if(dated.some(row=>Date.parse(row.due_at!)<Date.now()))return['موعد گذشته','overdue'];
  if(dated.some(row=>Date.parse(row.due_at!)-Date.now()<=48*3600_000))return['تا ۴۸ ساعت','warning'];
  return['برنامه‌ریزی‌شده','scheduled'];
}

export function SpecimenListWorkspace({refreshKey=0,onOpenResult}:{refreshKey?:number;onOpenResult?:()=>void}){
  const[rows,setRows]=useState<SampleSummary[]>([]);
  const[message,setMessage]=useState('');
  const[query,setQuery]=useState('');
  const[status,setStatus]=useState<'all'|'attention'|'overdue'|'done'>('all');
  useEffect(()=>{void window.tolou.listSamples(500).then(r=>{if(!r.ok)throw new Error(r.message);setRows(r.data);}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری نمونه‌ها انجام نشد'));},[refreshKey]);

  const groups=useMemo(()=>{
    const map=new Map<string,SampleSummary[]>();
    for(const row of rows){const project=row.project_name??row.title??'کنترل داخلی';const key=`${row.project_id??row.title??row.series_id}|${row.age_days??'witness'}`;map.set(key,[...(map.get(key)??[]),row]);}
    return Array.from(map.entries()).map(([key,items]):Group=>{
      const pending=items.filter(row=>row.state!=='approved'&&row.state!=='void');
      const dueDates=pending.map(row=>row.due_at).filter((x):x is string=>Boolean(x)).sort();
      const[label,tone]=pendingTone(items);
      return{key,project:items[0].project_name??items[0].title??'کنترل داخلی',ageDays:items[0].age_days,rows:items,pending,dueAt:dueDates[0]??null,tone,label};
    }).sort((a,b)=>(a.dueAt??'9999').localeCompare(b.dueAt??'9999'));
  },[rows]);

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return groups.filter(group=>{
    if(q&&!`${group.project} ${group.ageDays??'شاهد'}`.toLowerCase().includes(q))return false;
    if(status==='attention'&&!['warning','overdue'].includes(group.tone))return false;
    if(status==='overdue'&&group.tone!=='overdue')return false;
    if(status==='done'&&group.tone!=='done')return false;
    return true;
  });},[groups,query,status]);

  const attention=groups.filter(group=>group.tone==='warning'||group.tone==='overdue').length;
  return <>
    <section className="workspace-intro"><p className="eyebrow">برنامه آزمایشگاه</p><h2>برنامه نمونه‌ها بر اساس پروژه</h2><p>به‌جای نمایش تک‌تک قالب‌ها، برنامه کاری بر اساس پروژه و سن آزمون گروه‌بندی شده است؛ جزئیات نمونه‌ها هنگام ثبت نتیجه در دسترس است.</p></section>
    <section className="panel glass specimen-list">
      <div className="specimen-list-head"><div><p className="eyebrow">برنامه آزمون</p><h3>{filtered.length.toLocaleString('fa-IR')} گروه کاری</h3><small>{attention.toLocaleString('fa-IR')} گروه نیازمند توجه</small></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی پروژه یا کنترل داخلی"/></div>
      <div className="result-stepper" aria-label="فیلتر برنامه نمونه‌ها"><button type="button" className={status==='all'?'is-active':''} onClick={()=>setStatus('all')}>همه</button><button type="button" className={status==='attention'?'is-active':''} onClick={()=>setStatus('attention')}>نیازمند توجه</button><button type="button" className={status==='overdue'?'is-active':''} onClick={()=>setStatus('overdue')}>عقب‌افتاده</button><button type="button" className={status==='done'?'is-active':''} onClick={()=>setStatus('done')}>تکمیل‌شده</button></div>
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {!rows.length?<div className="recovery-empty"><h3>هنوز نمونه‌ای ثبت نشده است</h3><p>ابتدا از بخش «نمونه‌برداری» یک سری نمونه ایجاد کنید.</p></div>:!filtered.length?<div className="recovery-empty"><h3>موردی با این فیلتر پیدا نشد</h3><p>فیلتر یا عبارت جست‌وجو را تغییر دهید.</p></div>:<div className="table-wrap"><table><thead><tr><th>پروژه / کنترل</th><th>برنامه آزمون</th><th>موعد بعدی</th><th>وضعیت نمونه‌ها</th><th>وضعیت</th><th></th></tr></thead><tbody>{filtered.map(group=><tr key={group.key}><td><strong>{group.project}</strong><small className="table-subline">{group.rows[0].kind==='internal'?'کنترل داخلی':'پروژه مشتری'}</small></td><td>{group.ageDays===null?'نمونه شاهد':`نمونه‌های ${group.ageDays.toLocaleString('fa-IR')} روزه`}</td><td>{group.dueAt?isoToPersianLocal(group.dueAt):'بدون موعد'}</td><td>{group.pending.length?`${group.pending.length.toLocaleString('fa-IR')} از ${group.rows.length.toLocaleString('fa-IR')} نمونه باقی‌مانده`:`${group.rows.length.toLocaleString('fa-IR')} نمونه تکمیل‌شده`}</td><td><span className={`specimen-status specimen-status--${group.tone}`}>{group.label}</span></td><td>{group.pending.some(row=>row.due_at)&&<button className="text-button" onClick={onOpenResult}>ثبت نتیجه</button>}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
