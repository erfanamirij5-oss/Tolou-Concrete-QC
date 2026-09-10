import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsMetric, AnalyticsSummary, FreshConcreteSummary, PourContextSummary, PourSpecification, SampleSummary, SeriesSummary, SpecimenPhysicsSummary } from '../shared/ipc';
import { isoToPersianLocal } from './jalali';
import './project-management-snapshot.css';

type PeriodKey='all'|'30'|'90'|'180'|'365';
type MasterRow={
  seriesId:string;sampledAt:string;samplerName:string;pourId:string|null;sourceName:string;mixLabel:string;concreteClass:string;elementName:string;
  specifiedStrengthMpa:number|null;targetSlumpMm:number|null;slumpMm:number|null;temperatureC:number|null;
  strength7:number[];strength28:number[];mean7:number|null;mean28:number|null;sd28:number|null;cv28:number|null;densityMean:number|null;
  approvedCount:number;draftCount:number;pendingCount:number;overdueCount:number;status:'overdue'|'review'|'complete'|'progress';
};

type LoadedContext={series:SeriesSummary[];contexts:PourContextSummary[];fresh:Map<string,FreshConcreteSummary|null>;physics:Map<string,SpecimenPhysicsSummary>;specs:Map<string,PourSpecification|null>};

const n=(value:number|null,digits=1)=>value===null?'—':value.toLocaleString('fa-IR',{maximumFractionDigits:digits});
const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const sd=(values:number[])=>{if(values.length<2)return null;const m=mean(values)!;return Math.sqrt(values.reduce((sum,value)=>sum+(value-m)**2,0)/(values.length-1));};
const cv=(values:number[])=>{const m=mean(values),s=sd(values);return m&&s!==null?(s/Math.abs(m))*100:null;};

function TrendChart({metric}:{metric:AnalyticsMetric}){
  const points=metric.trend;
  if(points.length<2)return <div className="project-mini-empty">برای نمایش روند، حداقل دو داده لازم است.</div>;
  const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const poly=points.map((p,i)=>`${(i/(points.length-1))*100},${86-((p.value-min)/span)*68}`).join(' ');
  return <svg className="project-mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`روند ${metric.name}`}><polyline points={poly}/>{points.map((p,i)=><circle key={`${p.at}-${i}`} cx={(i/(points.length-1))*100} cy={86-((p.value-min)/span)*68} r="1.45"/>)}</svg>;
}

function Scatter({rows}:{rows:MasterRow[]}){
  const points=rows.filter(r=>r.slumpMm!==null&&r.mean28!==null) as Array<MasterRow&{slumpMm:number;mean28:number}>;
  if(points.length<2)return <div className="project-mini-empty">برای تحلیل رابطه اسلامپ و مقاومت ۲۸ روزه، حداقل دو نوبت کامل لازم است.</div>;
  const xs=points.map(p=>p.slumpMm),ys=points.map(p=>p.mean28),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),xspan=xmax-xmin||1,yspan=ymax-ymin||1;
  return <svg className="project-scatter" viewBox="0 0 100 100" role="img" aria-label="رابطه اسلامپ و مقاومت ۲۸ روزه"><line x1="10" y1="88" x2="96" y2="88"/><line x1="10" y1="8" x2="10" y2="88"/>{points.map(p=><circle key={p.seriesId} cx={10+((p.slumpMm-xmin)/xspan)*86} cy={88-((p.mean28-ymin)/yspan)*80} r="2"><title>{`اسلامپ ${p.slumpMm} mm، مقاومت ۲۸ روزه ${p.mean28.toFixed(2)} MPa`}</title></circle>)}</svg>;
}

function periodStart(period:PeriodKey){if(period==='all')return null;return Date.now()-Number(period)*24*3600_000;}

