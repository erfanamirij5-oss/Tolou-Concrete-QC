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
type WorkspaceView = 'dashboard' | 'samples' | 'projects' | 'mixes' | 'analytics' | 'reports' | 'settings';

type NavItem = {
  id: WorkspaceView;
  label: string;
  icon: string;
  title: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: '◆', title: 'داشبورد کنترل کیفیت' },
  { id: 'samples', label: 'نمونه‌ها و نتایج', icon: '◫', title: 'نمونه‌ها و نتایج' },
  { id: 'projects', label: 'پروژه‌ها', icon: '▦', title: 'پروژه‌ها و طرف‌های کنترل کیفیت' },
  { id: 'mixes', label: 'طرح‌های اختلاط', icon: '⌁', title: 'طرح‌های اختلاط و مشخصات مهندسی' },
  { id: 'analytics', label: 'تحلیل و هشدارها', icon: '◉', title: 'تحلیل و هشدارهای کنترل کیفیت' },
  { id: 'reports', label: 'گزارش‌ها', icon: '▤', title: 'گزارش‌های کنترل کیفیت' },
];

export function App() {
  const [clock, setClock] = useState(new Date());
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [dashboard, setDashboard] = useState<DashboardSummary>({ activeProjects: 0, totalSeries: 0, pendingResults: 0, draftResults: 0 });
  const [dataVersion, setDataVersion] = useState(0);
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');

  const refreshDashboard = useCallback(async () => {
    const result = await window.tolou.dashboard();
    if (!result.ok) throw new Error(result.message);
    setDashboard(result.data);
  }, []);

  const dataChanged = useCallback(() => {
    setDataVersion((value) => value + 1);
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    Promise.all([window.tolou.health(), refreshDashboard()])
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
    return () => window.clearInterval(timer);
  }, [refreshDashboard]);

  const metrics: Metric[] = useMemo(() => [
    { label: 'سری‌های ثبت‌شده', value: dashboard.totalSeries.toLocaleString('fa-IR'), hint: 'ثبت‌شده در پایگاه داده', tone: 'ok' },
    { label: 'نتایج در انتظار', value: dashboard.pendingResults.toLocaleString('fa-IR'), hint: 'نمونه دارای موعد بدون نتیجه', tone: 'warn' },
    { label: 'پیش‌نویس نتیجه', value: dashboard.draftResults.toLocaleString('fa-IR'), hint: 'نیازمند تکمیل گردش تأیید', tone: dashboard.draftResults ? 'danger' : 'ok' },
    { label: 'پروژه‌های فعال', value: dashboard.activeProjects.toLocaleString('fa-IR'), hint: 'پرونده‌های جاری مشتری' },
  ], [dashboard]);

  const persianDate = useMemo(() => new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(clock), [clock]);

  const activeTitle = activeView === 'settings'
    ? 'تنظیمات'
    : NAV_ITEMS.find((item) => item.id === activeView)?.title ?? 'داشبورد کنترل کیفیت';

  const renderWorkspace = () => {
    switch (activeView) {
      case 'dashboard':
        return <>
          <section className="hero glass">
            <div>
              <p className="eyebrow eyebrow--accent">مرکز عملیات امروز</p>
              <h2>کنترل سریع، تصمیم مهندسی، سابقه قابل ردیابی.</h2>
              <p>ثبت پروژه، بتن‌ریزی، سری نمونه، نتیجه و تأیید مهندسی روی پایگاه داده آفلاین و قابل ردیابی.</p>
            </div>
            <div className="hero-orbit" aria-hidden="true"><div /><div /><span>QC</span></div>
          </section>
          <section className="metrics-grid" aria-label="شاخص‌های زنده">
            {metrics.map((metric) => <article className="metric-card glass" key={metric.label}>
              <div className="metric-header"><span>{metric.label}</span><i className={`metric-light metric-light--${metric.tone ?? 'neutral'}`} /></div>
              <strong>{metric.value}</strong><small>{metric.hint}</small>
            </article>)}
          </section>
          <ManagementAnalyticsDashboard refreshKey={dataVersion} />
        </>;
      case 'samples':
        return <>
          <LaboratoryWorkbench onChanged={dataChanged} refreshKey={dataVersion} />
          <SampleResultsPanel onChanged={dataChanged} refreshKey={dataVersion} />
        </>;
      case 'projects':
        return <>
          <ProjectWorkbench onChanged={dataChanged} refreshKey={dataVersion} />
          <QcPartiesWorkbench onChanged={dataChanged} refreshKey={dataVersion} />
        </>;
      case 'mixes':
        return <EngineeringWorkbench onChanged={dataChanged} refreshKey={dataVersion} />;
      case 'analytics':
        return <AnalyticsWorkbench refreshKey={dataVersion} />;
      case 'reports':
        return <ProjectQcReportWorkbench refreshKey={dataVersion} />;
      case 'settings':
        return <section className="panel glass panel--wide">
          <div className="panel-heading"><div><p className="eyebrow">SYSTEM</p><h3>تنظیمات</h3></div></div>
          <p>بخش تنظیمات در فاز بعدی تکمیل می‌شود. این صفحه عمداً از سایر ماژول‌ها جدا نگه داشته شده است.</p>
        </section>;
    }
  };

  return <main className="app-shell">
    <aside className="sidebar glass glass--dark" aria-label="ناوبری اصلی">
      <div className="brand-block"><div className="brand-mark" aria-hidden="true">T</div><div><strong>طلوع</strong><span>کنترل کیفیت بتن</span></div></div>
      <nav className="nav-stack">
        {NAV_ITEMS.map((item) => <button
          key={item.id}
          type="button"
          className={`nav-item${activeView === item.id ? ' nav-item--active' : ''}`}
          aria-current={activeView === item.id ? 'page' : undefined}
          onClick={() => setActiveView(item.id)}
        ><span>{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="sidebar-footer">
        <div className="connection"><span className={`dot dot--${health}`} />{health === 'ok' ? 'دیتابیس و سامانه آماده است' : health === 'error' ? 'خطای ارتباط داخلی' : 'در حال بررسی'}</div>
        <button type="button" className={`nav-item${activeView === 'settings' ? ' nav-item--active' : ''}`} onClick={() => setActiveView('settings')}><span>⚙</span>تنظیمات</button>
      </div>
    </aside>
    <section className="workspace">
      <header className="topbar glass">
        <div><p className="eyebrow">آزمایشگاه مرکزی</p><h1>{activeTitle}</h1></div>
        <div className="topbar-actions"><div className="date-chip">{persianDate}</div><button className="avatar-button" aria-label="حساب کاربری">ا.ا</button></div>
      </header>
      <div className="content-grid">{renderWorkspace()}</div>
    </section>
  </main>;
}
