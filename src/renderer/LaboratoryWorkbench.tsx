import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { LaboratoryKind, PourSummary, ProjectSummary, SampleSummary } from '../shared/ipc';
import './laboratory-workbench.css';

function toIso(localValue: string): string {
  const date = new Date(localValue);
  if (!Number.isFinite(date.getTime())) throw new Error('تاریخ و زمان معتبر وارد کنید');
  return date.toISOString();
}
function defaultLocalDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}
const nextSeriesId=()=>`TL-${Date.now().toString(36).toUpperCase()}`;

export function LaboratoryWorkbench({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}) {
  const [mode, setMode] = useState<'series' | 'result'>('series');
  const [kind, setKind] = useState<LaboratoryKind>('internal');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [samples,setSamples]=useState<SampleSummary[]>([]);
  const [sampleId, setSampleId] = useState('');
  const [revision, setRevision] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pours, setPours] = useState<PourSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [pourId, setPourId] = useState('');
  const [seriesId,setSeriesId]=useState(nextSeriesId);

  async function reloadReferenceData(){
    const [projectsResult,samplesResult]=await Promise.all([window.tolou.listProjects(),window.tolou.listSamples(200)]);
    if(!projectsResult.ok) throw new Error(projectsResult.message);
    if(!samplesResult.ok) throw new Error(samplesResult.message);
    setProjects(projectsResult.data.filter((item)=>item.archived===0));
    const eligible=samplesResult.data.filter((item)=>item.due_at!==null&&item.state!=='approved'&&item.state!=='void');
    setSamples(eligible);
    setSampleId((current)=>eligible.some((item)=>item.id===current)?current:(eligible[0]?.id??''));
  }

  useEffect(() => { void reloadReferenceData().catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری داده‌ها انجام نشد')); }, [refreshKey]);
  useEffect(() => {
    if (kind !== 'customer' || !projectId) { setPours([]); setPourId(''); return; }
    void window.tolou.listPours(projectId).then((result) => {
      if (!result.ok) throw new Error(result.message);
      setPours(result.data); setPourId((current)=>result.data.some((item)=>item.id===current)?current:(result.data[0]?.id ?? ''));
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری بتن‌ریزی‌ها انجام نشد'));
  }, [kind, projectId, refreshKey]);

  useEffect(()=>{
    const current=samples.find((item)=>item.id===sampleId);
    setRevision(current?.revision??0);
  },[sampleId,samples]);

  async function submitSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createSeries({
        id:String(data.get('id')), kind,
        projectId:kind === 'customer' ? projectId : undefined,
        pourId:kind === 'customer' ? pourId : undefined,
        title:kind === 'internal' ? String(data.get('title')) : undefined,
        purpose:kind === 'internal' ? String(data.get('purpose')) : undefined,
        sampledAt:toIso(String(data.get('sampledAt'))), samplerName:String(data.get('samplerName')),
      });
      if (!result.ok) throw new Error(result.message);
      setMessage(`سری ${result.data.id} با ${result.data.samples.length.toLocaleString('fa-IR')} نمونه ثبت شد.`); form.reset(); setSeriesId(nextSeriesId()); await reloadReferenceData(); onChanged?.(); setMode('result');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت سری انجام نشد'); } finally { setBusy(false); }
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.saveDraft({ sampleId:String(data.get('sampleId')), expectedRevision:Number(data.get('expectedRevision')), strengthMpa:Number(data.get('strengthMpa')), testedAt:toIso(String(data.get('testedAt'))), testedBy:String(data.get('testedBy')), reason:String(data.get('reason') ?? '') });
      if (!result.ok) throw new Error(result.message);
      setMessage(`نتیجه نمونه ${result.data.sampleId}، بازنگری ${result.data.revision.toLocaleString('fa-IR')} ذخیره شد.`); form.reset(); await reloadReferenceData(); onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت نتیجه انجام نشد'); } finally { setBusy(false); }
  }

  return <section className="workbench glass" aria-label="ثبت عملیاتی آزمایشگاه">
    <div className="workbench-head"><div><p className="eyebrow">ثبت واقعی در SQLite</p><h3>میز کار آزمایشگاه</h3></div><div className="segmented" role="tablist"><button type="button" className={mode==='series'?'is-active':''} onClick={()=>setMode('series')}>ثبت سری</button><button type="button" className={mode==='result'?'is-active':''} onClick={()=>setMode('result')}>نتیجه آزمون</button></div></div>
    {message && <div className="workbench-message" role="status">{message}</div>}
    {mode === 'series' ? <form className="workbench-form" onSubmit={submitSeries}>
      <div className="segmented kind-switch"><button type="button" className={kind==='internal'?'is-active':''} onClick={()=>setKind('internal')}>کنترل داخلی</button><button type="button" className={kind==='customer'?'is-active':''} onClick={()=>setKind('customer')}>پروژه مشتری</button></div>
      <label>شناسه سری<input name="id" value={seriesId} onChange={(e)=>setSeriesId(e.target.value)} required /></label>
      {kind === 'customer' ? <><label>پروژه<select value={projectId} onChange={(e)=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={(e)=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map((pour)=><option key={pour.id} value={pour.id}>{pour.id} — {new Date(pour.occurred_at).toLocaleString('fa-IR')}</option>)}</select></label></> : <><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required /></label><label>هدف<textarea name="purpose" placeholder="هدف و دامنه کنترل داخلی" required /></label></>}
      <label>زمان نمونه‌برداری<input name="sampledAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label><label>نمونه‌بردار<input name="samplerName" required /></label><button className="primary-button workbench-submit" disabled={busy || (kind==='customer' && (!projectId || !pourId))}>{busy?'در حال ثبت…':'ثبت سری و ایجاد نمونه‌ها'}</button>
    </form> : <form className="workbench-form" onSubmit={submitResult}>
      <label>شناسه نمونه<select name="sampleId" value={sampleId} onChange={(e)=>setSampleId(e.target.value)} required><option value="">انتخاب نمونه</option>{samples.map((sample)=><option key={sample.id} value={sample.id}>{sample.id} — {sample.age_days?.toLocaleString('fa-IR')??'شاهد'}{sample.state==='draft'?` — R${sample.revision}`:''}</option>)}</select></label>
      <label>مقاومت فشاری MPa<input name="strengthMpa" type="number" min="0" step="0.1" required /></label><label>زمان آزمون<input name="testedAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label><label>آزمایش‌کننده<input name="testedBy" required /></label><label>بازنگری مورد انتظار<input name="expectedRevision" type="number" min="0" value={revision} readOnly required /></label><label>علت اصلاح<textarea name="reason" placeholder="برای بازنگری دوم به بعد الزامی است" /></label><button className="primary-button workbench-submit" disabled={busy||!sampleId}>{busy?'در حال ذخیره…':'ذخیره پیش‌نویس نتیجه'}</button>
    </form>}
  </section>;
}
