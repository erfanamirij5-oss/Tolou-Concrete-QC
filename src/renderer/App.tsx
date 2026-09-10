import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProjectWorkbench } from './ProjectWorkbench';
import { ReviewWorkspace } from './ReviewWorkspace';
import { EngineeringWorkbench } from './EngineeringWorkbench';
import { QcPartiesWorkbench } from './QcPartiesWorkbench';
import { AnalyticsWorkbench } from './AnalyticsWorkbench';
import { ProjectQcReportWorkbench } from './ProjectQcReportWorkbench';
import { SamplingWorkspace } from './SamplingWorkspace';
import { FreshConcreteWorkspace } from './FreshConcreteWorkspace';
import { ResultEntryWorkspace } from './ResultEntryWorkspace';
import { SpecimenListWorkspace } from './SpecimenListWorkspace';
import { isoToPersianLocal } from './jalali';
import type { DashboardSummary } from '../shared/ipc';
import { AnalyticsIcon, DashboardIcon, FreshIcon, MixIcon, ProjectsIcon, ReportsIcon, ResultIcon, ReviewIcon, SamplingIcon, SettingsIcon, SpecimenIcon } from './RecoveryIcons';
import './ui-recovery.css';

type Metric = { label: string; value: string; hint: string; tone?: 'ok' | 'warn' | 'danger' };
type WorkspaceView = 'dashboard'|'projects'|'sampling'|'fresh'|'specimens'|'results'|'review'|'analytics'|'reports'|'mixes'|'settings';
type NavItem = { id: WorkspaceView; label: string; title: string; icon: typeof DashboardIcon };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS:NavSection[]=[
  {label:'',items:[{id:'dashboard',label:'داشبورد',title:'داشبورد کنترل کیفیت',icon:DashboardIcon}]},
  {label:'عملیات',items:[
    {id:'projects',label:'پروژه‌ها',title:'پروژه‌ها و بتن‌ریزی‌ها',icon:ProjectsIcon},
    {id:'sampling',label:'نمونه‌برداری',title:'ثبت نمونه‌برداری',icon:SamplingIcon},
    {id:'fresh',label:'بتن تازه',title:'آزمایش بتن تازه',icon:FreshIcon},
    {id:'specimens',label:'نمونه‌ها',title:'فهرست نمونه‌ها',icon:SpecimenIcon},
    {id:'results',label:'ثبت نتایج',title:'ثبت نتیجه آزمون',icon:ResultIcon},
  ]},
  {label:'کنترل کیفیت',items:[
    {id:'review',label:'بررسی و تأیید',title:'بررسی و تأیید نتایج',icon:ReviewIcon},
    {id:'analytics',label:'تحلیل و هشدارها',title:'تحلیل و هشدارهای کنترل کیفیت',icon:AnalyticsIcon},
    {id:'reports',label:'گزارش‌ها',title:'گزارش‌های کنترل کیفیت',icon:ReportsIcon},
  ]},
  {label:'مهندسی',items:[{id:'mixes',label:'طرح‌های اختلاط',title:'طرح‌های اختلاط و مشخصات مهندسی',icon:MixIcon}]},
];

const emptyDashboard:DashboardSummary={activeProjects:0,totalSeries:0,pendingResults:0,draftResults:0,dueSoonCount:0,overdueCount:0,dueSchedule:[]};

