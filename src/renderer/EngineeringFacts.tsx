import type { SVGProps } from 'react';
import './engineering-facts.css';
import './result-context-enhancement.css';

type IconProps = SVGProps<SVGSVGElement>;

type DashboardFactStripProps = {
  activeProjects: number;
  totalSeries: number;
  pendingResults: number;
  draftResults: number;
};

function FactIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function ProjectsFactIcon(props: IconProps) {
  return <FactIcon {...props}><path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></FactIcon>;
}

function SeriesFactIcon(props: IconProps) {
  return <FactIcon {...props}><path d="m7 7 5-3 5 3v10l-5 3-5-3Z"/><path d="m7 7 5 3 5-3M12 10v10"/><path d="M3.5 9.5v7L7 18.7M20.5 9.5v7L17 18.7"/></FactIcon>;
}

function PendingFactIcon(props: IconProps) {
  return <FactIcon {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></FactIcon>;
}

function ApprovalFactIcon(props: IconProps) {
  return <FactIcon {...props}><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h4"/><path d="m10 16 1.5 1.5L15 14"/></FactIcon>;
}

export function DashboardFactStrip({ activeProjects, totalSeries, pendingResults, draftResults }: DashboardFactStripProps) {
  const facts = [
    { label: 'پروژه فعال', value: activeProjects, icon: ProjectsFactIcon, tone: 'navy' },
    { label: 'سری نمونه', value: totalSeries, icon: SeriesFactIcon, tone: 'steel' },
    { label: 'منتظر نتیجه', value: pendingResults, icon: PendingFactIcon, tone: pendingResults > 0 ? 'copper' : 'ok' },
    { label: 'منتظر تأیید', value: draftResults, icon: ApprovalFactIcon, tone: draftResults > 0 ? 'copper' : 'ok' },
  ] as const;

  return (
    <section className="engineering-fact-strip" aria-label="خلاصه عملیاتی امروز">
      <div className="engineering-fact-strip__lead">
        <span className="engineering-fact-strip__pulse" aria-hidden="true" />
        <div>
          <strong>امروز در یک نگاه</strong>
          <small>خلاصه عملیاتی کنترل کیفیت</small>
        </div>
      </div>
      <div className="engineering-fact-strip__facts">
        {facts.map(({ label, value, icon: Icon, tone }) => (
          <div className={`engineering-fact engineering-fact--${tone}`} key={label}>
            <span className="engineering-fact__icon"><Icon /></span>
            <span className="engineering-fact__copy">
              <strong>{value.toLocaleString('fa-IR')}</strong>
              <small>{label}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
