import { useCallback, useEffect, useMemo, useState } from 'react';
import { LaboratoryWorkbench } from './LaboratoryWorkbench';
import { ProjectWorkbench } from './ProjectWorkbench';
import { SampleResultsPanel } from './SampleResultsPanel';
import { EngineeringWorkbench } from './EngineeringWorkbench';
import { QcPartiesWorkbench } from './QcPartiesWorkbench';
import { AnalyticsWorkbench } from './AnalyticsWorkbench';
import { ManagementAnalyticsDashboard } from './ManagementAnalyticsDashboard';
import { ProjectQcReportWorkbench } from './ProjectQcReportWorkbench';
import type { DashboardSummary } from '../shared/ipc';

type Metric = { label: string; value: string; hint: string; tone?: 'ok' | 'warn' | 'danger' };

export function App() {
  const [clock, setClock] = useState(new Date());
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [dashboard, setDashboard] = useState<DashboardSummary>({ activeProjects:0,totalSeries:0,pendingResults:0,draftResults:0 });
  const [dataVersion,setDataVersion]=useState(0);

  const refreshDashboard = useCallback(async () => { const result = await window.tolou.dashboard(); if (!result.ok) throw new Error(result.message); setDashboard(result.data); }, []);
  const dataChanged=useCallback(()=>{setDataVersion((value)=>value+1);void refreshDashboard();},[refreshDashboard]);
  useEffect(() => {const timer=window.setInterval(()=>setClock(new Date()),60_000);Promise.all([window.tolou.health(),refreshDashboard()]).then(()=>setHealth('ok')).catch(()=>setHealth('error'));return()=>window.clearInterval(timer);},[refreshDashboard]);
  const metrics:Metric[]=useMemo(()=>[{label:'سری‌های ثبت‌شده',value:dashboard.totalSeries.toLocaleString('fa-IR'),hint:'ثبت‌شده در پایگاه داده',tone:'ok'},{label:'نتایج در انتظار',value:dashboard.pendingResults.toLocaleString('fa-IR'),hint:'نمونه دارای موعد بدون نتیجه',tone:'warn'},{label:'پیش‌نویس نتیجه',value:dashboard.draftResults.toLocaleString('fa-IR'),hint:'نیازمند تکمیل گردش تأیید',tone:dashboard.draftResults?'danger':'ok'},{label:'پروژه‌های فعال',value:dashboard.activeProjects.toLocaleString('fa-IR'),hint:'پرونده‌های جاری مشتری'}],[dashboard]);
  const persianDate=useMemo(()=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(clock),[clock]);
  return <main className="app-shell"><aside className="sidebar glass glass--dark" aria-label="ناوبری اصلی"><div className="brand-block"><div className="brand-mark" aria-hidden="true">T</div><div><strong>طلوع</strong><span>کنترل کیفیت بتن</span></div></div><nav className="nav-stack"><button className="nav-item nav-item--active"><span>◆</span>داشبورد</button><button className="nav-item"><span>◫</span>نمونه‌ها و نتایج</button><button className="nav-item"><span>▦</span>پروژه‌ها</button><button className="nav-item"><span>⌁</span>طرح‌های اختلاط</button><button className="nav-item"><span>◉</span>تحلیل و هشدارها</button><button className="nav-item"><span>▤</span>گزارش‌ها</button></nav><div className="sidebar-footer"><div className="connection"><span className={`dot dot--${health}`} />{health==='ok'?'دیتابیس و سامانه آماده است':health==='error'?'خطای ارتباط داخلی':'در حال بررسی'}</div><button className="nav-item"><span>⚙</span>تنظیمات</button></div></aside><section className="workspace"><header className="topbar glass"><div><p className="eyebrow">آزمایشگاه مرکزی</p><h1>داشبورد کنترل کیفیت</h1></div><div className="topbar-actions"><div className="date-chip">{persianDate}</div><button className="avatar-button" aria-label="حساب کاربری">ا.ا</button></div></header><div className="content-grid"><section className="hero glass"><div><p className="eyebrow eyebrow--accent">مرکز عملیات امروز</p><h2>کنترل سریع، تصمیم مهندسی، سابقه قابل ردیابی.</h2><p>ثبت پروژه، بتن‌ریزی، سری نمونه، نتیجه و تأیید مهندسی روی پایگاه داده آفلاین و قابل ردیابی.</p></div><div className="hero-orbit" aria-hidden="true"><div /><div /><span>QC</span></div></section><section className="metrics-grid" aria-label="شاخص‌های زنده">{metrics.map(metric=><article className="metric-card glass" key={metric.label}><div className="metric-header"><span>{metric.label}</span><i className={`metric-light metric-light--${metric.tone??'neutral'}`} /></div><strong>{metric.value}</strong><small>{metric.hint}</small></article>)}</section><ManagementAnalyticsDashboard refreshKey={dataVersion}/><AnalyticsWorkbench refreshKey={dataVersion}/><ProjectQcReportWorkbench refreshKey={dataVersion}/><ProjectWorkbench onChanged={dataChanged} refreshKey={dataVersion}/><QcPartiesWorkbench onChanged={dataChanged} refreshKey={dataVersion}/><EngineeringWorkbench onChanged={dataChanged} refreshKey={dataVersion}/><LaboratoryWorkbench onChanged={dataChanged} refreshKey={dataVersion}/><SampleResultsPanel onChanged={dataChanged} refreshKey={dataVersion}/></div></section></main>;
}
