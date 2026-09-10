import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { SampleSummary, SpecimenPhysicsSummary, SpecimenShape } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './laboratory-workbench.css';

type Step='select'|'physics'|'strength';

export function ResultEntryWorkspace({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
  const[samples,setSamples]=useState<SampleSummary[]>([]);
  const[sampleId,setSampleId]=useState('');
  const[physics,setPhysics]=useState<SpecimenPhysicsSummary|null>(null);
  const[shape,setShape]=useState<SpecimenShape>('cube');
  const[step,setStep]=useState<Step>('select');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  async function reload(){
    const result=await window.tolou.listSamples(300);
    if(!result.ok)throw new Error(result.message);
    const eligible=result.data.filter(x=>x.due_at!==null&&x.state!=='approved'&&x.state!=='void');
    setSamples(eligible);
    setSampleId(current=>eligible.some(x=>x.id===current)?current:(eligible[0]?.id??''));
  }

  useEffect(()=>{void reload().catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری نمونه‌ها انجام نشد'));},[refreshKey]);
  useEffect(()=>{
    if(!sampleId){setPhysics(null);return;}
    void window.tolou.getSpecimenPhysics(sampleId).then(r=>{if(!r.ok)throw new Error(r.message);setPhysics(r.data);setShape(r.data?.shape??'cube');}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری مشخصات فیزیکی نمونه انجام نشد'));
  },[sampleId,refreshKey]);

  const selected=useMemo(()=>samples.find(x=>x.id===sampleId),[samples,sampleId]);

  async function savePhysics(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget);setBusy(true);setMessage('');
    try{
      const result=await window.tolou.saveSpecimenPhysics({
        sampleId:selected.id,
        expectedRevision:physics?.revision??0,
        shape,
        lengthMm:shape==='cube'?Number(data.get('lengthMm')):null,
        widthMm:shape==='cube'?Number(data.get('widthMm')):null,
        heightMm:Number(data.get('heightMm')),
        diameterMm:shape==='cylinder'?Number(data.get('diameterMm')):null,
        massKg:Number(data.get('massKg')),
        reason:physics?String(data.get('reason')??''):undefined
      });
      if(!result.ok)throw new Error(result.message);
      const current=await window.tolou.getSpecimenPhysics(selected.id);if(current.ok)setPhysics(current.data);
      setMessage(`مشخصات فیزیکی ثبت شد. جرم حجمی محاسبه‌شده: ${result.data.densityKgM3.toLocaleString('fa-IR',{maximumFractionDigits:1})} kg/m³`);
      setStep('strength');onChanged?.();
    }catch(e){setMessage(e instanceof Error?e.message:'ثبت مشخصات فیزیکی انجام نشد');}finally{setBusy(false);}
  }

  async function saveStrength(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected)return;const data=new FormData(event.currentTarget);setBusy(true);setMessage('');
    try{
      const testedAt=String(data.get('testedAt')??'');if(!testedAt)throw new Error('زمان آزمون را وارد کنید.');
      const result=await window.tolou.saveDraft({sampleId:selected.id,expectedRevision:selected.revision??0,strengthMpa:Number(data.get('strengthMpa')),testedAt,testedBy:String(data.get('testedBy')??''),reason:String(data.get('reason')??'')});
      if(!result.ok)throw new Error(result.message);
      setMessage('نتیجه مقاومت به‌صورت پیش‌نویس ذخیره شد و اکنون در بخش «بررسی و تأیید» قابل رسیدگی است.');
      await reload();setStep('select');onChanged?.();
    }catch(e){setMessage(e instanceof Error?e.message:'ثبت نتیجه انجام نشد');}finally{setBusy(false);}
  }

  return <>
    <section className="workspace-intro"><p className="eyebrow">آزمون مقاومت</p><h2>ثبت نتیجه آزمون</h2><p>مسیر ثبت به سه مرحله روشن تقسیم شده است: انتخاب نمونه، مشخصات فیزیکی و جرم حجمی، سپس مقاومت فشاری.</p></section>
    <section className="workbench glass panel--wide">
      {message&&<div className="workbench-message" role="status">{message}</div>}
      {!samples.length?<div className="recovery-empty"><h3>نمونه آماده ثبت نتیجه وجود ندارد</h3><p>نمونه‌های دارای موعد از بخش نمونه‌برداری به این صف اضافه می‌شوند.</p></div>:<>
        <div className="result-stepper" aria-label="مراحل ثبت نتیجه">
          <button type="button" className={step==='select'?'is-active':''} onClick={()=>setStep('select')}>۱. انتخاب نمونه</button>
          <button type="button" className={step==='physics'?'is-active':''} disabled={!selected} onClick={()=>setStep('physics')}>۲. ابعاد، جرم و جرم حجمی</button>
          <button type="button" className={step==='strength'?'is-active':''} disabled={!selected} onClick={()=>setStep('strength')}>۳. مقاومت فشاری</button>
        </div>

        {step==='select'&&<div className="workbench-form">
          <label>نمونه<select value={sampleId} onChange={e=>{setSampleId(e.target.value);setStep('select');}} required>{samples.map(sample=><option key={sample.id} value={sample.id}>{sample.project_name??sample.title??'نمونه آزمایشگاه'} — {sample.age_days===null?'شاهد':`${sample.age_days.toLocaleString('fa-IR')} روزه`} — {isoToPersianLocal(sample.due_at)}</option>)}</select></label>
          {selected&&<div className="result-context"><div><small>پروژه / سری</small><strong>{selected.project_name??selected.title??'نمونه آزمایشگاه'}</strong></div><div><small>سن نمونه</small><strong>{selected.age_days===null?'شاهد':`${selected.age_days.toLocaleString('fa-IR')} روزه`}</strong></div><div><small>موعد آزمون</small><strong>{isoToPersianLocal(selected.due_at)}</strong></div><div><small>جرم حجمی</small><strong>{physics?`${physics.density_kg_m3.toLocaleString('fa-IR',{maximumFractionDigits:1})} kg/m³`:'ثبت نشده'}</strong></div></div>}
          <div className="row-actions"><button type="button" className="primary-button" onClick={()=>setStep('physics')}>ادامه: مشخصات فیزیکی</button><button type="button" className="secondary-button" onClick={()=>setStep('strength')}>رفتن مستقیم به مقاومت</button></div>
        </div>}

        {step==='physics'&&selected&&<form key={`${selected.id}-${physics?.revision??0}`} className="workbench-form" onSubmit={savePhysics}>
          <div className="history-strip"><strong>{selected.project_name??selected.title??'نمونه آزمایشگاه'}</strong><span>{selected.age_days===null?'شاهد':`${selected.age_days.toLocaleString('fa-IR')} روزه`}</span>{physics&&<span>جرم حجمی فعلی: {physics.density_kg_m3.toLocaleString('fa-IR',{maximumFractionDigits:1})} kg/m³</span>}</div>
          <label>شکل نمونه<select value={shape} onChange={e=>setShape(e.target.value as SpecimenShape)}><option value="cube">مکعبی</option><option value="cylinder">استوانه‌ای</option></select></label>
          {shape==='cube'?<><label>طول واقعی (mm)<input name="lengthMm" type="number" min="0.01" step="0.01" defaultValue={physics?.length_mm??150} required/></label><label>عرض واقعی (mm)<input name="widthMm" type="number" min="0.01" step="0.01" defaultValue={physics?.width_mm??150} required/></label></>:<label>قطر واقعی (mm)<input name="diameterMm" type="number" min="0.01" step="0.01" defaultValue={physics?.diameter_mm??150} required/></label>}
          <label>ارتفاع واقعی (mm)<input name="heightMm" type="number" min="0.01" step="0.01" defaultValue={physics?.height_mm??(shape==='cube'?150:300)} required/></label>
          <label>جرم نمونه (kg)<input name="massKg" type="number" min="0.001" step="0.001" defaultValue={physics?.mass_kg??''} required/></label>
          {physics&&<label>علت اصلاح<textarea name="reason" required placeholder="علت اصلاح ابعاد یا جرم قبلی"/></label>}
          <div className="form-help">حجم و جرم حجمی توسط موتور محاسباتی نرم‌افزار از ابعاد واقعی و جرم نمونه محاسبه می‌شود؛ مقدار صفر یا خالی به‌عنوان داده معتبر پذیرفته نمی‌شود.</div>
          <div className="row-actions"><button className="primary-button" disabled={busy}>{busy?'در حال محاسبه و ثبت…':physics?'محاسبه و ثبت اصلاح':'محاسبه و ثبت جرم حجمی'}</button><button type="button" className="secondary-button" onClick={()=>setStep('strength')}>مرحله مقاومت</button></div>
        </form>}

        {step==='strength'&&selected&&<form className="workbench-form" onSubmit={saveStrength}>
          <div className="result-context"><div><small>نمونه</small><strong>{selected.project_name??selected.title??'نمونه آزمایشگاه'}</strong></div><div><small>سن</small><strong>{selected.age_days===null?'شاهد':`${selected.age_days.toLocaleString('fa-IR')} روزه`}</strong></div><div><small>موعد</small><strong>{isoToPersianLocal(selected.due_at)}</strong></div><div><small>جرم حجمی</small><strong>{physics?`${physics.density_kg_m3.toLocaleString('fa-IR',{maximumFractionDigits:1})} kg/m³`:'ثبت نشده'}</strong></div></div>
          {!physics&&<div className="workbench-message">مشخصات فیزیکی این نمونه هنوز ثبت نشده است. ثبت مقاومت ممکن است، اما برای تکمیل پرونده QC بهتر است ابتدا ابعاد و جرم نمونه ثبت شود.</div>}
          <label>مقاومت فشاری (MPa)<input name="strengthMpa" type="number" min="0" step="0.1" required/></label>
          <label>زمان آزمون (شمسی)<PersianDateTimeInput name="testedAt" required/></label>
          <label>آزمایش‌کننده<input name="testedBy" required/></label>
          {(selected.revision??0)>0&&<label>علت اصلاح<textarea name="reason" required placeholder="علت اصلاح نتیجه قبلی"/></label>}
          <div className="row-actions"><button className="primary-button workbench-submit" disabled={busy}>{busy?'در حال ذخیره…':'ذخیره پیش‌نویس نتیجه'}</button><button type="button" className="secondary-button" onClick={()=>setStep('physics')}>بازگشت به جرم حجمی</button></div>
        </form>}
      </>}
    </section>
  </>;
}
