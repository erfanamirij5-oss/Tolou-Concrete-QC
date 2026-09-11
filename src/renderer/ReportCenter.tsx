import { useState } from 'react';
import type { ReactNode } from 'react';
import { SamplingSeriesReportWorkbench } from './SamplingSeriesReportWorkbench';
import { ProjectQcReportWorkbench } from './ProjectQcReportWorkbench';
import { StatisticalQcReportWorkbench } from './StatisticalQcReportWorkbench';
import './report-center.css';

type ReportMode='test'|'project'|'statistics';

function ReportIcon({children}:{children:ReactNode}){
  return <span className="report-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg></span>;
}

const TestReportIcon=()=> <ReportIcon><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/><circle cx="16.5" cy="16.5" r="2.5"/></ReportIcon>;
const ProjectReportIcon=()=> <ReportIcon><path d="M3 7h7l2 2h9v10H3z"/><path d="M7 13h10M7 16h7"/></ReportIcon>;
const StatisticsReportIcon=()=> <ReportIcon><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="m4 8 6-4 6 6 5-4"/></ReportIcon>;

export function ReportCenter({refreshKey=0,initialProjectId=''}:{refreshKey?:number;initialProjectId?:string}){
  const[mode,setMode]=useState<ReportMode>('test');
  return <section className="report-center-shell">
    <section className="workspace-intro report-center-intro"><p className="eyebrow">خروجی‌های کنترل کیفیت</p><h2>مرکز گزارش‌ها</h2><p>فقط سه نوع خروجی وجود دارد؛ ماهانه، فصلی و سالانه نوع گزارش نیستند و در «گزارش آماری» به‌صورت بازه و فیلتر انتخاب می‌شوند.</p></section>
    <div className="report-mode-picker glass" role="tablist" aria-label="نوع گزارش">
      <button type="button" className={mode==='test'?'is-active':''} onClick={()=>setMode('test')}><TestReportIcon/><strong>گزارش آزمون</strong><small>یک نوبت نمونه‌برداری</small></button>
      <button type="button" className={mode==='project'?'is-active':''} onClick={()=>setMode('project')}><ProjectReportIcon/><strong>گزارش پروژه</strong><small>کل پرونده QC پروژه</small></button>
      <button type="button" className={mode==='statistics'?'is-active':''} onClick={()=>setMode('statistics')}><StatisticsReportIcon/><strong>گزارش آماری</strong><small>بازه زمانی و مقایسه مهندسی</small></button>
    </div>
    <div className="report-mode-content">
      {mode==='test'&&<SamplingSeriesReportWorkbench refreshKey={refreshKey} initialProjectId={initialProjectId}/>} 
      {mode==='project'&&<ProjectQcReportWorkbench refreshKey={refreshKey}/>} 
      {mode==='statistics'&&<StatisticalQcReportWorkbench refreshKey={refreshKey}/>} 
    </div>
  </section>;
}
