import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsMetric, AnalyticsSummary, SampleSummary } from '../shared/ipc';
import { isoToPersianLocal } from './jalali';
import './project-management-snapshot.css';

const n=(value:number|null,digits=1)=>value===null?'—':value.toLocaleString('fa-IR',{maximumFractionDigits:digits});
function MiniTrend({metric}:{metric:AnalyticsMetric}){
  const points=metric.trend.slice(-12);
  if(points.length<2)return <div className="project-mini-empty">برای نمایش روند، داده کافی وجود ندارد.</div>;
  const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const poly=points.map((p,i)=>`${(i/(points.length-1))*100},${88-((p.value-min)/span)*70}`).join(' ');
  return <svg className="project-mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`روند ${metric.name}`}><polyline points={poly}/>{points.map((p,i)=><circle key={`${p.at}-${i}`} cx={(i/(points.length-1))*100} cy={88-((p.value-min)/span)*70} r="1.6"/>)}</svg>;
}

export function ProjectManagementSnapshot({projectId,samples}:{projectId:string;samples:SampleSummary[]}){
  const[analytics,setAnalytics]=useState<AnalyticsSummary|null>(null);
  const[message,setMessage]=useState('');
  useEffect(()=>{let active=true;setMessage('');void window.tolou.analyticsSummary({projectId}).then(result=>{if(!active)return;if(!result.ok)throw new Error(result.message);setAnalytics(result.data);}).catch(error=>{if(active)setMessage(error instanceof Error?error.message:'تحلیل پروژه بارگذاری نشد');});return()=>{active=false};},[projectId]);
  const attention=useMemo(()=>{
    const now=Date.now(),h48=48*3600_000;
    const pending=samples.filter(x=>x.state!=='approved'&&x.state!=='void');
    return{
      overdue:pending.filter(x=>x.due_at&&Date.parse(x.due_at)<now).length,
      dueSoon:pending.filter(x=>x.due_at&&Date.parse(x.due_at)>=now&&Date.parse(x.due_at)-now<=h48).length,
      draft:samples.filter(x=>x.state==='draft').length,
      approved:samples.filter(x=>x.state==='approved').length,
    };
  },[samples]);
  const latestApproved=useMemo(()=>samples.filter(x=>x.state==='approved'&&x.strength_mpa!=null).sort((a,b)=>(b.tested_at??'').localeCompare(a.tested_at??'')).slice(0,5),[samples]);
  if(message)return <div className="workbench-message">{message}</div>;
  if(!analytics)return <div className="project-mini-empty">در حال محاسبه نمای مدیریتی پروژه…</div>;
  const age7=analytics.strength.byAge['7']??null,age28=analytics.strength.byAge['28']??null;
  return <section className="project-management-snapshot">
    <div className="panel-heading"><div><p className="eyebrow eyebrow--accent">نمای مدیریتی پروژه</p><h3>سلامت عملیاتی و روند کنترل کیفیت</h3></div><span className="project-readonly-badge">تحلیلی · فقط خواندنی</span></div>
    <div className="project-health-grid">
      <article className={attention.overdue?'is-danger':''}><small>نمونه عقب‌افتاده</small><strong>{attention.overdue.toLocaleString('fa-IR')}</strong><span>{attention.overdue?'نیازمند اقدام فوری':'بدون تأخیر ثبت‌شده'}</span></article>
      <article className={attention.dueSoon?'is-warning':''}><small>موعد تا ۴۸ ساعت</small><strong>{attention.dueSoon.toLocaleString('fa-IR')}</strong><span>{attention.dueSoon?'برای آزمون آماده شوید':'موعد نزدیک وجود ندارد'}</span></article>
      <article className={attention.draft?'is-warning':''}><small>منتظر تأیید</small><strong>{attention.draft.toLocaleString('fa-IR')}</strong><span>نتایج پیش‌نویس</span></article>
      <article><small>نتایج تأییدشده</small><strong>{attention.approved.toLocaleString('fa-IR')}</strong><span>مبنای تحلیل آماری</span></article>
    </div>
    <div className="project-kpi-grid">
      <div><small>میانگین مقاومت ۷ روزه</small><strong>{age7?n(age7.mean,2):'—'}{age7?.mean!=null?' MPa':''}</strong><span>{age7?`${age7.count.toLocaleString('fa-IR')} نتیجه تأییدشده`:'داده‌ای ثبت نشده'}</span></div>
      <div><small>میانگین مقاومت ۲۸ روزه</small><strong>{age28?n(age28.mean,2):'—'}{age28?.mean!=null?' MPa':''}</strong><span>{age28?`${age28.count.toLocaleString('fa-IR')} نتیجه تأییدشده`:'داده‌ای ثبت نشده'}</span></div>
      <div><small>میانگین اسلامپ</small><strong>{n(analytics.slump.statistics.mean)}{analytics.slump.statistics.mean!=null?' mm':''}</strong><span>{analytics.slump.statistics.count.toLocaleString('fa-IR')} اندازه‌گیری</span></div>
      <div><small>میانگین دمای بتن</small><strong>{n(analytics.concreteTemperature.statistics.mean)}{analytics.concreteTemperature.statistics.mean!=null?' °C':''}</strong><span>{analytics.concreteTemperature.statistics.count.toLocaleString('fa-IR')} اندازه‌گیری</span></div>
      <div><small>میانگین جرم حجمی سخت‌شده</small><strong>{n(analytics.hardenedDensity.statistics.mean,0)}{analytics.hardenedDensity.statistics.mean!=null?' kg/m³':''}</strong><span>{analytics.hardenedDensity.statistics.count.toLocaleString('fa-IR')} نمونه</span></div>
      <div><small>CV مقاومت</small><strong>{n(analytics.strength.statistics.cvPercent)}{analytics.strength.statistics.cvPercent!=null?' %':''}</strong><span>صرفاً شاخص آماری؛ بدون حکم قبولی/رد</span></div>
    </div>
    <div className="project-trend-grid">
      <article><div><strong>روند مقاومت فشاری</strong><small>آخرین نتایج تأییدشده</small></div><MiniTrend metric={analytics.strength}/></article>
      <article><div><strong>روند اسلامپ</strong><small>کنترل تغییرات بتن تازه</small></div><MiniTrend metric={analytics.slump}/></article>
      <article><div><strong>روند دمای بتن</strong><small>ثبت تغییرات اندازه‌گیری‌شده</small></div><MiniTrend metric={analytics.concreteTemperature}/></article>
      <article><div><strong>روند جرم حجمی</strong><small>نمونه سخت‌شده</small></div><MiniTrend metric={analytics.hardenedDensity}/></article>
    </div>
    <div className="project-latest-results"><div className="panel-heading"><div><p className="eyebrow">آخرین نتایج</p><h4>آخرین مقاومت‌های تأییدشده</h4></div></div>{latestApproved.length?<div className="table-wrap"><table><thead><tr><th>سن</th><th>مقاومت</th><th>تاریخ آزمون</th><th>آزمایش‌کننده</th></tr></thead><tbody>{latestApproved.map(row=><tr key={row.id}><td>{row.age_days===null?'شاهد':`${row.age_days.toLocaleString('fa-IR')} روزه`}</td><td>{row.strength_mpa!.toLocaleString('fa-IR',{maximumFractionDigits:2})} MPa</td><td>{row.tested_at?isoToPersianLocal(row.tested_at):'—'}</td><td>{row.tested_by||'—'}</td></tr>)}</tbody></table></div>:<div className="project-mini-empty">هنوز نتیجه تأییدشده‌ای برای پروژه وجود ندارد.</div>}</div>
    <p className="project-analysis-note">این نما توصیفی و آماری است. تا زمانی که Rule Profile مستند و نسخه استاندارد مشخص نشده باشد، نرم‌افزار هیچ نتیجه‌ای را قبول یا رد اعلام نمی‌کند.</p>
  </section>;
}
