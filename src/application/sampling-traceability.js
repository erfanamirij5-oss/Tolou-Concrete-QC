const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const optionalText=(value)=>typeof value==='string'&&value.trim()?value.trim():null;
const PARTY_TYPES=new Set(['laboratory','person','consultant','client','supervisor','other']);

export function createSamplingTraceabilityService(db,{companyId,actor,clock=()=>new Date().toISOString()}){
  companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');
  return{
    addComparisonParty(input){
      const id=text(input?.id,'شناسه طرف مقایسه‌ای');
      const seriesId=text(input?.seriesId,'نوبت نمونه‌برداری');
      const partyType=text(input?.partyType,'نوع طرف مقایسه‌ای');
      if(!PARTY_TYPES.has(partyType))throw new Error('نوع طرف مقایسه‌ای معتبر نیست');
      const partyName=text(input?.partyName,'نام طرف مقایسه‌ای');
      const laboratoryName=optionalText(input?.laboratoryName);
      const samplerName=optionalText(input?.samplerName);
      const externalReference=optionalText(input?.externalReference);
      const notes=optionalText(input?.notes);
      const createdAt=clock();
      const owned=db.prepare('SELECT id FROM sampling_series WHERE id=? AND company_id=?').get(seriesId,companyId);
      if(!owned)throw new Error('نوبت نمونه‌برداری متعلق به این شرکت یافت نشد');
      if(db.prepare('SELECT id FROM sampling_comparison_parties WHERE id=?').get(id))throw new Error('این طرف مقایسه‌ای قبلاً ثبت شده است');
      db.prepare(`INSERT INTO sampling_comparison_parties(id,company_id,series_id,party_type,party_name,laboratory_name,sampler_name,external_reference,notes,created_at,created_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,companyId,seriesId,partyType,partyName,laboratoryName,samplerName,externalReference,notes,createdAt,actor);
      return{id,seriesId,partyType,partyName,laboratoryName,samplerName,externalReference,notes,createdAt,createdBy:actor};
    },
    listComparisonParties(seriesId){
      seriesId=text(seriesId,'نوبت نمونه‌برداری');
      const owned=db.prepare('SELECT id FROM sampling_series WHERE id=? AND company_id=?').get(seriesId,companyId);
      if(!owned)throw new Error('نوبت نمونه‌برداری متعلق به این شرکت یافت نشد');
      return db.prepare(`SELECT id,series_id,party_type,party_name,laboratory_name,sampler_name,external_reference,notes,created_at,created_by
        FROM sampling_comparison_parties WHERE company_id=? AND series_id=? ORDER BY created_at,id`).all(companyId,seriesId);
    }
  };
}
