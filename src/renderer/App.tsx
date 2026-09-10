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
import { SystemCenter } from './SystemCenter';
import { isoToPersianLocal } from './jalali';
import type { DashboardSummary } from '../shared/ipc';
import { AnalyticsIcon, DashboardIcon, FreshIcon, MixIcon, ProjectsIcon, ReportsIcon, ResultIcon, ReviewIcon, SamplingIcon, SettingsIcon, SpecimenIcon } from './RecoveryIcons';
import './ui-recovery.css';

type Metric = { label: string; value: string; hint: string; tone?: 'ok' | 'warn' | 'danger' };
type WorkspaceView = 'dashboard'|'projects'|'sampling'|'fresh'|'specimens'|'results'|'review'|'analytics'|'reports'|'mixes'|'settings';
type NavItem = { id: WorkspaceView; label: string; title: string; icon: typeof DashboardIcon };
type NavSection = { label: string; items: NavItem[] };
type DueItem = DashboardSummary['dueSchedule'][number];
type DueGroup = {key:string;projectLabel:string;kind:DueItem['kind'];projectId:string|null;ageDays:number|null;status:DueItem['status'];nearestDueAt:string;latestSampledAt:string;count:number;};

const NAV_SECTIONS:NavSection[]=[
  {label:'',items:[{id:'dashboard',label:'داشبورد',title:'داشبورد کنترل کیفیت',icon:DashboardIcon}]},
  {label:'عملیات',items:[{id:'projects',label:'پروژه‌ها',title:'پروژه‌ها و بتن‌ریزی‌ها',icon:ProjectsIcon},{id:'sampling',label:'نمونه‌برداری',title:'ثبت نمونه‌برداری',icon:SamplingIcon},{id:'fresh',label:'بتن تازه',title:'آزمایش بتن تازه',icon:FreshIcon},{id:'specimens',label:'نمونه‌ها',title:'فهرست نمونه‌ها',icon:SpecimenIcon},{id:'results',label:'ثبت نتایج',title:'ثبت نتیجه آزمون',icon:ResultIcon}]},
  {label:'کنترل کیفیت',items:[{id:'review',label:'بررسی و تأیید',title:'بررسی و تأیید نتایج',icon:ReviewIcon},{id:'analytics',label:'تحلیل و هشدارها',title:'تحلیل و هشدارهای کنترل کیفیت',icon:AnalyticsIcon},{id:'reports',label:'گزارش‌ها',title:'گزارش‌های کنترل کیفیت',icon:ReportsIcon}]},
  {label:'مهندسی',items:[{id:'mixes',label:'طرح‌های اختلاط',title:'طرح‌های اختلاط و مشخصات مهندسی',icon:MixIcon}]},
];

