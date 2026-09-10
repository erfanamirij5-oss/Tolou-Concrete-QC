import { FormEvent, useMemo, useState } from 'react';
import type { CreatedSample } from '../shared/ipc';
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [lastSamples, setLastSamples] = useState<CreatedSample[]>([]);
  const [sampleId, setSampleId] = useState('');
  const [revision, setRevision] = useState(0);

  const seriesId = useMemo(() => `TL-${Date.now().toString(36).toUpperCase()}`, []);

  async function submitSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createSeries({
        id: String(form.get('id')),
        kind: 'internal',
        title: String(form.get('title')),
        purpose: String(form.get('purpose')),
        sampledAt: toIso(String(form.get('sampledAt'))),
        samplerName: String(form.get('samplerName')),
      });
      if (!result.ok) throw new Error(result.message);
      setLastSamples(result.data.samples);
      setSampleId(result.data.samples[0]?.id ?? '');
      setRevision(0);
      setMessage(`سری ${result.data.id} با ${result.data.samples.length.toLocaleString('fa-IR')} نمونه ثبت شد.`);
      setMode('result');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ثبت سری انجام نشد');
    } finally { setBusy(false); }
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage('');
    try {
      const result = await window.tolou.saveDraft({
        sampleId: String(form.get('sampleId')),
        expectedRevision: Number(form.get('expectedRevision')),
        strengthMpa: Number(form.get('strengthMpa')),
        testedAt: toIso(String(form.get('testedAt'))),
        testedBy: String(form.get('testedBy')),
        reason: String(form.get('reason') ?? ''),
      });
      if (!result.ok) throw new Error(result.message);
      setRevision(result.data.revision);
      setMessage(`نتیجه نمونه ${result.data.sampleId} به‌صورت پیش‌نویس، بازنگری ${result.data.revision.toLocaleString('fa-IR')} ذخیره شد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ثبت نتیجه انجام نشد');
    } finally { setBusy(false); }
  }

  return (
    <section className="workbench glass" aria-label="ثبت عملیاتی آزمایشگاه">
      <div className="workbench-head">
        <div><p className="eyebrow">ثبت واقعی در SQLite</p><h3>میز کار آزمایشگاه</h3></div>
        <div className="segmented" role="tablist">
          <button type="button" className={mode === 'series' ? 'is-active' : ''} onClick={() => setMode('series')}>سری داخلی</button>
          <button type="button" className={mode === 'result' ? 'is-active' : ''} onClick={() => setMode('result')}>نتیجه آزمون</button>
        </div>
      </div>

      {message && <div className="workbench-message" role="status">{message}</div>}

      {mode === 'series' ? (
        <form className="workbench-form" onSubmit={submitSeries}>
          <label>شناسه سری<input name="id" defaultValue={seriesId} required /></label>
          <label>عنوان آزمایش<input name="title" placeholder="مثلاً کنترل روزانه تولید" required /></label>
          <label>هدف<textarea name="purpose" placeholder="هدف و دامنه کنترل داخلی" required /></label>
          <label>زمان نمونه‌برداری<input name="sampledAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label>
          <label>نمونه‌بردار<input name="samplerName" placeholder="نام نمونه‌بردار" required /></label>
          <button className="primary-button workbench-submit" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت سری و ایجاد نمونه‌ها'}</button>
        </form>
      ) : (
        <form className="workbench-form" onSubmit={submitResult}>
          <label>شناسه نمونه
            {lastSamples.length ? (
              <select name="sampleId" value={sampleId} onChange={(e) => { setSampleId(e.target.value); setRevision(0); }} required>
                {lastSamples.filter((sample) => sample.dueAt !== null).map((sample) => <option key={sample.id} value={sample.id}>{sample.id} — {sample.ageDays?.toLocaleString('fa-IR')} روز</option>)}
              </select>
            ) : <input name="sampleId" value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="شناسه نمونه" required />}
          </label>
          <label>مقاومت فشاری MPa<input name="strengthMpa" type="number" min="0" step="0.1" required /></label>
          <label>زمان آزمون<input name="testedAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label>
          <label>آزمایش‌کننده<input name="testedBy" placeholder="نام آزمایش‌کننده" required /></label>
          <label>بازنگری مورد انتظار<input name="expectedRevision" type="number" min="0" value={revision} onChange={(e) => setRevision(Number(e.target.value))} required /></label>
          <label>علت اصلاح<textarea name="reason" placeholder="برای بازنگری دوم به بعد الزامی است" /></label>
          <button className="primary-button workbench-submit" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس نتیجه'}</button>
        </form>
      )}
    </section>
  );
}
