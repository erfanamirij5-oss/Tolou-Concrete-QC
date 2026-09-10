const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const positive=(value,label,max)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>=max)throw new Error(`${label} معتبر وارد کنید`);return value;};
const utc=(value)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw new Error('زمان ثبت معتبر نیست');const d=new Date(value);if(!Number.isFinite(d.getTime())||d.toISOString()!==value)throw new Error('زمان ثبت معتبر نیست');return value;};
function atomic(db,operation){db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
function calculate(input){
 const shape=input?.shape;if(shape!=='cube'&&shape!=='cylinder')throw new Error('شکل نمونه معتبر نیست');
 const heightMm=positive(input?.heightMm,'ارتفاع نمونه',5000);const massKg=positive(input?.massKg,'جرم نمونه',10000);let lengthMm=null,widthMm=null,diameterMm=null,volumeM3;
 if(shape==='cube'){lengthMm=positive(input?.lengthMm,'طول نمونه',5000);widthMm=positive(input?.widthMm,'عرض نمونه',5000);volumeM3=(lengthMm/1000)*(widthMm/1000)*(heightMm/1000);}else{diameterMm=positive(input?.diameterMm,'قطر نمونه',5000);const radiusM=(diameterMm/1000)/2;volumeM3=Math.PI*radiusM*radiusM*(heightMm/1000);}
 const densityKgM3=massKg/volumeM3;if(!Number.isFinite(densityKgM3)||densityKgM3<=0||densityKgM3>=10000)throw new Error('جرم حجمی محاسبه‌شده خارج از محدوده معتبر است');
 return{shape,lengthMm,widthMm,heightMm,diameterMm,massKg,volumeM3,densityKgM3};
}
export function createSpecimenPhysicsService(db,{companyId,actor,clock=()=>new Date().toISOString()}){
 companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');
 const owned=(sampleId)=>db.prepare(`SELECT s.id,s.age_days FROM samples s JOIN sampling_series ss ON ss.id=s.series_id WHERE s.id=? AND ss.company_id=?`).get(text(sampleId,'نمونه'),companyId);
 return{
  save(input){const sampleId=text(input?.sampleId,'نمونه');if(!owned(sampleId))throw new Error('نمونه متعلق به این شرکت یافت نشد');if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw new Error('شماره بازنگری معتبر نیست');const current=db.prepare('SELECT revision FROM current_specimen_physical_measurements WHERE sample_id=?').get(sampleId);if((current?.revision??0)!==input.expectedRevision)throw new Error('مشخصات فیزیکی نمونه تغییر کرده است؛ پرونده را دوباره باز کنید');const values=calculate(input);const reason=input.expectedRevision>0?text(input?.reason,'علت اصلاح'):null;const enteredAt=utc(clock());const revision=input.expectedRevision+1;return atomic(db,()=>{db.prepare(`INSERT INTO specimen_physical_measurement_revisions(sample_id,revision,shape,length_mm,width_mm,height_mm,diameter_mm,mass_kg,volume_m3,density_kg_m3,reason,entered_by,entered_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(sampleId,revision,values.shape,values.lengthMm,values.widthMm,values.heightMm,values.diameterMm,values.massKg,values.volumeM3,values.densityKgM3,reason,actor,enteredAt);return{sampleId,revision,...values};});},
  get(sampleId){if(!owned(sampleId))throw new Error('نمونه متعلق به این شرکت یافت نشد');return db.prepare(`SELECT sample_id,revision,shape,length_mm,width_mm,height_mm,diameter_mm,mass_kg,volume_m3,density_kg_m3,reason,entered_by,entered_at FROM current_specimen_physical_measurements WHERE sample_id=?`).get(sampleId)??null;},
  history(sampleId){if(!owned(sampleId))throw new Error('نمونه متعلق به این شرکت یافت نشد');return db.prepare(`SELECT sample_id,revision,shape,length_mm,width_mm,height_mm,diameter_mm,mass_kg,volume_m3,density_kg_m3,reason,entered_by,entered_at FROM specimen_physical_measurement_revisions WHERE sample_id=? ORDER BY revision DESC`).all(sampleId);},
  calculate
 };
}
