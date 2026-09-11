import { useState } from 'react';
import { SamplingSeriesReportWorkbench } from './SamplingSeriesReportWorkbench';
import { ProjectQcReportWorkbench } from './ProjectQcReportWorkbench';
import { StatisticalQcReportWorkbench } from './StatisticalQcReportWorkbench';
import './report-center.css';

type ReportMode='test'|'project'|'statistics';

export function ReportCenter({refreshKey=0,initialProjectId=''}:{refreshKey?:number;initialProjectId?:string}){
  const[mode,setMode]=useState<ReportMode>('test');
  return <section className="report-center-shell">
    <section className="workspace-intro report-center-intro"><p className="eyebrow">خروجی‌های کنترل کیفیت</p><h2>مرکز گزارش‌ها</h2><p>فقط سه نوع خروجی وجود دارد؛ ماهانه، فصلی و سالانه نوع گزارش نیستند و در «گزارش آماری» به‌صورت بازه و فیلتر انتخاب می‌شوند.</p></section>
    <div className="report-mode-picker glass" role="tablist" aria-label="نوع گزارش">
      <button type="button" className={mode==='test'?'is-active':''} onClick={()=>setMode('test')}><strong>گزارش آزمون</strong><small>یک نوبت نمونه‌برداری</small></button>
      <button type="button" className={mode==='project'?'is-active':''} onClick={()=>setMode('project')}><strong>گزارش پروژه</strong><small>کل پرونده QC پروژه</small></button>
      <button type="button" className={mode==='statistics'?'is-active':''} onClick={()=>setMode('statistics')}><strong>گزارش آماری</strong><small>بازه زمانی و مقایسه مهندسی</small></button>
    </div>
    <div className="report-mode-content">
      {mode==='test'&&<SamplingSeriesReportWorkbench refreshKey={refreshKey} initialProjectId={initialProjectId}/>} 
      {mode==='project'&&<ProjectQcReportWorkbench refreshKey={refreshKey}/>} 
      {mode==='statistics'&&<StatisticalQcReportWorkbench refreshKey={refreshKey}/>} 
    </div>
  </section>;
}
