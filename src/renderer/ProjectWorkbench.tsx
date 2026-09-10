import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { PourSummary, ProjectSummary } from '../shared/ipc';
import './project-workbench.css';

function toIso(localValue: string): string {
  const date = new Date(localValue);
  if (!Number.isFinite(date.getTime())) throw new Error('تاریخ و زمان معتبر وارد کنید');
  return date.toISOString();
}

function defaultLocalDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

export function ProjectWorkbench({ onChanged }: { onChanged?: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pours, setPours] = useState<PourSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const projectId = useMemo(() => `PRJ-${Date.now().toString(36).toUpperCase()}`, []);
  const pourId = useMemo(() => `POUR-${Date.now().toString(36).toUpperCase()}`, []);

  async function reloadProjects() {
    const result = await window.tolou.listProjects();
    if (!result.ok) throw new Error(result.message);
    setProjects(result.data);
    const firstActive = result.data.find((item) => item.archived === 0)?.id ?? '';
    setSelectedProject((current) => current || firstActive);
  }

  useEffect(() => { void reloadProjects().catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری پروژه‌ها انجام نشد')); }, []);
  useEffect(() => {
    if (!selectedProject) { setPours([]); return; }
    void window.tolou.listPours(selectedProject).then((result) => {
      if (!result.ok) throw new Error(result.message);
      setPours(result.data);
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری بتن‌ریزی‌ها انجام نشد'));
  }, [selectedProject]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createProject({ id:String(form.get('id')), name:String(form.get('name')), customerName:String(form.get('customerName')), address:String(form.get('address') ?? '') });
      if (!result.ok) throw new Error(result.message);
      setMessage(`پروژه ${String(form.get('name'))} ثبت شد.`); await reloadProjects(); onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت پروژه انجام نشد'); } finally { setBusy(false); }
  }

  async function submitPour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createPour({ id:String(form.get('id')), projectId:String(form.get('projectId')), occurredAt:toIso(String(form.get('occurredAt'))) });
      if (!result.ok) throw new Error(result.message);
      setSelectedProject(String(form.get('projectId'))); setMessage(`بتن‌ریزی ${result.data.id} ثبت شد.`);
      const refreshed = await window.tolou.listPours(String(form.get('projectId'))); if (refreshed.ok) setPours(refreshed.data); onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت بتن‌ریزی انجام نشد'); } finally { setBusy(false); }
  }

  return <section className="project-workbench glass">
    <div className="panel-heading"><div><p className="eyebrow">پرونده مشتری</p><h3>پروژه‌ها و بتن‌ریزی‌ها</h3></div><span className="count-badge">{projects.filter((p) => p.archived === 0).length.toLocaleString('fa-IR')}</span></div>
    {message && <div className="workbench-message" role="status">{message}</div>}
    <div className="project-workbench-grid">
      <form className="workbench-form" onSubmit={submitProject}>
        <h4>پروژه جدید</h4><label>شناسه<input name="id" defaultValue={projectId} required /></label><label>نام پروژه<input name="name" required /></label><label>مشتری<input name="customerName" required /></label><label>آدرس<input name="address" /></label><button className="primary-button" disabled={busy}>ثبت پروژه</button>
      </form>
      <form className="workbench-form" onSubmit={submitPour}>
        <h4>بتن‌ریزی جدید</h4><label>شناسه<input name="id" defaultValue={pourId} required /></label><label>پروژه<select name="projectId" value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.filter((p)=>p.archived===0).map((p)=><option key={p.id} value={p.id}>{p.name} — {p.customer_name}</option>)}</select></label><label>زمان بتن‌ریزی<input name="occurredAt" type="datetime-local" defaultValue={defaultLocalDateTime()} required /></label><button className="primary-button" disabled={busy || !selectedProject}>ثبت بتن‌ریزی</button>
        <div className="pour-list">{pours.slice(0,4).map((pour)=><div key={pour.id}><span className="mono">{pour.id}</span><small>{new Date(pour.occurred_at).toLocaleString('fa-IR')}</small></div>)}</div>
      </form>
    </div>
  </section>;
}
