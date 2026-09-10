import { useEffect, useMemo, useState } from 'react';

type Metric = { label: string; value: string; hint: string; tone?: 'ok' | 'warn' | 'danger' };
type SampleRow = { id: string; project: string; age: string; strength: string; status: 'تأیید' | 'هشدار' | 'در انتظار' };

const metrics: Metric[] = [
  { label: 'نمونه‌های امروز', value: '۲۴', hint: '۶ سری ثبت‌شده', tone: 'ok' },
  { label: 'آزمون‌های سررسید', value: '۹', hint: 'تا پایان شیفت', tone: 'warn' },
  { label: 'هشدار داخلی', value: '۲', hint: 'نیازمند بررسی', tone: 'danger' },
  { label: 'پروژه‌های فعال', value: '۱۲', hint: '۴ مشتری جدید' },
];

const rows: SampleRow[] = [
  { id: 'TL-1405-0218', project: 'سازه مرکزی یزد', age: '۲۸ روزه', strength: '۳۸٫۴ MPa', status: 'تأیید' },
  { id: 'TL-1405-0217', project: 'مجتمع نیلگون', age: '۷ روزه', strength: '۲۴٫۹ MPa', status: 'تأیید' },
  { id: 'TL-1405-0216', project: 'کارخانه شرق', age: '۳ روزه', strength: '—', status: 'در انتظار' },
  { id: 'TL-1405-0215', project: 'پروژه داخلی QC', age: '۲۸ روزه', strength: '۲۶٫۱ MPa', status: 'هشدار' },
];

function StatusPill({ status }: { status: SampleRow['status'] }) {
  const cls = status === 'تأیید' ? 'status status--ok' : status === 'هشدار' ? 'status status--danger' : 'status status--pending';
  return <span className={cls}>{status}</span>;
}

export function App() {
  const [clock, setClock] = useState(new Date());
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    window.tolou.health().then(() => setHealth('ok')).catch(() => setHealth('error'));
    return () => window.clearInterval(timer);
  }, []);

  const persianDate = useMemo(() => new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(clock), [clock]);

  return (
    <main className="app-shell">
      <aside className="sidebar glass glass--dark" aria-label="ناوبری اصلی">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">T</div>
          <div>
            <strong>طلوع</strong>
            <span>کنترل کیفیت بتن</span>
          </div>
        </div>

        <nav className="nav-stack">
          <button className="nav-item nav-item--active"><span>◆</span>داشبورد</button>
          <button className="nav-item"><span>◫</span>نمونه‌ها و نتایج</button>
          <button className="nav-item"><span>▦</span>پروژه‌ها</button>
          <button className="nav-item"><span>⌁</span>طرح‌های اختلاط</button>
          <button className="nav-item"><span>◉</span>تحلیل و هشدارها</button>
          <button className="nav-item"><span>▤</span>گزارش‌ها</button>
        </nav>

        <div className="sidebar-footer">
          <div className="connection"><span className={`dot dot--${health}`} />{health === 'ok' ? 'سامانه آماده است' : health === 'error' ? 'خطای ارتباط داخلی' : 'در حال بررسی'}</div>
          <button className="nav-item"><span>⚙</span>تنظیمات</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar glass">
          <div>
            <p className="eyebrow">آزمایشگاه مرکزی</p>
            <h1>داشبورد کنترل کیفیت</h1>
          </div>
          <div className="topbar-actions">
            <div className="date-chip">{persianDate}</div>
            <button className="icon-button" aria-label="اعلان‌ها">◌<span className="notification-badge">۲</span></button>
            <button className="avatar-button" aria-label="حساب کاربری">ا.ا</button>
          </div>
        </header>

        <div className="content-grid">
          <section className="hero glass">
            <div>
              <p className="eyebrow eyebrow--accent">مرکز عملیات امروز</p>
              <h2>کنترل سریع، تصمیم مهندسی، سابقه قابل ردیابی.</h2>
              <p>ثبت سری نمونه، ورود نتایج و هشدارهای داخلی در یک جریان کاری یکپارچه و آفلاین.</p>
              <div className="hero-actions">
                <button className="primary-button">ثبت سری نمونه جدید</button>
                <button className="secondary-button">ثبت نتیجه آزمون</button>
              </div>
            </div>
            <div className="hero-orbit" aria-hidden="true"><div /><div /><span>QC</span></div>
          </section>

          <section className="metrics-grid" aria-label="شاخص‌های امروز">
            {metrics.map((metric) => (
              <article className="metric-card glass" key={metric.label}>
                <div className="metric-header"><span>{metric.label}</span><i className={`metric-light metric-light--${metric.tone ?? 'neutral'}`} /></div>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </article>
            ))}
          </section>

          <section className="panel glass panel--wide">
            <div className="panel-heading">
              <div><p className="eyebrow">آخرین فعالیت‌ها</p><h3>نمونه‌ها و نتایج اخیر</h3></div>
              <button className="text-button">مشاهده همه</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>شناسه سری</th><th>پروژه</th><th>سن آزمون</th><th>مقاومت</th><th>وضعیت</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.id}><td className="mono">{row.id}</td><td>{row.project}</td><td>{row.age}</td><td>{row.strength}</td><td><StatusPill status={row.status} /></td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="panel glass">
            <div className="panel-heading"><div><p className="eyebrow">صف اقدام</p><h3>موارد نیازمند توجه</h3></div><span className="count-badge">۴</span></div>
            <div className="action-list">
              <button><span className="action-icon action-icon--danger">!</span><div><strong>۲ نتیجه زیر آستانه هشدار</strong><small>بازبینی کنترل داخلی</small></div><b>←</b></button>
              <button><span className="action-icon action-icon--warn">◷</span><div><strong>۹ آزمون سررسید امروز</strong><small>۳ پروژه مشتری</small></div><b>←</b></button>
              <button><span className="action-icon">✓</span><div><strong>۳ گزارش آماده صدور</strong><small>نیازمند تأیید مدیر</small></div><b>←</b></button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