const emptyDashboard:DashboardSummary={activeProjects:0,totalSeries:0,pendingResults:0,draftResults:0,dueSoonCount:0,overdueCount:0,dueSchedule:[]};
function groupDueItems(items:DueItem[]):DueGroup[]{const groups=new Map<string,DueGroup>();for(const item of items){const projectLabel=item.kind==='customer'?(item.projectName??'پروژه بدون نام'):`کنترل داخلی${item.title?` — ${item.title}`:''}`;const ownerKey=item.kind==='customer'?(item.projectId??projectLabel):(item.title??item.seriesId);const ageKey=item.ageDays===null?'witness':String(item.ageDays);const key=`${item.kind}|${ownerKey}|${ageKey}|${item.status}`;const current=groups.get(key);if(!current){groups.set(key,{key,projectLabel,kind:item.kind,projectId:item.projectId,ageDays:item.ageDays,status:item.status,nearestDueAt:item.dueAt,latestSampledAt:item.sampledAt,count:1});continue;}current.count+=1;if(item.dueAt<current.nearestDueAt)current.nearestDueAt=item.dueAt;if(item.sampledAt>current.latestSampledAt)current.latestSampledAt=item.sampledAt;}return[...groups.values()].sort((a,b)=>a.nearestDueAt.localeCompare(b.nearestDueAt));}

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
  const groupedDue=useMemo(()=>groupDueItems(dashboard.dueSchedule),[dashboard.dueSchedule]);
  const urgentGroups=groupedDue.filter(item=>item.status!=='scheduled');
  const upcomingGroups=groupedDue.filter(item=>item.status==='scheduled').slice(0,8);
  const warningProjectCount=new Set(groupedDue.filter(item=>item.status==='warning').map(item=>`${item.kind}|${item.projectId??item.projectLabel}`)).size;
  const overdueProjectCount=new Set(groupedDue.filter(item=>item.status==='overdue').map(item=>`${item.kind}|${item.projectId??item.projectLabel}`)).size;
  const metrics:Metric[]=useMemo(()=>[{label:'پروژه با موعد تا ۴۸ ساعت',value:warningProjectCount.toLocaleString('fa-IR'),hint:`${dashboard.dueSoonCount.toLocaleString('fa-IR')} نمونه نزدیک موعد`,tone:dashboard.dueSoonCount?'warn':'ok'},{label:'پروژه دارای تأخیر',value:overdueProjectCount.toLocaleString('fa-IR'),hint:`${dashboard.overdueCount.toLocaleString('fa-IR')} نمونه عقب‌افتاده`,tone:dashboard.overdueCount?'danger':'ok'},{label:'منتظر نتیجه',value:dashboard.pendingResults.toLocaleString('fa-IR'),hint:'نمونه‌های بدون نتیجه',tone:dashboard.pendingResults?'warn':'ok'},{label:'منتظر تأیید',value:dashboard.draftResults.toLocaleString('fa-IR'),hint:'پیش‌نویس‌های ثبت‌شده',tone:dashboard.draftResults?'warn':'ok'}],[dashboard,warningProjectCount,overdueProjectCount]);
  const persianDate=useMemo(()=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(clock),[clock]);
  const flatItems=NAV_SECTIONS.flatMap(section=>section.items);
  const activeTitle=activeView==='settings'?'تنظیمات و اطلاعات پایه':flatItems.find(item=>item.id===activeView)?.title??'داشبورد کنترل کیفیت';
  const goSampling=(projectId?:string)=>{setSamplingProjectId(projectId??'');setActiveView('sampling');};
  const renderDueGroup=(group:DueGroup)=>{const age=group.ageDays===null?'نمونه شاهد':`نمونه‌های ${group.ageDays.toLocaleString('fa-IR')} روزه`;const status=group.status==='overdue'?'موعد گذشته':group.status==='warning'?'موعد در ۴۸ ساعت آینده':'برنامه آینده';return <button type="button" className={`due-row due-row--${group.status}`} key={group.key} onClick={()=>setActiveView(group.status==='scheduled'?'specimens':'results')}><span><strong>{group.projectLabel}</strong><small>{age} · {group.count.toLocaleString('fa-IR')} نمونه</small></span><span><strong>{status}</strong><small>نزدیک‌ترین موعد: {isoToPersianLocal(group.nearestDueAt)}</small></span><span className="due-status">{group.kind==='customer'?'پروژه مشتری':'کنترل داخلی'}</span></button>;};
  const renderWorkspace=()=>{switch(activeView){
    case'dashboard':return <><section className="workspace-intro"><p className="eyebrow eyebrow--accent">امروز</p><h2>مواردی که الان نیاز به توجه دارند</h2><p>نمونه‌برداری امروز ثبت می‌شود؛ برنامه ۷ و ۲۸ روزه تا رسیدن موعد پیگیری می‌شود و سپس نمونه برای ثبت نتیجه وارد صف می‌شود.</p></section><section className="metrics-grid" aria-label="وضعیت امروز">{metrics.map(metric=><article className="metric-card glass" key={metric.label}><div className="metric-header"><span>{metric.label}</span><i className={`metric-light metric-light--${metric.tone??'neutral'}`}/></div><strong>{metric.value}</strong><small>{metric.hint}</small></article>)}</section><section className="quick-actions" aria-label="شروع سریع"><button className="quick-action" onClick={()=>setActiveView('projects')}><ProjectsIcon/><span><strong>پروژه و بتن‌ریزی</strong><small>شروع یک پرونده عملیاتی</small></span></button><button className="quick-action" onClick={()=>goSampling()}><SamplingIcon/><span><strong>ثبت نمونه‌برداری</strong><small>ساخت برنامه ۷ و ۲۸ روزه</small></span></button><button className="quick-action" onClick={()=>setActiveView('results')}><ResultIcon/><span><strong>ثبت نتیجه امروز</strong><small>فقط نمونه‌های موعدرسیده</small></span></button><button className="quick-action" onClick={()=>setActiveView('review')}><ReviewIcon/><span><strong>بررسی و تأیید</strong><small>رسیدگی به نتایج ثبت‌شده</small></span></button></section><section className="panel glass panel--wide due-panel"><div className="panel-heading"><div><p className="eyebrow">یادآور پروژه‌ها</p><h3>موعدهای فوری و ۴۸ ساعت آینده</h3></div><button className="text-button" onClick={()=>setActiveView('specimens')}>مشاهده برنامه کامل</button></div>{urgentGroups.length===0?<div className="due-empty">در حال حاضر پروژه‌ای با نمونه عقب‌افتاده یا دارای موعد کمتر از ۴۸ ساعت وجود ندارد.</div>:<div className="due-list">{urgentGroups.map(renderDueGroup)}</div>}</section><section className="panel glass panel--wide due-panel"><div className="panel-heading"><div><p className="eyebrow">برنامه پروژه‌ها</p><h3>موعدهای بعدی ۷ و ۲۸ روزه</h3></div></div>{upcomingGroups.length===0?<div className="due-empty">برای پروژه‌ها موعد آینده‌ای ثبت نشده است.</div>:<div className="due-list">{upcomingGroups.map(renderDueGroup)}</div>}</section></>;
    case'projects':return <><section className="workspace-intro"><p className="eyebrow">عملیات</p><h2>پروژه‌ها و بتن‌ریزی‌ها</h2><p>پروژه را ایجاد کنید، بتن‌ریزی را ثبت کنید و مستقیماً نمونه‌برداری را شروع کنید.</p></section><ProjectWorkbench onChanged={dataChanged} refreshKey={dataVersion} onStartSampling={goSampling}/></>;
    case'sampling':return <SamplingWorkspace onChanged={dataChanged} refreshKey={dataVersion} initialProjectId={samplingProjectId} onOpenSchedule={()=>setActiveView('specimens')}/>;
    case'fresh':return <FreshConcreteWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'specimens':return <SpecimenListWorkspace refreshKey={dataVersion} onOpenResult={()=>setActiveView('results')}/>;
    case'results':return <ResultEntryWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'review':return <ReviewWorkspace onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'analytics':return <AnalyticsWorkbench refreshKey={dataVersion}/>;
    case'reports':return <ProjectQcReportWorkbench refreshKey={dataVersion}/>;
    case'mixes':return <EngineeringWorkbench onChanged={dataChanged} refreshKey={dataVersion}/>;
    case'settings':return <><section className="workspace-intro"><p className="eyebrow">سیستم</p><h2>تنظیمات و اطلاعات پایه</h2><p>مشخصات سازمانی، پشتیبان‌گیری و داده‌های مرجع از عملیات روزمره جدا شده‌اند.</p></section><SystemCenter mode="settings"/><div className="master-data-shell"><QcPartiesWorkbench onChanged={dataChanged} refreshKey={dataVersion}/></div></>;
  }};
  return <><SystemCenter mode="onboarding"/><main className="app-shell"><aside className="sidebar glass glass--dark" aria-label="ناوبری اصلی"><div className="brand-block"><div className="brand-mark" aria-hidden="true">T</div><div><strong>طلوع</strong><span>کنترل کیفیت بتن</span></div></div><SystemCenter mode="sidebar"/><nav>{NAV_SECTIONS.map(section=><div className="nav-section" key={section.label||'home'}>{section.label&&<div className="nav-section-label">{section.label}</div>}{section.items.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={`nav-item ${activeView===item.id?'nav-item--active':''}`} aria-current={activeView===item.id?'page':undefined} onClick={()=>item.id==='sampling'?goSampling():setActiveView(item.id)}><Icon/>{item.label}</button>;})}</div>)}</nav><div className="sidebar-footer"><div className="connection"><span className={`dot dot--${health}`}/>{health==='ok'?'سامانه آماده است':health==='error'?'خطای ارتباط داخلی':'در حال بررسی'}</div><button type="button" className={`nav-item ${activeView==='settings'?'nav-item--active':''}`} onClick={()=>setActiveView('settings')}><SettingsIcon/>تنظیمات</button></div></aside><section className="workspace"><header className="topbar glass"><div><p className="eyebrow">Tolou Concrete QC</p><h1>{activeTitle}</h1></div><div className="topbar-actions"><SystemCenter mode="topbar"/><div className="date-chip">{persianDate}</div></div></header><div className="content-grid">{renderWorkspace()}</div></section></main></>;
}
