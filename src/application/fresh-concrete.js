const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const optionalNumber=(value,label,min,max)=>{if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>=max)throw new Error(`${label} معتبر وارد کنید`);return value;};
const utc=(value,label='زمان ثبت')=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw new Error(`${label} معتبر نیست`);const d=new Date(value);if(!Number.isFinite(d.getTime())||d.toISOString()!==value)throw new Error(`${label} معتبر نیست`);return value;};
function atomic(db,operation){db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}

export function createFreshConcreteService(db,{companyId,actor,clock=()=>new Date().toISOString()}){
 companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');
 const ownedSeries=(seriesId)=>db.prepare('SELECT id,sampled_at FROM sampling_series WHERE id=? AND company_id=?').get(text(seriesId,'سری نمونه'),companyId);
 return{
  save(input){
   const seriesId=text(input?.seriesId,'سری نمونه');const series=ownedSeries(seriesId);if(!series)throw new Error('سری نمونه متعلق به این شرکت یافت نشد');
   if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw new Error('شماره بازنگری معتبر نیست');
   const slumpMm=optionalNumber(input?.slumpMm,'اسلامپ',0,1000);const concreteTemperatureC=optionalNumber(input?.concreteTemperatureC,'دمای بتن',-50,100);
   if(slumpMm===null&&concreteTemperatureC===null)throw new Error('حداقل یکی از مقادیر اسلامپ یا دمای بتن را وارد کنید');
   const measuredAt=utc(input?.measuredAt,'زمان اندازه‌گیری');const enteredAt=utc(clock());if(measuredAt>enteredAt)throw new Error('زمان اندازه‌گیری نمی‌تواند در آینده باشد');if(measuredAt<series.sampled_at)throw new Error('زمان اندازه‌گیری نمی‌تواند پیش از نمونه‌برداری باشد');
   const current=db.prepare('SELECT revision FROM current_fresh_concrete_measurements WHERE series_id=?').get(seriesId);if((current?.revision??0)!==input.expectedRevision)throw new Error('اندازه‌گیری بتن تازه تغییر کرده است؛ پرونده را دوباره باز کنید');
   const reason=input.expectedRevision>0?text(input?.reason,'علت اصلاح'):null;const revision=input.expectedRevision+1;
   return atomic(db,()=>{db.prepare(`INSERT INTO fresh_concrete_measurement_revisions(series_id,revision,slump_mm,concrete_temperature_c,measured_at,reason,entered_by,entered_at) VALUES(?,?,?,?,?,?,?,?)`).run(seriesId,revision,slumpMm,concreteTemperatureC,measuredAt,reason,actor,enteredAt);return{seriesId,revision,slumpMm,concreteTemperatureC,measuredAt};});
  },
  get(seriesId){if(!ownedSeries(seriesId))throw new Error('سری نمونه متعلق به این شرکت یافت نشد');return db.prepare(`SELECT series_id,revision,slump_mm,concrete_temperature_c,measured_at,reason,entered_by,entered_at FROM current_fresh_concrete_measurements WHERE series_id=?`).get(seriesId)??null;},
  history(seriesId){if(!ownedSeries(seriesId))throw new Error('سری نمونه متعلق به این شرکت یافت نشد');return db.prepare(`SELECT series_id,revision,slump_mm,concrete_temperature_c,measured_at,reason,entered_by,entered_at FROM fresh_concrete_measurement_revisions WHERE series_id=? ORDER BY revision DESC`).all(seriesId);}
 };
}
