import { useCallback, useEffect, useState } from 'react';
import type { ResultRevision, SampleSummary } from '../shared/ipc';

function stateLabel(state: SampleSummary['state']) {
  if (state === 'approved') return 'تأییدشده';
  if (state === 'draft') return 'پیش‌نویس';
  if (state === 'void') return 'باطل';
  return 'در انتظار نتیجه';
}

export function SampleResultsPanel({onChanged,refreshKey=0}:{onChanged:()=>void;refreshKey?:number}) {
  const [rows,setRows]=useState<SampleSummary[]>([]);
  const [history,setHistory]=useState<ResultRevision[]>([]);
  const [selected,setSelected]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const refresh=useCallback(async()=>{
    const result=await window.tolou.listSamples(50);
    if(!result.ok) throw new Error(result.message);
    setRows(result.data);
  },[]);

  useEffect(()=>{void refresh().catch((error)=>setMessage(error instanceof Error?error.message:'بارگذاری نمونه‌ها انجام نشد'));},[refresh,refreshKey]);
  useEffect(()=>{
    if(!selected)return;
    void window.tolou.resultHistory(selected).then((result)=>{if(result.ok)setHistory(result.data);});
  },[selected,refreshKey]);

  async function openHistory(sampleId:string){
    setSelected(sampleId); setMessage('');
    const result=await window.tolou.resultHistory(sampleId);
    if(!result.ok){setMessage(result.message);return;}
    setHistory(result.data);
  }

  async function approve(row:SampleSummary){
    if(row.state!=='draft'||!row.revision)return;
    setBusy(true);setMessage('');
    try{
      const result=await window.tolou.approveDraft({sampleId:row.id,expectedRevision:row.revision});
      if(!result.ok) throw new Error(result.message);
      setMessage(`نتیجه ${row.id} با بازنگری ${result.data.revision.toLocaleString('fa-IR')} تأیید شد.`);
      await refresh(); onChanged(); if(selected===row.id) await openHistory(row.id);
    }catch(error){setMessage(error instanceof Error?error.message:'تأیید نتیجه انجام نشد');}finally{setBusy(false);}
  }

  return <section className="panel glass panel--wide">
    <div className="panel-heading"><div><p className="eyebrow">داده زنده SQLite</p><h3>نمونه‌ها و نتایج اخیر</h3></div><span className="count-badge">{rows.length.toLocaleString('fa-IR')}</span></div>
    {message&&<div className="workbench-message" role="status">{message}</div>}
    <div className="table-wrap"><table><thead><tr><th>نمونه</th><th>سری / پروژه</th><th>سن</th><th>مقاومت</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td className="mono">{row.id}</td><td>{row.project_name??row.title??row.series_id}<small className="table-subline">{row.series_id}</small></td><td>{row.age_days===null?'شاهد':`${row.age_days.toLocaleString('fa-IR')} روز`}</td><td>{row.strength_mpa===null?'—':`${row.strength_mpa.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</td><td><span className={`status ${row.state==='approved'?'status--ok':row.state==='draft'?'status--pending':''}`}>{stateLabel(row.state)}</span></td><td><div className="row-actions"><button className="text-button" onClick={()=>void openHistory(row.id)}>تاریخچه</button>{row.state==='draft'&&<button className="primary-button mini-button" disabled={busy} onClick={()=>void approve(row)}>تأیید</button>}</div></td></tr>)}
      {!rows.length&&<tr><td colSpan={6}>هنوز نمونه‌ای ثبت نشده است.</td></tr>}
    </tbody></table></div>
    {selected&&<div className="history-strip"><strong>تاریخچه {selected}</strong>{history.map(item=><span key={item.revision}>R{item.revision.toLocaleString('fa-IR')} · {stateLabel(item.state)} · {item.strength_mpa?.toLocaleString('fa-IR')??'—'} MPa</span>)}</div>}
  </section>;
}