export function ProjectManagementSnapshot({projectId,samples}:{projectId:string;samples:SampleSummary[]}){
  const[analytics,setAnalytics]=useState<AnalyticsSummary|null>(null);
  const[context,setContext]=useState<LoadedContext|null>(null);
  const[message,setMessage]=useState('');
  const[period,setPeriod]=useState<PeriodKey>('all');
  const[source,setSource]=useState('all');
  const[mix,setMix]=useState('all');
  const[concreteClass,setConcreteClass]=useState('all');
  const[expanded,setExpanded]=useState<string|null>(null);

  useEffect(()=>{let active=true;setMessage('');(async()=>{
    const [a,s,c,p]=await Promise.all([window.tolou.analyticsSummary({projectId}),window.tolou.listSeries('customer',projectId),window.tolou.listPourContexts(projectId),window.tolou.listSpecimenPhysics(5000)]);
    if(!a.ok)throw new Error(a.message);if(!s.ok)throw new Error(s.message);if(!c.ok)throw new Error(c.message);if(!p.ok)throw new Error(p.message);
    const pourIds=[...new Set(s.data.map(x=>x.pour_id).filter((x):x is string=>Boolean(x)))];
    const [freshResults,specResults]=await Promise.all([
      Promise.all(s.data.map(async row=>[row.id,await window.tolou.getFreshConcrete(row.id)] as const)),
      Promise.all(pourIds.map(async id=>[id,await window.tolou.getPourSpecification(id)] as const))
    ]);
    if(!active)return;
    const fresh=new Map<string,FreshConcreteSummary|null>();for(const [id,r] of freshResults){if(!r.ok)throw new Error(r.message);fresh.set(id,r.data);}
    const specs=new Map<string,PourSpecification|null>();for(const [id,r] of specResults){if(!r.ok)throw new Error(r.message);specs.set(id,r.data);}
    setAnalytics(a.data);setContext({series:s.data,contexts:c.data,fresh,physics:new Map(p.data.map(x=>[x.sample_id,x])),specs});
  })().catch(error=>{if(active)setMessage(error instanceof Error?error.message:'تحلیل پروژه بارگذاری نشد');});return()=>{active=false};},[projectId,samples.length]);

  const masterRows=useMemo<MasterRow[]>(()=>{
    if(!context)return[];const now=Date.now();const ctxByPour=new Map(context.contexts.map(x=>[x.pour_id,x]));
    return context.series.map(series=>{
      const seriesSamples=samples.filter(x=>x.series_id===series.id);const approved7=seriesSamples.filter(x=>x.age_days===7&&x.state==='approved'&&x.strength_mpa!==null).map(x=>x.strength_mpa as number);const approved28=seriesSamples.filter(x=>x.age_days===28&&x.state==='approved'&&x.strength_mpa!==null).map(x=>x.strength_mpa as number);
      const densities=seriesSamples.map(x=>context.physics.get(x.id)?.density_kg_m3).filter((x):x is number=>typeof x==='number');const spec=series.pour_id?context.specs.get(series.pour_id)??null:null;const ctx=series.pour_id?ctxByPour.get(series.pour_id):undefined;const fresh=context.fresh.get(series.id)??null;
      const overdueCount=seriesSamples.filter(x=>x.state!=='approved'&&x.state!=='void'&&x.due_at&&Date.parse(x.due_at)<now).length;const draftCount=seriesSamples.filter(x=>x.state==='draft').length;const pendingCount=seriesSamples.filter(x=>!x.state).length;const approvedCount=seriesSamples.filter(x=>x.state==='approved').length;
      const complete=seriesSamples.filter(x=>x.age_days===28).length>0&&seriesSamples.filter(x=>x.age_days===28).every(x=>x.state==='approved'||x.state==='void');
      const status:MasterRow['status']=overdueCount?'overdue':draftCount?'review':complete?'complete':'progress';
      return{seriesId:series.id,sampledAt:series.sampled_at,samplerName:series.sampler_name,pourId:series.pour_id,sourceName:ctx?.concrete_source_name??'—',mixLabel:spec?.mix_code?`${spec.mix_code}${spec.mix_revision?` / R${spec.mix_revision}`:''}`:'—',concreteClass:spec?.concrete_class||'—',elementName:spec?.element_name||'—',specifiedStrengthMpa:spec?.specified_strength_mpa??null,targetSlumpMm:spec?.target_slump_mm??null,slumpMm:fresh?.slump_mm??null,temperatureC:fresh?.concrete_temperature_c??null,strength7:approved7,strength28:approved28,mean7:mean(approved7),mean28:mean(approved28),sd28:sd(approved28),cv28:cv(approved28),densityMean:mean(densities),approvedCount,draftCount,pendingCount,overdueCount,status};
    }).sort((a,b)=>b.sampledAt.localeCompare(a.sampledAt));
  },[context,samples]);

  const sources=useMemo(()=>[...new Set(masterRows.map(r=>r.sourceName).filter(x=>x!=='—'))].sort((a,b)=>a.localeCompare(b,'fa')),[masterRows]);
  const mixes=useMemo(()=>[...new Set(masterRows.map(r=>r.mixLabel).filter(x=>x!=='—'))].sort((a,b)=>a.localeCompare(b,'fa')),[masterRows]);
  const classes=useMemo(()=>[...new Set(masterRows.map(r=>r.concreteClass).filter(x=>x!=='—'))].sort((a,b)=>a.localeCompare(b,'fa')),[masterRows]);
  const filtered=useMemo(()=>{const start=periodStart(period);return masterRows.filter(r=>(start===null||Date.parse(r.sampledAt)>=start)&&(source==='all'||r.sourceName===source)&&(mix==='all'||r.mixLabel===mix)&&(concreteClass==='all'||r.concreteClass===concreteClass));},[masterRows,period,source,mix,concreteClass]);
  const filteredSampleIds=useMemo(()=>new Set(filtered.map(r=>r.seriesId)),[filtered]);
  const approved28=filtered.flatMap(r=>r.strength28),stats28={count:approved28.length,mean:mean(approved28),sd:sd(approved28),cv:cv(approved28)};
  const overdue=filtered.reduce((sum,r)=>sum+r.overdueCount,0);const result28Series=filtered.filter(r=>r.mean28!==null).length;

  const filteredStrengthMetric=useMemo<AnalyticsMetric|null>(()=>{if(!analytics)return null;return{...analytics.strength,trend:analytics.strength.trend.filter(p=>p.seriesId&&filteredSampleIds.has(p.seriesId))};},[analytics,filteredSampleIds]);
  const filteredSlumpMetric=useMemo<AnalyticsMetric|null>(()=>{if(!analytics)return null;return{...analytics.slump,trend:analytics.slump.trend.filter(p=>p.seriesId&&filteredSampleIds.has(p.seriesId))};},[analytics,filteredSampleIds]);

  if(message)return <div className="workbench-message">{message}</div>;
  if(!analytics||!context)return <div className="project-mini-empty">در حال ساخت نمای مهندسی پروژه…</div>;

  return <section className="project-management-snapshot">
    <div className="panel-heading"><div><p className="eyebrow eyebrow--accent">QC INTELLIGENCE</p><h3>تحلیل مهندسی و جدول جامع پروژه</h3><small>یک منبع داده برای صفحه، PDF و Excel</small></div><span className="project-readonly-badge">تحلیلی · بدون حکم قبولی/رد</span></div>

    <div className="qc-filter-bar">
      <label>بازه<select value={period} onChange={e=>setPeriod(e.target.value as PeriodKey)}><option value="all">کل سابقه</option><option value="30">۳۰ روز اخیر</option><option value="90">۹۰ روز اخیر</option><option value="180">۱۸۰ روز اخیر</option><option value="365">یک سال اخیر</option></select></label>
      <label>منبع بتن<select value={source} onChange={e=>setSource(e.target.value)}><option value="all">همه منابع</option>{sources.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>طرح اختلاط<select value={mix} onChange={e=>setMix(e.target.value)}><option value="all">همه طرح‌ها</option>{mixes.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>رده بتن<select value={concreteClass} onChange={e=>setConcreteClass(e.target.value)}><option value="all">همه رده‌ها</option>{classes.map(x=><option key={x}>{x}</option>)}</select></label>
      <button type="button" className="secondary-button" onClick={()=>{setPeriod('all');setSource('all');setMix('all');setConcreteClass('all')}}>پاک‌کردن فیلتر</button>
    </div>

    <div className="project-kpi-grid project-kpi-grid--six">
      <div><small>نوبت نمونه‌برداری</small><strong>{filtered.length.toLocaleString('fa-IR')}</strong><span>در فیلتر فعلی</span></div>
      <div><small>نوبت دارای نتیجه ۲۸ روزه</small><strong>{result28Series.toLocaleString('fa-IR')}</strong><span>{stats28.count.toLocaleString('fa-IR')} نتیجه تأییدشده</span></div>
      <div><small>میانگین مقاومت ۲۸ روزه</small><strong>{n(stats28.mean,2)}{stats28.mean!==null?' MPa':''}</strong><span>فقط نتایج تأییدشده</span></div>
      <div><small>SD مقاومت ۲۸ روزه</small><strong>{n(stats28.sd,2)}</strong><span>انحراف معیار نمونه</span></div>
      <div><small>CV مقاومت ۲۸ روزه</small><strong>{n(stats28.cv,1)}{stats28.cv!==null?' %':''}</strong><span>شاخص پراکندگی آماری</span></div>
      <div className={overdue?'is-danger':''}><small>نمونه عقب‌افتاده</small><strong>{overdue.toLocaleString('fa-IR')}</strong><span>{overdue?'نیازمند اقدام':'بدون تأخیر در فیلتر'}</span></div>
    </div>

    <div className="project-trend-grid project-trend-grid--decision">
      <article><div><strong>روند مقاومت فشاری</strong><small>تمام نتایج تأییدشده در فیلتر</small></div>{filteredStrengthMetric&&<TrendChart metric={filteredStrengthMetric}/>}</article>
      <article><div><strong>روند اسلامپ</strong><small>تغییرات بتن تازه</small></div>{filteredSlumpMetric&&<TrendChart metric={filteredSlumpMetric}/>}</article>
      <article><div><strong>اسلامپ در برابر مقاومت ۲۸ روزه</strong><small>Scatter برای کشف رابطه؛ نه اثبات علت</small></div><Scatter rows={filtered}/></article>
    </div>

    <div className="qc-master-section"><div className="panel-heading"><div><p className="eyebrow">MASTER QC TABLE</p><h4>جدول جامع نوبت‌های نمونه‌برداری</h4><small>هر ردیف = یک نوبت نمونه‌برداری؛ برای جزئیات روی ردیف کلیک کنید.</small></div><span className="count-badge">{filtered.length.toLocaleString('fa-IR')}</span></div>
      {!filtered.length?<div className="project-mini-empty">با فیلتر فعلی داده‌ای وجود ندارد.</div>:<div className="table-wrap qc-master-table"><table><thead><tr><th>تاریخ</th><th>منبع</th><th>طرح/رده</th><th>عضو</th><th>اسلامپ</th><th>دما</th><th>میانگین ۷d</th><th>میانگین ۲۸d</th><th>SD ۲۸d</th><th>CV ۲۸d</th><th>جرم حجمی</th><th>وضعیت</th></tr></thead><tbody>{filtered.map(row=><><tr key={row.seriesId} className="qc-master-row" onClick={()=>setExpanded(v=>v===row.seriesId?null:row.seriesId)}><td>{isoToPersianLocal(row.sampledAt)}</td><td>{row.sourceName}</td><td>{row.mixLabel}<small>{row.concreteClass}</small></td><td>{row.elementName}</td><td>{row.slumpMm===null?'—':`${n(row.slumpMm,0)} mm`}</td><td>{row.temperatureC===null?'—':`${n(row.temperatureC,1)} °C`}</td><td>{row.mean7===null?'—':`${n(row.mean7,2)} MPa`}</td><td>{row.mean28===null?'—':`${n(row.mean28,2)} MPa`}</td><td>{n(row.sd28,2)}</td><td>{row.cv28===null?'—':`${n(row.cv28,1)} %`}</td><td>{row.densityMean===null?'—':n(row.densityMean,0)}</td><td><span className={`qc-status qc-status--${row.status}`}>{row.status==='overdue'?'عقب‌افتاده':row.status==='review'?'منتظر تأیید':row.status==='complete'?'تکمیل':'در جریان'}</span></td></tr>{expanded===row.seriesId&&<tr key={`${row.seriesId}-detail`} className="qc-detail-row"><td colSpan={12}><div className="qc-detail-grid"><span><small>نمونه‌بردار</small><b>{row.samplerName||'—'}</b></span><span><small>مقاومت مشخصه/هدف ثبت‌شده</small><b>{row.specifiedStrengthMpa===null?'—':`${n(row.specifiedStrengthMpa,2)} MPa`}</b></span><span><small>اسلامپ هدف</small><b>{row.targetSlumpMm===null?'—':`${n(row.targetSlumpMm,0)} mm`}</b></span><span><small>نتایج ۷ روزه</small><b>{row.strength7.length?row.strength7.map(x=>n(x,2)).join(' ، '):'—'}</b></span><span><small>نتایج ۲۸ روزه</small><b>{row.strength28.length?row.strength28.map(x=>n(x,2)).join(' ، '):'—'}</b></span><span><small>تأیید / پیش‌نویس / بدون نتیجه</small><b>{`${row.approvedCount.toLocaleString('fa-IR')} / ${row.draftCount.toLocaleString('fa-IR')} / ${row.pendingCount.toLocaleString('fa-IR')}`}</b></span></div></td></tr>}</>)}</tbody></table></div>}
    </div>
    <p className="project-analysis-note">Mean، SD و CV در این نما آمار توصیفی هستند. هیچ چراغ قبولی/رد یا درصد انطباق تا زمان تعریف Rule Profile دارای مرجع، نسخه و تست فعال نمی‌شود.</p>
  </section>;
}
