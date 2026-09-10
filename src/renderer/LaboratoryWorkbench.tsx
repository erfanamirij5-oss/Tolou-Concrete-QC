import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { FreshConcreteSummary, LaboratoryKind, PourSummary, ProjectSummary, SampleSummary, SeriesSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

const nextSeriesId=()=>`TL-${Date.now().toString(36).toUpperCase()}`;

export function LaboratoryWorkbench({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}) {
  const [mode, setMode] = useState<'series' | 'fresh' | 'result'>('series');
  const [kind, setKind] = useState<LaboratoryKind>('internal');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [samples,setSamples]=useState<SampleSummary[]>([]);
  const [series,setSeries]=useState<SeriesSummary[]>([]);
  const [freshSeriesId,setFreshSeriesId]=useState('');
  const [freshCurrent,setFreshCurrent]=useState<FreshConcreteSummary|null>(null);
  const [sampleId, setSampleId] = useState('');
  const [revision, setRevision] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pours, setPours] = useState<PourSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [pourId, setPourId] = useState('');
  const [seriesId,setSeriesId]=useState(nextSeriesId);

  async function reloadReferenceData(){
    const [projectsResult,samplesResult,internalSeries,customerSeries]=await Promise.all([window.tolou.listProjects(),window.tolou.listSamples(200),window.tolou.listSeries('internal'),window.tolou.listSeries('customer')]);
    if(!projectsResult.ok) throw new Error(projectsResult.message);if(!samplesResult.ok) throw new Error(samplesResult.message);if(!internalSeries.ok)throw new Error(internalSeries.message);if(!customerSeries.ok)throw new Error(customerSeries.message);
    setProjects(projectsResult.data.filter((item)=>item.archived===0));
    const allSeries=[...internalSeries.data,...customerSeries.data].sort((a,b)=>b.sampled_at.localeCompare(a.sampled_at));setSeries(allSeries);setFreshSeriesId((current)=>allSeries.some((item)=>item.id===current)?current:(allSeries[0]?.id??''));
    const eligible=samplesResult.data.filter((item)=>item.due_at!==null&&item.state!=='approved'&&item.state!=='void');
    setSamples(eligible);setSampleId((current)=>eligible.some((item)=>item.id===current)?current:(eligible[0]?.id??''));
  }

  useEffect(() => { void reloadReferenceData().catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری داده‌ها انجام نشد')); }, [refreshKey]);
  useEffect(() => {
    if (kind !== 'customer' || !projectId) { setPours([]); setPourId(''); return; }
    void window.tolou.listPours(projectId).then((result) => {if (!result.ok) throw new Error(result.message);setPours(result.data); setPourId((current)=>result.data.some((item)=>item.id===current)?current:(result.data[0]?.id ?? ''));}).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری بتن‌ریزی‌ها انجام نشد'));
  }, [kind, projectId, refreshKey]);
  useEffect(()=>{const current=samples.find((item)=>item.id===sampleId);setRevision(current?.revision??0);},[sampleId,samples]);
  useEffect(()=>{if(!freshSeriesId){setFreshCurrent(null);return;}void window.tolou.getFreshConcrete(freshSeriesId).then((result)=>{if(!result.ok)throw new Error(result.message);setFreshCurrent(result.data);}).catch((error)=>setMessage(error instanceof Error?error.message:'بارگذاری بتن تازه انجام نشد'));},[freshSeriesId,refreshKey]);

  async function submitSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {
      const sampledAt=String(data.get('sampledAt')??''); if(!sampledAt) throw new Error('زمان نمونه‌برداری شمسی معتبر وارد کنید');
      const result = await window.tolou.createSeries({id:String(data.get('id')), kind, projectId:kind === 'customer' ? projectId : undefined, pourId:kind === 'customer' ? pourId : undefined,title:kind === 'internal' ? String(data.get('title')) : undefined, purpose:kind === 'internal' ? String(data.get('purpose')) : undefined,sampledAt, samplerName:String(data.get('samplerName'))});
      if (!result.ok) throw new Error(result.message);
      const createdId=result.data.id;setMessage(`سری ${createdId} با ${result.data.samples.length.toLocaleString('fa-IR')} نمونه ثبت شد؛ اکنون اسلامپ و دمای بتن تازه را ثبت کنید.`); form.reset(); setSeriesId(nextSeriesId()); await reloadReferenceData();setFreshSeriesId(createdId);setFreshCurrent(null);onChanged?.(); setMode('fresh');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت سری انجام نشد'); } finally { setBusy(false); }
  }

  async function submitFresh(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');
    try{const measuredAt=String(data.get('measuredAt')??'');if(!measuredAt)throw new Error('زمان اندازه‌گیری شمسی معتبر وارد کنید');const slumpText=String(data.get('slumpMm')??'').trim(),temperatureText=String(data.get('temperatureC')??'').trim();const result=await window.tolou.saveFreshConcrete({seriesId:freshSeriesId,expectedRevision:freshCurrent?.revision??0,slumpMm:slumpText?Number(slumpText):null,concreteTemperatureC:temperatureText?Number(temperatureText):null,measuredAt,reason:String(data.get('reason')??'')});if(!result.ok)throw new Error(result.message);setMessage(`بتن تازه سری ${result.data.seriesId}: اسلامپ ${result.data.slumpMm?.toLocaleString('fa-IR')??'ثبت نشده'} mm، دما ${result.data.concreteTemperatureC?.toLocaleString('fa-IR')??'ثبت نشده'} °C، بازنگری ${result.data.revision.toLocaleString('fa-IR')}.`);const current=await window.tolou.getFreshConcrete(freshSeriesId);if(current.ok)setFreshCurrent(current.data);onChanged?.();}catch(error){setMessage(error instanceof Error?error.message:'ثبت بتن تازه انجام نشد');}finally{setBusy(false);}
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {const testedAt=String(data.get('testedAt')??''); if(!testedAt) throw new Error('زمان آزمون شمسی معتبر وارد کنید');const result = await window.tolou.saveDraft({ sampleId:String(data.get('sampleId')), expectedRevision:Number(data.get('expectedRevision')), strengthMpa:Number(data.get('strengthMpa')), testedAt, testedBy:String(data.get('testedBy')), reason:String(data.get('reason') ?? '') });if (!result.ok) throw new Error(result.message);setMessage(`نتیجه نمونه ${result.data.sampleId}، بازنگری ${result.data.revision.toLocaleString('fa-IR')} ذخیره شد.`); form.reset(); await reloadReferenceData(); onChanged?.();} catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت نتیجه انجام نشد'); } finally { setBusy(false); }
  }

  return <section className="workbench glass" aria-label="ثبت عملیاتی آزمایشگاه">
    <div className="workbench-head"><div><p className="eyebrow">ثبت واقعی در SQLite</p><h3>میز کار آزمایشگاه</h3></div><div className="segmented" role="tablist"><button type="button" className={mode==='series'?'is-active':''} onClick={()=>setMode('series')}>ثبت سری</button><button type="button" className={mode==='fresh'?'is-active':''} onClick={()=>setMode('fresh')}>بتن تازه</button><button type="button" className={mode==='result'?'is-active':''} onClick={()=>setMode('result')}>نتیجه آزمون</button></div></div>
    {message && <div className="workbench-message" role="status">{message}</div>}
    {mode === 'series' ? <form className="workbench-form" onSubmit={submitSeries}>
      <div className="segmented kind-switch"><button type="button" className={kind==='internal'?'is-active':''} onClick={()=>setKind('internal')}>کنترل داخلی</button><button type="button" className={kind==='customer'?'is-active':''} onClick={()=>setKind('customer')}>پروژه مشتری</button></div>
      <label>شناسه سری<input name="id" value={seriesId} onChange={(e)=>setSeriesId(e.target.value)} required /></label>
      {kind === 'customer' ? <><label>پروژه<select value={projectId} onChange={(e)=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={(e)=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map((pour)=><option key={pour.id} value={pour.id}>{pour.id} — {isoToPersianLocal(pour.occurred_at)}</option>)}</select></label></> : <><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required /></label><label>هدف<textarea name="purpose" placeholder="هدف و دامنه کنترل داخلی" required /></label></>}
      <label>زمان نمونه‌برداری (شمسی)<PersianDateTimeInput name="sampledAt" required /></label><label>نمونه‌بردار<input name="samplerName" required /></label><button className="primary-button workbench-submit" disabled={busy || (kind==='customer' && (!projectId || !pourId))}>{busy?'در حال ثبت…':'ثبت سری و ایجاد نمونه‌ها'}</button>
    </form> : mode==='fresh' ? <form key={`${freshSeriesId}-${freshCurrent?.revision??0}`} className="workbench-form" onSubmit={submitFresh}>
      <label>سری نمونه<select value={freshSeriesId} onChange={(e)=>setFreshSeriesId(e.target.value)} required><option value="">انتخاب سری</option>{series.map((item)=><option key={item.id} value={item.id}>{item.id} — {item.kind==='customer'?'پروژه مشتری':item.title??'کنترل داخلی'} — {isoToPersianLocal(item.sampled_at)}</option>)}</select></label>
      <label>اسلامپ mm<input name="slumpMm" type="number" min="0" step="1" defaultValue={freshCurrent?.slump_mm??''} placeholder="مثلاً ۱۲۰" /></label><label>دمای بتن °C<input name="temperatureC" type="number" step="0.1" defaultValue={freshCurrent?.concrete_temperature_c??''} placeholder="مثلاً ۲۷٫۵" /></label><label>زمان اندازه‌گیری (شمسی)<PersianDateTimeInput name="measuredAt" defaultIso={freshCurrent?.measured_at??series.find((item)=>item.id===freshSeriesId)?.sampled_at??null} required /></label><label>بازنگری<input value={freshCurrent?.revision??0} readOnly /></label><label>علت اصلاح<textarea name="reason" required={(freshCurrent?.revision??0)>0} placeholder={(freshCurrent?.revision??0)>0?'علت اصلاح الزامی است':'برای ثبت اولیه نیاز نیست'} /></label><button className="primary-button workbench-submit" disabled={busy||!freshSeriesId}>{busy?'در حال ذخیره…':freshCurrent?'ثبت بازنگری بتن تازه':'ثبت اسلامپ و دمای بتن'}</button>
    </form> : <form className="workbench-form" onSubmit={submitResult}>
      <label>شناسه نمونه<select name="sampleId" value={sampleId} onChange={(e)=>setSampleId(e.target.value)} required><option value="">انتخاب نمونه</option>{samples.map((sample)=><option key={sample.id} value={sample.id}>{sample.id} — {sample.age_days?.toLocaleString('fa-IR')??'شاهد'}{sample.state==='draft'?` — R${sample.revision}`:''}</option>)}</select></label>
      <label>مقاومت فشاری MPa<input name="strengthMpa" type="number" min="0" step="0.1" required /></label><label>زمان آزمون (شمسی)<PersianDateTimeInput name="testedAt" required /></label><label>آزمایش‌کننده<input name="testedBy" required /></label><label>بازنگری مورد انتظار<input name="expectedRevision" type="number" min="0" value={revision} readOnly required /></label><label>علت اصلاح<textarea name="reason" placeholder="برای بازنگری دوم به بعد الزامی است" /></label><button className="primary-button workbench-submit" disabled={busy||!sampleId}>{busy?'در حال ذخیره…':'ذخیره پیش‌نویس نتیجه'}</button>
    </form>}
  </section>;
}
