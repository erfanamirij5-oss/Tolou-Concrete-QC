import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { CreatedSample, LaboratoryKind, PourSummary, ProjectSummary } from '../shared/ipc';
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

export function LaboratoryWorkbench() {
  const [mode, setMode] = useState<'series' | 'result'>('series');
  const [kind, setKind] = useState<LaboratoryKind>('internal');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSamples, setLastSamples] = useState<CreatedSample[]>([]);
  const [sampleId, setSampleId] = useState('');
  const [revision, setRevision] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pours, setPours] = useState<PourSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [pourId, setPourId] = useState('');
  const seriesId = useMemo(() => `TL-${Date.now().toString(36).toUpperCase()}`, []);

  useEffect(() => {
    void window.tolou.listProjects().then((result) => {
      if (!result.ok) throw new Error(result.message);
      setProjects(result.data.filter((item) => item.archived === 0));
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری پروژه‌ها انجام نشد'));
  }, []);

  useEffect(() => {
    if (kind !== 'customer' || !projectId) { setPours([]); setPourId(''); return; }
    void window.tolou.listPours(projectId).then((result) => {
      if (!result.ok) throw new Error(result.message);
      setPours(result.data); setPourId(result.data[0]?.id ?? '');
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری بتن‌ریزی‌ها انجام نشد'));
  }, [kind, projectId]);

  async function submitSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createSeries({
        id:String(form.get('id')), kind,
        projectId:kind === 'customer' ? projectId : undefined,
        pourId:kind === 'customer' ? pourId : undefined,
        title:kind === 'internal' ? String(form.get('title')) : undefined,
        purpose:kind === 'internal' ? String(form.get('purpose')) : undefined,
        sampledAt:toIso(String(form.get('sampledAt'))), samplerName:String(form.get('samplerName')),
      });
      if (!result.ok) throw new Error(result.message);
      setLastSamples(result.data.samples); setSampleId(result.data.samples[0]?.id ?? ''); setRevision(0);
      setMessage(`سری ${result.data.id} با ${result.data.samples.length.toLocaleString('fa-IR')} نمونه ثبت شد.`); setMode('result');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت سری انجام نشد'); } finally { setBusy(false); }
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.saveDraft({ sampleId:String(form.get('sampleId')), expectedRevision:Number(form.get('expectedRevision')), strengthMpa:Number(form.get('strengthMpa')), testedAt:toIso(String(form.get('testedAt'))), testedBy:String(form.get('testedBy')), reason:String(form.get('reason') ?? '') });
      if (!result.ok) throw new Error(result.message);
      setRevision(result.data.revision); setMessage(`نتیجه نمونه ${result.data.sampleId}، بازنگری ${result.data.revision.toLocaleString('fa-IR')} ذخیره شد.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت نتیجه انجام نشد'); } finally { setBusy(false); }
  }

  return <section className="workbench glass" aria-label="ثبت عملیاتی آزمایشگاه">
    <div className="workbench-head"><div><p className="eyebrow">ثبت واقعی در SQLite</p><h3>میز کار آزمایشگاه</h3></div><div className="segmented" role="tablist"><button type="button" className={mode==='series'?'is-active':''} onClick={()=>setMode('series')}>ثبت سری</button><button type="button" className={mode==='result'?'is-active':''} onClick={()=>setMode('result')}>نتیجه آزمون</button></div></div>
    {message && <div className="workbench-message" role="status">{message}</div>}
    {mode === 'series' ? <form className="workbench-form" onSubmit={submitSeries}>
      <div className="segmented kind-switch"><button type="button" className={kind==='internal'?'is-active':''} onClick={()=>setKind('internal')}>کنترل داخلی</button><button type="button" className={kind==='customer'?'is-active':''} onClick={()=>setKind('customer')}>پروژه مشتری</button></div>
      <label>شناسه سری<input name="id" defaultValue={seriesId} required /></label>
      {kind === 'customer' ? <><label>پروژه<select value={projectId} onChange={(e)=>setProjectId(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name} — {project.customer_name}</option>)}</select></label><label>بتن‌ریزی<select value={pourId} onChange={(e)=>setPourId(e.target.value)} required><option value="">انتخاب بتن‌ریزی</option>{pours.map((pour)=><option key={pour.id} value={pour.id}>{pour.id} — {new Date(pour.occurred_at).toLocaleString('fa-IR')}</option>)}</select></label></> : <><label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required /></label><label>هدف<textarea name="purpose" placeholder="هدف و دامنه کنترل داخلی" required /></label></>}
      <label>زمان نمونه‌برداری<input name="sampledAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label><label>نمونه‌بردار<input name="samplerName" required /></label><button className="primary-button workbench-submit" disabled={busy || (kind==='customer' && (!projectId || !pourId))}>{busy?'در حال ثبت…':'ثبت سری و ایجاد نمونه‌ها'}</button>
    </form> : <form className="workbench-form" onSubmit={submitResult}>
      <label>شناسه نمونه{lastSamples.length ? <select name="sampleId" value={sampleId} onChange={(e)=>{setSampleId(e.target.value);setRevision(0);}} required>{lastSamples.filter((sample)=>sample.dueAt!==null).map((sample)=><option key={sample.id} value={sample.id}>{sample.id} — {sample.ageDays?.toLocaleString('fa-IR')} روز</option>)}</select> : <input name="sampleId" value={sampleId} onChange={(e)=>setSampleId(e.target.value)} required />}</label>
      <label>مقاومت فشاری MPa<input name="strengthMpa" type="number" min="0" step="0.1" required /></label><label>زمان آزمون<input name="testedAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label><label>آزمایش‌کننده<input name="testedBy" required /></label><label>بازنگری مورد انتظار<input name="expectedRevision" type="number" min="0" value={revision} onChange={(e)=>setRevision(Number(e.target.value))} required /></label><label>علت اصلاح<textarea name="reason" placeholder="برای بازنگری دوم به بعد الزامی است" /></label><button className="primary-button workbench-submit" disabled={busy}>{busy?'در حال ذخیره…':'ذخیره پیش‌نویس نتیجه'}</button>
    </form>}
  </section>;
}
