import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ResultRevision, SampleSummary, WitnessScheduleRevision } from '../shared/ipc';

function stateLabel(state: SampleSummary['state']) {
  if (state === 'approved') return 'تأییدشده';
  if (state === 'draft') return 'پیش‌نویس';
  if (state === 'void') return 'باطل';
  return 'در انتظار نتیجه';
}
function toLocalInput(iso:string|null){if(!iso)return '';const d=new Date(iso);const local=new Date(d.getTime()-d.getTimezoneOffset()*60_000);return local.toISOString().slice(0,16);}
function toIso(local:string){const d=new Date(local);if(!Number.isFinite(d.getTime()))throw new Error('زمان معتبر نیست');return d.toISOString();}
function persianDate(iso:string|null){if(!iso)return 'بدون موعد';return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}

type ActionState={mode:'correction'|'void';row:SampleSummary}|null;
type WitnessAction=SampleSummary|null;

export function SampleResultsPanel({onChanged,refreshKey=0}:{onChanged:()=>void;refreshKey?:number}) {
  const [rows,setRows]=useState<SampleSummary[]>([]);
  const [reviewRows,setReviewRows]=useState<SampleSummary[]>([]);
  const [history,setHistory]=useState<ResultRevision[]>([]);
  const [witnessHistory,setWitnessHistory]=useState<WitnessScheduleRevision[]>([]);
  const [selected,setSelected]=useState('');
  const [selectedWitness,setSelectedWitness]=useState('');
  const [action,setAction]=useState<ActionState>(null);
  const [witnessAction,setWitnessAction]=useState<WitnessAction>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const refresh=useCallback(async()=>{
    const [samples,review]=await Promise.all([window.tolou.listSamples(50),window.tolou.reviewQueue(100)]);
    if(!samples.ok) throw new Error(samples.message); if(!review.ok) throw new Error(review.message);
    setRows(samples.data); setReviewRows(review.data);
  },[]);

  useEffect(()=>{void refresh().catch((error)=>setMessage(error instanceof Error?error.message:'بارگذاری نمونه‌ها انجام نشد'));},[refresh,refreshKey]);
  useEffect(()=>{if(!selected)return;void window.tolou.resultHistory(selected).then((result)=>{if(result.ok)setHistory(result.data);});},[selected,refreshKey]);
  useEffect(()=>{if(!selectedWitness)return;void window.tolou.witnessScheduleHistory(selectedWitness).then((result)=>{if(result.ok)setWitnessHistory(result.data);});},[selectedWitness,refreshKey]);

  async function openHistory(sampleId:string){setSelected(sampleId);setMessage('');const result=await window.tolou.resultHistory(sampleId);if(!result.ok){setMessage(result.message);return;}setHistory(result.data);}
  async function openWitnessHistory(sampleId:string){setSelectedWitness(sampleId);setMessage('');const result=await window.tolou.witnessScheduleHistory(sampleId);if(!result.ok){setMessage(result.message);return;}setWitnessHistory(result.data);}
  async function approve(row:SampleSummary){if(row.state!=='draft'||!row.revision)return;setBusy(true);setMessage('');try{const result=await window.tolou.approveDraft({sampleId:row.id,expectedRevision:row.revision});if(!result.ok)throw new Error(result.message);setMessage(`نتیجه ${row.id} با بازنگری ${result.data.revision.toLocaleString('fa-IR')} تأیید شد.`);await refresh();onChanged();if(selected===row.id)await openHistory(row.id);}catch(error){setMessage(error instanceof Error?error.message:'تأیید نتیجه انجام نشد');}finally{setBusy(false);}}
  async function submitAction(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!action?.row.revision)return;setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);if(action.mode==='void'){const result=await window.tolou.voidResult({sampleId:action.row.id,expectedRevision:action.row.revision,reason:String(f.get('reason')??'')});if(!result.ok)throw new Error(result.message);setMessage(`نتیجه ${action.row.id} با بازنگری ${result.data.revision.toLocaleString('fa-IR')} باطل شد.`);}else{const result=await window.tolou.requestCorrection({sampleId:action.row.id,expectedRevision:action.row.revision,strengthMpa:Number(f.get('strength')),testedAt:toIso(String(f.get('testedAt')??'')),testedBy:String(f.get('testedBy')??''),reason:String(f.get('reason')??'')});if(!result.ok)throw new Error(result.message);setMessage(`اصلاح ${action.row.id} به صف Review بازگشت.`);}setAction(null);await refresh();onChanged();if(selected===action.row.id)await openHistory(action.row.id);}catch(error){setMessage(error instanceof Error?error.message:'عملیات نتیجه انجام نشد');}finally{setBusy(false);}}
  async function submitWitness(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!witnessAction)return;setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);const result=await window.tolou.scheduleWitness({sampleId:witnessAction.id,expectedRevision:witnessAction.witness_schedule_revision??0,dueAt:toIso(String(f.get('dueAt')??'')),reason:String(f.get('reason')??'')});if(!result.ok)throw new Error(result.message);setMessage(`موعد نمونه شاهد ${witnessAction.id} با بازنگری ${result.data.revision.toLocaleString('fa-IR')} ثبت شد.`);const id=witnessAction.id;setWitnessAction(null);await refresh();onChanged();await openWitnessHistory(id);}catch(error){setMessage(error instanceof Error?error.message:'ثبت موعد نمونه شاهد انجام نشد');}finally{setBusy(false);}}

  return <section className="panel glass panel--wide">
    <div className="panel-heading"><div><p className="eyebrow">داده زنده SQLite</p><h3>نمونه‌ها و نتایج اخیر</h3></div><div className="row-actions"><span className="count-badge">{rows.length.toLocaleString('fa-IR')}</span><span className="count-badge">Review: {reviewRows.length.toLocaleString('fa-IR')}</span></div></div>
    {message&&<div className="workbench-message" role="status">{message}</div>}
    {reviewRows.length>0&&<div className="history-strip"><strong>صف Review مهندسی</strong>{reviewRows.slice(0,8).map(item=><span key={item.id}>{item.id} · R{item.revision?.toLocaleString('fa-IR')} · {item.reason??'پیش‌نویس جدید'}</span>)}</div>}
    <div className="table-wrap"><table><thead><tr><th>نمونه</th><th>سری / پروژه</th><th>سن / موعد</th><th>مقاومت</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td className="mono">{row.id}</td><td>{row.project_name??row.title??row.series_id}<small className="table-subline">{row.series_id}</small></td><td>{row.age_days===null?<><strong>شاهد</strong><small className="table-subline">{persianDate(row.due_at)}</small></>:`${row.age_days.toLocaleString('fa-IR')} روز`}</td><td>{row.strength_mpa===null?'—':`${row.strength_mpa.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa`}</td><td><span className={`status ${row.state==='approved'?'status--ok':row.state==='draft'?'status--pending':''}`}>{stateLabel(row.state)}</span></td><td><div className="row-actions"><button className="text-button" onClick={()=>void openHistory(row.id)}>تاریخچه نتیجه</button>{row.age_days===null&&<><button className="text-button" disabled={busy} onClick={()=>setWitnessAction(row)}>{row.due_at?'تغییر موعد شاهد':'تعیین موعد شاهد'}</button>{(row.witness_schedule_revision??0)>0&&<button className="text-button" onClick={()=>void openWitnessHistory(row.id)}>تاریخچه موعد</button>}</>}{row.state==='draft'&&<button className="primary-button mini-button" disabled={busy} onClick={()=>void approve(row)}>تأیید</button>}{row.state==='approved'&&<button className="text-button" disabled={busy} onClick={()=>setAction({mode:'correction',row})}>اصلاح</button>}{row.state&&row.state!=='void'&&<button className="text-button" disabled={busy} onClick={()=>setAction({mode:'void',row})}>ابطال</button>}</div></td></tr>)}
      {!rows.length&&<tr><td colSpan={6}>هنوز نمونه‌ای ثبت نشده است.</td></tr>}
    </tbody></table></div>
    {witnessAction&&<form className="review-action glass" onSubmit={submitWitness}><div><strong>زمان‌بندی نمونه شاهد</strong><small>{witnessAction.id} · بازنگری فعلی {(witnessAction.witness_schedule_revision??0).toLocaleString('fa-IR')}</small></div><input name="dueAt" type="datetime-local" required defaultValue={toLocalInput(witnessAction.due_at)}/><input name="reason" required placeholder="علت تعیین یا تغییر موعد"/><div className="row-actions"><button className="primary-button mini-button" disabled={busy}>ثبت موعد</button><button type="button" className="text-button" onClick={()=>setWitnessAction(null)}>انصراف</button></div></form>}
    {action&&<form className="review-action glass" onSubmit={submitAction}><div><strong>{action.mode==='correction'?'درخواست اصلاح نتیجه تأییدشده':'ابطال نتیجه'}</strong><small>{action.row.id} · R{action.row.revision?.toLocaleString('fa-IR')}</small></div>{action.mode==='correction'&&<><input name="strength" type="number" step="0.01" min="0" required defaultValue={action.row.strength_mpa??''} placeholder="مقاومت MPa"/><input name="testedAt" type="datetime-local" required defaultValue={toLocalInput(action.row.tested_at)}/><input name="testedBy" required defaultValue={action.row.tested_by??''} placeholder="انجام‌دهنده آزمون"/></>}<input name="reason" required placeholder={action.mode==='correction'?'علت اصلاح':'علت ابطال'}/><div className="row-actions"><button className="primary-button mini-button" disabled={busy}>ثبت عملیات</button><button type="button" className="text-button" onClick={()=>setAction(null)}>انصراف</button></div></form>}
    {selectedWitness&&witnessHistory.length>0&&<div className="history-strip"><strong>تاریخچه موعد شاهد {selectedWitness}</strong>{witnessHistory.map(item=><span key={item.revision}>R{item.revision.toLocaleString('fa-IR')} · {persianDate(item.due_at)} · {item.reason} · {item.entered_by}</span>)}</div>}
    {selected&&<div className="history-strip"><strong>تاریخچه {selected}</strong>{history.map(item=><span key={item.revision}>R{item.revision.toLocaleString('fa-IR')} · {stateLabel(item.state)} · {item.strength_mpa?.toLocaleString('fa-IR')??'—'} MPa · {item.reason??'ثبت اولیه'}</span>)}</div>}
  </section>;
}
