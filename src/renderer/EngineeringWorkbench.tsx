import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { MixDesignSummary, MixVersionSummary, PourSpecification, PourSummary, ProjectSummary } from '../shared/ipc';
import './engineering-workbench.css';

const nextId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
const optionalNumber=(value:FormDataEntryValue|null)=>value==null||String(value).trim()===''?null:Number(value);
const fieldValue=(value:string|number|null|undefined)=>value==null?'':String(value);

export function EngineeringWorkbench({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const [designs,setDesigns]=useState<MixDesignSummary[]>([]);
  const [versions,setVersions]=useState<MixVersionSummary[]>([]);
  const [projects,setProjects]=useState<ProjectSummary[]>([]);
  const [pours,setPours]=useState<PourSummary[]>([]);
  const [designId,setDesignId]=useState('');
  const [projectId,setProjectId]=useState('');
  const [pourId,setPourId]=useState('');
  const [pourSpec,setPourSpec]=useState<PourSpecification|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function reload(){
    const [mixResult,projectResult]=await Promise.all([window.tolou.listMixDesigns(),window.tolou.listProjects()]);
    if(!mixResult.ok) throw new Error(mixResult.message); if(!projectResult.ok) throw new Error(projectResult.message);
    setDesigns(mixResult.data); setProjects(projectResult.data.filter((p)=>p.archived===0));
    setDesignId((current)=>mixResult.data.some((d)=>d.id===current&&d.archived===0)?current:(mixResult.data.find((d)=>d.archived===0)?.id??''));
    setProjectId((current)=>projectResult.data.some((p)=>p.id===current&&p.archived===0)?current:(projectResult.data.find((p)=>p.archived===0)?.id??''));
  }
  useEffect(()=>{void reload().catch((e)=>setMessage(e instanceof Error?e.message:'بارگذاری اطلاعات مهندسی انجام نشد'));},[refreshKey]);
  useEffect(()=>{if(!designId){setVersions([]);return;} void window.tolou.listMixVersions(designId).then((r)=>{if(!r.ok)throw new Error(r.message);setVersions(r.data);}).catch((e)=>setMessage(e instanceof Error?e.message:'بارگذاری نسخه‌های طرح انجام نشد'));},[designId,refreshKey]);
  useEffect(()=>{if(!projectId){setPours([]);setPourId('');return;} void window.tolou.listPours(projectId).then((r)=>{if(!r.ok)throw new Error(r.message);setPours(r.data);setPourId((current)=>r.data.some((p)=>p.id===current)?current:(r.data[0]?.id??''));}).catch((e)=>setMessage(e instanceof Error?e.message:'بارگذاری بتن‌ریزی‌ها انجام نشد'));},[projectId,refreshKey]);
  useEffect(()=>{
    if(!pourId){setPourSpec(null);return;}
    void window.tolou.getPourSpecification(pourId).then((r)=>{
      if(!r.ok)throw new Error(r.message);
      setPourSpec(r.data);
      if(r.data?.mix_design_version_id){
        const design=designs.find((d)=>d.code===r.data?.mix_code);
        if(design) setDesignId(design.id);
      }
    }).catch((e)=>setMessage(e instanceof Error?e.message:'بازیابی مشخصات بتن‌ریزی انجام نشد'));
  },[pourId,refreshKey,designs]);

  async function submitDesign(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);const id=nextId('MIX');const r=await window.tolou.createMixDesign({id,code:String(f.get('code')??''),title:String(f.get('title')??'')});if(!r.ok)throw new Error(r.message);event.currentTarget.reset();await reload();setDesignId(id);setMessage('طرح اختلاط ثبت شد.');onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت طرح انجام نشد');}finally{setBusy(false);}}
  async function submitVersion(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!designId)return;setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);const r=await window.tolou.createMixVersion({id:nextId('MXV'),mixDesignId:designId,targetStrengthMpa:optionalNumber(f.get('targetStrength')),maxWaterCementRatio:optionalNumber(f.get('wc')),targetSlumpMm:optionalNumber(f.get('slump')),nominalMaxAggregateMm:optionalNumber(f.get('agg')),cementKgM3:optionalNumber(f.get('cement')),waterKgM3:optionalNumber(f.get('water')),fineAggregateKgM3:optionalNumber(f.get('fine')),coarseAggregateKgM3:optionalNumber(f.get('coarse')),scmKgM3:optionalNumber(f.get('scm')),admixtureKgM3:optionalNumber(f.get('admix')),notes:String(f.get('notes')??'')});if(!r.ok)throw new Error(r.message);event.currentTarget.reset();const list=await window.tolou.listMixVersions(designId);if(!list.ok)throw new Error(list.message);setVersions(list.data);setMessage(`نسخه ${r.data.revision.toLocaleString('fa-IR')} ثبت شد.`);onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت نسخه انجام نشد');}finally{setBusy(false);}}
  async function submitPourSpec(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!projectId||!pourId)return;setBusy(true);setMessage('');try{const f=new FormData(event.currentTarget);const r=await window.tolou.savePourSpecification({pourId,projectId,mixDesignVersionId:String(f.get('mixVersion')??'')||null,elementName:String(f.get('element')??''),concreteClass:String(f.get('class')??''),specifiedStrengthMpa:optionalNumber(f.get('specifiedStrength')),targetSlumpMm:optionalNumber(f.get('targetSlump')),nominalMaxAggregateMm:optionalNumber(f.get('nmas')),exposureClass:String(f.get('exposure')??''),placementMethod:String(f.get('placement')??''),plannedVolumeM3:optionalNumber(f.get('volume')),notes:String(f.get('notes')??'')});if(!r.ok)throw new Error(r.message);const loaded=await window.tolou.getPourSpecification(pourId);if(!loaded.ok)throw new Error(loaded.message);setPourSpec(loaded.data);setMessage('مشخصات مهندسی بتن‌ریزی ذخیره شد.');onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ذخیره مشخصات انجام نشد');}finally{setBusy(false);}}

  const latestVersions=useMemo(()=>versions.slice().sort((a,b)=>b.revision-a.revision),[versions]);
  const lockedVersion=pourSpec?.mix_design_version_id??null;
  return <section className="engineering-workbench glass">
    <div className="section-heading"><div><p className="eyebrow eyebrow--accent">مدل مهندسی QC</p><h3>طرح اختلاط و مشخصات بتن‌ریزی</h3></div><span className="engineering-badge">نسخه‌دار و قابل ردیابی</span></div>
    {message&&<div className="workbench-message">{message}</div>}
    <div className="engineering-grid">
      <article className="engineering-card"><h4>تعریف طرح اختلاط</h4><form className="compact-form" onSubmit={submitDesign}><label>کد طرح<input name="code" required placeholder="مثلاً M35-PUMP"/></label><label>عنوان<input name="title" required placeholder="بتن پمپی سازه‌ای"/></label><button disabled={busy}>ثبت طرح</button></form><label className="stacked-label">طرح فعال<select value={designId} onChange={(e)=>setDesignId(e.target.value)}><option value="">انتخاب کنید</option>{designs.filter((d)=>d.archived===0).map((d)=><option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}</select></label></article>
      <article className="engineering-card engineering-card--wide"><h4>نسخه مهندسی طرح</h4><form className="engineering-form" onSubmit={submitVersion}><input name="targetStrength" type="number" step="0.01" min="0" placeholder="مقاومت هدف MPa"/><input name="wc" type="number" step="0.001" min="0.001" placeholder="حداکثر w/c"/><input name="slump" type="number" step="1" min="0" placeholder="اسلامپ mm"/><input name="agg" type="number" step="0.1" min="0.1" placeholder="حداکثر سنگدانه mm"/><input name="cement" type="number" step="0.1" min="0" placeholder="سیمان kg/m³"/><input name="water" type="number" step="0.1" min="0" placeholder="آب kg/m³"/><input name="fine" type="number" step="0.1" min="0" placeholder="سنگدانه ریز kg/m³"/><input name="coarse" type="number" step="0.1" min="0" placeholder="سنگدانه درشت kg/m³"/><input name="scm" type="number" step="0.1" min="0" placeholder="SCM kg/m³"/><input name="admix" type="number" step="0.01" min="0" placeholder="افزودنی kg/m³"/><textarea name="notes" placeholder="یادداشت فنی"/><button disabled={busy||!designId}>ثبت نسخه جدید</button></form>{latestVersions.length>0&&<div className="version-strip">{latestVersions.slice(0,4).map((v)=><span key={v.id}>Rev {v.revision.toLocaleString('fa-IR')} · {v.target_strength_mpa??'—'} MPa</span>)}</div>}</article>
      <article className="engineering-card engineering-card--full"><div className="engineering-card-title"><div><h4>مشخصات مهندسی بتن‌ریزی</h4><small>{pourSpec?'مشخصات موجود بازیابی شده و قابل ویرایش است.':'برای این بتن‌ریزی هنوز مشخصاتی ثبت نشده است.'}</small></div>{lockedVersion&&<span className="locked-badge">نسخه طرح تثبیت شده</span>}</div><div className="selector-row"><select value={projectId} onChange={(e)=>setProjectId(e.target.value)}><option value="">پروژه</option>{projects.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={pourId} onChange={(e)=>setPourId(e.target.value)}><option value="">بتن‌ریزی</option>{pours.map((p)=><option key={p.id} value={p.id}>{p.id}</option>)}</select></div><form className="engineering-form" key={`${pourId}-${pourSpec?.mix_design_version_id??'new'}-${pourSpec?.element_name??''}`} onSubmit={submitPourSpec}><select name="mixVersion" defaultValue={pourSpec?.mix_design_version_id??''} disabled={Boolean(lockedVersion)}><option value="">بدون طرح مرتبط</option>{latestVersions.map((v)=><option key={v.id} value={v.id}>Rev {v.revision} — {designs.find((d)=>d.id===v.mix_design_id)?.code??v.mix_design_id}</option>)}</select>{lockedVersion&&<input type="hidden" name="mixVersion" value={lockedVersion}/>}<input name="element" defaultValue={fieldValue(pourSpec?.element_name)} placeholder="عضو سازه‌ای"/><input name="class" defaultValue={fieldValue(pourSpec?.concrete_class)} placeholder="رده/کلاس بتن"/><input name="specifiedStrength" defaultValue={fieldValue(pourSpec?.specified_strength_mpa)} type="number" step="0.01" min="0" placeholder="مقاومت مشخصه MPa"/><input name="targetSlump" defaultValue={fieldValue(pourSpec?.target_slump_mm)} type="number" step="1" min="0" placeholder="اسلامپ هدف mm"/><input name="nmas" defaultValue={fieldValue(pourSpec?.nominal_max_aggregate_mm)} type="number" step="0.1" min="0.1" placeholder="حداکثر سنگدانه mm"/><input name="exposure" defaultValue={fieldValue(pourSpec?.exposure_class)} placeholder="کلاس مواجهه"/><input name="placement" defaultValue={fieldValue(pourSpec?.placement_method)} placeholder="روش اجرا/جای‌دهی"/><input name="volume" defaultValue={fieldValue(pourSpec?.planned_volume_m3)} type="number" step="0.01" min="0" placeholder="حجم برنامه‌ریزی m³"/><textarea name="notes" defaultValue={fieldValue(pourSpec?.notes)} placeholder="یادداشت بتن‌ریزی"/><button disabled={busy||!pourId}>{pourSpec?'ذخیره اصلاحات مشخصات':'ثبت مشخصات'}</button></form>{pourSpec?.mix_code&&<div className="locked-summary">طرح تثبیت‌شده: <strong>{pourSpec.mix_code}</strong> · Rev {pourSpec.mix_revision?.toLocaleString('fa-IR')??'—'} · {pourSpec.mix_title}</div>}</article>
    </div>
  </section>;
}
