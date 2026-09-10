import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { PourSummary, ProjectSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './project-workbench.css';

const nextId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}`;

export function ProjectWorkbench({ onChanged, refreshKey=0 }: { onChanged?: () => void; refreshKey?: number }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pours, setPours] = useState<PourSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId,setProjectId]=useState(()=>nextId('PRJ'));
  const [pourId,setPourId]=useState(()=>nextId('POUR'));

  async function reloadProjects() {
    const result = await window.tolou.listProjects();
    if (!result.ok) throw new Error(result.message);
    setProjects(result.data);
    const firstActive = result.data.find((item) => item.archived === 0)?.id ?? '';
    setSelectedProject((current) => result.data.some((p)=>p.id===current&&p.archived===0) ? current : firstActive);
  }

  useEffect(() => { void reloadProjects().catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری پروژه‌ها انجام نشد')); }, [refreshKey]);
  useEffect(() => {
    if (!selectedProject) { setPours([]); return; }
    void window.tolou.listPours(selectedProject).then((result) => {
      if (!result.ok) throw new Error(result.message);
      setPours(result.data);
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'بارگذاری بتن‌ریزی‌ها انجام نشد'));
  }, [selectedProject,refreshKey]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {
      const result = await window.tolou.createProject({ id:String(data.get('id')), name:String(data.get('name')), customerName:String(data.get('customerName')), address:String(data.get('address') ?? '') });
      if (!result.ok) throw new Error(result.message);
      setMessage(`پروژه ${String(data.get('name'))} ثبت شد.`); form.reset(); setProjectId(nextId('PRJ')); await reloadProjects(); onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت پروژه انجام نشد'); } finally { setBusy(false); }
  }

  async function submitPour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setMessage('');
    try {
      const occurredAt=String(data.get('occurredAt')??''); if(!occurredAt) throw new Error('زمان بتن‌ریزی شمسی معتبر وارد کنید');
      const result = await window.tolou.createPour({ id:String(data.get('id')), projectId:selectedProject, occurredAt });
      if (!result.ok) throw new Error(result.message);
      setMessage(`بتن‌ریزی ${result.data.id} ثبت شد.`); form.reset(); setPourId(nextId('POUR'));
      const refreshed = await window.tolou.listPours(selectedProject); if (refreshed.ok) setPours(refreshed.data); onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت بتن‌ریزی انجام نشد'); } finally { setBusy(false); }
  }

  return <section className="project-workbench glass">
    <div className="panel-heading"><div><p className="eyebrow">پرونده مشتری</p><h3>پروژه‌ها و بتن‌ریزی‌ها</h3></div><span className="count-badge">{projects.filter((p) => p.archived === 0).length.toLocaleString('fa-IR')}</span></div>
    {message && <div className="workbench-message" role="status">{message}</div>}
    <div className="project-workbench-grid">
      <form className="workbench-form" onSubmit={submitProject}>
        <h4>پروژه جدید</h4><label>شناسه<input name="id" value={projectId} onChange={(e)=>setProjectId(e.target.value)} required /></label><label>نام پروژه<input name="name" required /></label><label>مشتری<input name="customerName" required /></label><label>آدرس<input name="address" /></label><button className="primary-button" disabled={busy}>ثبت پروژه</button>
      </form>
      <form className="workbench-form" onSubmit={submitPour}>
        <h4>بتن‌ریزی جدید</h4><label>شناسه<input name="id" value={pourId} onChange={(e)=>setPourId(e.target.value)} required /></label><label>پروژه<select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)} required><option value="">انتخاب پروژه</option>{projects.filter((p)=>p.archived===0).map((p)=><option key={p.id} value={p.id}>{p.name} — {p.customer_name}</option>)}</select></label><label>زمان بتن‌ریزی (شمسی)<PersianDateTimeInput name="occurredAt" required /></label><button className="primary-button" disabled={busy || !selectedProject}>ثبت بتن‌ریزی</button>
        <div className="pour-list">{pours.slice(0,4).map((pour)=><div key={pour.id}><span className="mono">{pour.id}</span><small>{isoToPersianLocal(pour.occurred_at)}</small></div>)}</div>
      </form>
    </div>
  </section>;
}