export function App(){
  const[clock,setClock]=useState(new Date());
  const[health,setHealth]=useState<'checking'|'ok'|'error'>('checking');
  const[dashboard,setDashboard]=useState<DashboardSummary>(emptyDashboard);
  const[dataVersion,setDataVersion]=useState(0);
  const[activeView,setActiveView]=useState<WorkspaceView>('dashboard');
  const[samplingProjectId,setSamplingProjectId]=useState('');

  const refreshDashboard=useCallback(async()=>{const result=await window.tolou.dashboard();if(!result.ok)throw new Error(result.message);setDashboard(result.data);},[]);
  const dataChanged=useCallback(()=>{setDataVersion(value=>value+1);void refreshDashboard();},[refreshDashboard]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(new Date()),60_000);Promise.all([window.tolou.health(),refreshDashboard()]).then(()=>setHealth('ok')).catch(()=>setHealth('error'));return()=>window.clearInterval(timer);},[refreshDashboard]);

  const metrics:Metric[]=useMemo(()=>[
    {label:'موعد تا ۴۸ ساعت',value:dashboard.dueSoonCount.toLocaleString('fa-IR'),hint:'نیازمند آماده‌سازی',tone:dashboard.dueSoonCount?'warn':'ok'},
    {label:'موعد گذشته',value:dashboard.overdueCount.toLocaleString('fa-IR'),hint:'نیازمند اقدام فوری',tone:dashboard.overdueCount?'danger':'ok'},
    {label:'منتظر نتیجه',value:dashboard.pendingResults.toLocaleString('fa-IR'),hint:'نمونه‌های بدون نتیجه',tone:dashboard.pendingResults?'warn':'ok'},
    {label:'منتظر تأیید',value:dashboard.draftResults.toLocaleString('fa-IR'),hint:'پیش‌نویس‌های ثبت‌شده',tone:dashboard.draftResults?'warn':'ok'},
  ],[dashboard]);

  const persianDate=useMemo(()=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(clock),[clock]);
  const flatItems=NAV_SECTIONS.flatMap(section=>section.items);
  const activeTitle=activeView==='settings'?'تنظیمات و اطلاعات پایه':flatItems.find(item=>item.id===activeView)?.title??'داشبورد کنترل کیفیت';
  const urgent=dashboard.dueSchedule.filter(item=>item.status!=='scheduled');
  const upcoming=dashboard.dueSchedule.filter(item=>item.status==='scheduled').slice(0,8);

  const goSampling=(projectId?:string)=>{setSamplingProjectId(projectId??'');setActiveView('sampling');};
  const renderScheduleRow=(item:DashboardSummary['dueSchedule'][number])=>{
    const age=item.ageDays===null?'شاهد':`${item.ageDays.toLocaleString('fa-IR')} روزه`;
    const status=item.status==='overdue'?'موعد گذشته':item.status==='warning'?'تا ۴۸ ساعت':'برنامه‌ریزی‌شده';
    return <button type="button" className={`due-row due-row--${item.status}`} key={item.sampleId} onClick={()=>setActiveView('results')}><span><strong>{age}</strong><small>{item.projectName??item.title??'نمونه آزمایشگاه'}</small></span><span><strong>{isoToPersianLocal(item.dueAt)}</strong><small>نمونه‌برداری: {isoToPersianLocal(item.sampledAt)}</small></span><span className="due-status">{status}</span></button>;
  };

  const renderWorkspace=()=>{switch(activeView){
    case'dashboard':return <>
      <section className="workspace-intro"><p className="eyebrow eyebrow--accent">امروز</p><h2>مواردی که الان نیاز به توجه دارند</h2><p>داشبورد فقط کارهای جاری را نشان می‌دهد؛ ثبت اطلاعات، تحلیل و گزارش هرکدام در بخش مستقل انجام می‌شوند.</p></section>
      <section className="metrics-grid" aria-label="وضعیت امروز">{metrics.map(metric=><article className="metric-card glass" key={metric.label}><div className="metric-header"><span>{metric.label}</span><i className={`metric-light metric-light--${metric.tone??'neutral'}`}/></div><strong>{metric.value}</strong><small>{metric.hint}</small></article>)}</section>
      <section className="quick-actions" aria-label="شروع سریع">
        <button className="quick-action" onClick={()=>setActiveView('projects')}><ProjectsIcon/><span><strong>پروژه و بتن‌ریزی</strong><small>شروع یک پرونده عملیاتی</small></span></button>
        <button className="quick-action" onClick={()=>goSampling()}><SamplingIcon/><span><strong>ثبت نمونه‌برداری</strong><small>ایجاد خودکار نمونه‌های ۷ و ۲۸ روزه</small></span></button>
        <button className="quick-action" onClick={()=>setActiveView('results')}><ResultIcon/><span><strong>ثبت نتیجه</strong><small>ثبت پیش‌نویس آزمون مقاومت</small></span></button>
        <button className="quick-action" onClick={()=>setActiveView('review')}><ReviewIcon/><span><strong>بررسی و تأیید</strong><small>رسیدگی به نتایج ثبت‌شده</small></span></button>
      </section>
      <section className="panel glass panel--wide due-panel"><div className="panel-heading"><div><p className="eyebrow">نیازمند اقدام</p><h3>موعدهای فوری آزمایش</h3></div><button className="text-button" onClick={()=>setActiveView('specimens')}>مشاهده همه نمونه‌ها</button></div>{urgent.length===0?<div className="due-empty">در حال حاضر نمونه عقب‌افتاده یا دارای موعد کمتر از ۴۸ ساعت وجود ندارد.</div>:<div className="due-list">{urgent.map(renderScheduleRow)}</div>}</section>
      <section className="panel glass panel--wide due-panel"><div className="panel-heading"><div><p className="eyebrow">برنامه بعدی</p><h3>موعدهای آینده</h3></div></div>{upcoming.length===0?<div className="due-empty">موعد آینده‌ای ثبت نشده است.</div>:<div className="due-list">{upcoming.map(renderScheduleRow)}</div>}</section>
    </>;
    case'projects':return <><section className="workspace-intro"><p className="eyebrow">عملیات</p><h2>پروژه‌ها و بتن‌ریزی‌ها</h2><p>پروژه را ایجاد کنید، بتن‌ریزی را ثبت کنید و مستقیماً نمونه‌برداری را شروع کنید.</p></section><ProjectWorkbench onChanged={dataChanged} refreshKey={dataVersion} onStartSampling={goSampling}/></>;
    case'sampling':return <SamplingWorkspace onChanged={dataChanged} refreshKey={dataVersion} initialProjectId={samplingProjectId}/>;
    case'fresh':return <FreshConcreteWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'specimens':return <SpecimenListWorkspace refreshKey={dataVersion} onOpenResult={()=>setActiveView('results')}/>;
    case'results':return <ResultEntryWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'review':return <ReviewWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'analytics':return <AnalyticsWorkbench refreshKey={dataVersion}/>;
    case'reports':return <ProjectQcReportWorkbench refreshKey={dataVersion}/>;
    case'mixes':return <EngineeringWorkbench onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'settings':return <><section className="workspace-intro"><p className="eyebrow">سیستم</p><h2>تنظیمات و اطلاعات پایه</h2><p>مشتری‌ها، منابع بتن و آزمایشگاه‌ها داده‌های مرجع هستند و از عملیات روزمره جدا شده‌اند.</p></section><div className="settings-note">اطلاعات پایه QC در این بخش مدیریت می‌شود. تنظیمات شرکت و مجوزها در مراحل بعدی تکمیل خواهند شد.</div><div className="master-data-shell"><QcPartiesWorkbench onChanged={dataChanged} refreshKey={dataVersion}/></div></>;
  }};

  return <main className="app-shell"><aside className="sidebar glass glass--dark" aria-label="ناوبری اصلی"><div className="brand-block"><div className="brand-mark" aria-hidden="true">T</div><div><strong>طلوع</strong><span>کنترل کیفیت بتن</span></div></div><nav>{NAV_SECTIONS.map(section=><div className="nav-section" key={section.label||'home'}>{section.label&&<div className="nav-section-label">{section.label}</div>}{section.items.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={`nav-item ${activeView===item.id?'nav-item--active':''}`} aria-current={activeView===item.id?'page':undefined} onClick={()=>item.id==='sampling'?goSampling():setActiveView(item.id)}><Icon/>{item.label}</button>;})}</div>)}</nav><div className="sidebar-footer"><div className="connection"><span className={`dot dot--${health}`}/>{health==='ok'?'سامانه آماده است':health==='error'?'خطای ارتباط داخلی':'در حال بررسی'}</div><button type="button" className={`nav-item ${activeView==='settings'?'nav-item--active':''}`} onClick={()=>setActiveView('settings')}><SettingsIcon/>تنظیمات</button></div></aside><section className="workspace"><header className="topbar glass"><div><p className="eyebrow">Tolou Concrete QC</p><h1>{activeTitle}</h1></div><div className="topbar-actions"><div className="date-chip">{persianDate}</div></div></header><div className="content-grid">{renderWorkspace()}</div></section></main>;
}
