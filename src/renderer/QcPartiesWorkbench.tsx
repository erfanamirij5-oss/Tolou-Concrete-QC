import {useCallback,useEffect,useState} from 'react';
import type {FormEvent} from 'react';
import type {ConcreteSourceSummary,CustomerSummary,ExternalResultSummary,SampleSummary,TestingLaboratorySummary} from '../shared/ipc';
import {PersianDateTimeInput} from './PersianDateTimeInput';
import './qc-parties-workbench.css';

const nextId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
const typeLabel=(value:'internal'|'external')=>value==='internal'?'داخلی':'خارجی';

export function QcPartiesWorkbench({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
 const [customers,setCustomers]=useState<CustomerSummary[]>([]),[sources,setSources]=useState<ConcreteSourceSummary[]>([]),[labs,setLabs]=useState<TestingLaboratorySummary[]>([]),[samples,setSamples]=useState<SampleSummary[]>([]),[results,setResults]=useState<ExternalResultSummary[]>([]);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const reload=useCallback(async()=>{
  const [c,s,l,sm,r]=await Promise.all([window.tolou.listCustomers(),window.tolou.listConcreteSources(),window.tolou.listTestingLaboratories(),window.tolou.listSamples(200),window.tolou.listExternalResults(50)]);
  if(!c.ok)throw new Error(c.message);
  if(!s.ok)throw new Error(s.message);
  if(!l.ok)throw new Error(l.message);
  if(!sm.ok)throw new Error(sm.message);
  if(!r.ok)throw new Error(r.message);
  setCustomers(c.data);setSources(s.data);setLabs(l.data);setSamples(sm.data);setResults(r.data);
 },[]);
 useEffect(()=>{void reload().catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری اطلاعات QC انجام نشد'));},[reload,refreshKey]);
 const submit=async(event:FormEvent<HTMLFormElement>,kind:'customer'|'source'|'lab'|'result')=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');try{let res;
  if(kind==='customer')res=await window.tolou.createCustomer({id:String(data.get('id')),code:String(data.get('code')),name:String(data.get('name'))});
  else if(kind==='source')res=await window.tolou.createConcreteSource({id:String(data.get('id')),code:String(data.get('code')),name:String(data.get('name')),sourceType:String(data.get('type')) as 'internal'|'external'});
  else if(kind==='lab')res=await window.tolou.createTestingLaboratory({id:String(data.get('id')),code:String(data.get('code')),name:String(data.get('name')),labType:String(data.get('type')) as 'internal'|'external'});
  else res=await window.tolou.registerExternalResult({id:String(data.get('id')),sampleId:String(data.get('sampleId')),testingLaboratoryId:String(data.get('labId')),externalEventId:String(data.get('externalEventId')),strengthMpa:String(data.get('strength')).trim()?Number(data.get('strength')):null,testedAt:String(data.get('testedAt')).trim()||null,receivedAt:String(data.get('receivedAt')).trim()||null,notes:String(data.get('notes')??'')});
  if(!res.ok)throw new Error(res.message);setMessage(kind==='result'?'نتیجه خارجی ثبت شد.':'رکورد مرجع QC ثبت شد.');form.reset();await reload();onChanged?.();
 }catch(e){setMessage(e instanceof Error?e.message:'ثبت اطلاعات QC انجام نشد');}finally{setBusy(false);}};
 return <section className="qc-parties glass"><div className="panel-heading"><div><p className="eyebrow">مرجع‌های مستقل QC</p><h3>مشتری، منشأ بتن، آزمایشگاه و نتیجه خارجی</h3></div><span className="count-badge">{results.length.toLocaleString('fa-IR')}</span></div>{message&&<div className="workbench-message" role="status">{message}</div>}
 <div className="qc-party-grid">
  <form onSubmit={(e)=>void submit(e,'customer')}><h4>مشتری</h4><input name="id" defaultValue={nextId('CUS')} required/><input name="code" placeholder="کد مشتری" required/><input name="name" placeholder="نام مشتری" required/><button className="primary-button" disabled={busy}>ثبت مشتری</button><div className="mini-list">{customers.slice(0,4).map(x=><span key={x.id}>{x.code} · {x.name}</span>)}</div></form>
  <form onSubmit={(e)=>void submit(e,'source')}><h4>منشأ بتن</h4><input name="id" defaultValue={nextId('SRC')} required/><input name="code" placeholder="کد منشأ" required/><input name="name" placeholder="نام منشأ" required/><select name="type" defaultValue="internal"><option value="internal">داخلی</option><option value="external">خارجی</option></select><button className="primary-button" disabled={busy}>ثبت منشأ</button><div className="mini-list">{sources.slice(0,4).map(x=><span key={x.id}>{x.code} · {x.name} · {typeLabel(x.source_type)}</span>)}</div></form>
  <form onSubmit={(e)=>void submit(e,'lab')}><h4>آزمایشگاه</h4><input name="id" defaultValue={nextId('LAB')} required/><input name="code" placeholder="کد آزمایشگاه" required/><input name="name" placeholder="نام آزمایشگاه" required/><select name="type" defaultValue="external"><option value="internal">داخلی</option><option value="external">خارجی</option></select><button className="primary-button" disabled={busy}>ثبت آزمایشگاه</button><div className="mini-list">{labs.slice(0,4).map(x=><span key={x.id}>{x.code} · {x.name} · {typeLabel(x.lab_type)}</span>)}</div></form>
 </div>
 <form className="external-result-form" onSubmit={(e)=>void submit(e,'result')}><h4>ثبت نتیجه آزمایشگاه خارجی</h4><input name="id" defaultValue={nextId('EXT')} required/><select name="sampleId" required><option value="">انتخاب نمونه</option>{samples.map(x=><option key={x.id} value={x.id}>{x.id} · {x.project_name??x.title??x.series_id}</option>)}</select><select name="labId" required><option value="">انتخاب آزمایشگاه</option>{labs.filter(x=>x.archived===0).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select><input name="externalEventId" placeholder="شناسه رویداد/گزارش آزمایشگاه" required/><input name="strength" type="number" min="0" step="0.01" placeholder="مقاومت MPa (اختیاری)"/><label>زمان آزمون<PersianDateTimeInput name="testedAt" defaultIso={null}/></label><label>زمان دریافت<PersianDateTimeInput name="receivedAt"/></label><textarea name="notes" placeholder="یادداشت و مشخصات گزارش"/><button className="primary-button" disabled={busy}>ثبت نتیجه خارجی</button></form>
 {results.length>0&&<div className="table-wrap"><table><thead><tr><th>نمونه</th><th>آزمایشگاه</th><th>شناسه خارجی</th><th>مقاومت</th><th>دریافت‌کننده</th></tr></thead><tbody>{results.map(r=><tr key={r.id}><td className="mono">{r.sample_id}</td><td>{r.laboratory_name}</td><td>{r.external_event_id}</td><td>{r.strength_mpa==null?'—':`${r.strength_mpa.toLocaleString('fa-IR')} MPa`}</td><td>{r.received_by}</td></tr>)}</tbody></table></div>}
 </section>;
}
