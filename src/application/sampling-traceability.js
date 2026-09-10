const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const optionalText=(value)=>typeof value==='string'&&value.trim()?value.trim():null;
const optionalNumber=(value,label,{min=0,max=Number.MAX_SAFE_INTEGER,exclusiveMin=false}={})=>{if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${label} معتبر نیست`);if((exclusiveMin?value<=min:value<min)||value>max)throw new Error(`${label} خارج از محدوده معتبر است`);return value;};
const PARTY_TYPES=new Set(['laboratory','person','consultant','client','supervisor','other']);
const COMPONENT_CATEGORIES=new Set(['fine_aggregate','coarse_aggregate','scm','powder','chemical_admixture','air_entrainer','fiber','other']);
const utc=(value,label)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw new Error(`${label} معتبر نیست`);const d=new Date(value);if(!Number.isFinite(d.getTime())||d.toISOString()!==value)throw new Error(`${label} معتبر نیست`);return value;};

function atomic(db,operation){db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
function quality(snapshot,components){const calculated=snapshot.cementKgM3&&snapshot.waterKgM3!==null?snapshot.waterKgM3/snapshot.cementKgM3:null;const mismatch=calculated!==null&&snapshot.declaredWaterCementRatio!==null?Math.abs(calculated-snapshot.declaredWaterCementRatio)>0.01:false;const componentTotal=components.reduce((sum,item)=>sum+item.quantityKgM3,0);const totalMass=(snapshot.cementKgM3??0)+(snapshot.waterKgM3??0)+componentTotal;return{calculatedWaterCementRatio:calculated,waterCementMismatch:mismatch,totalRecordedMassKgM3:totalMass};}

export function createSamplingTraceabilityService(db,{companyId,actor,clock=()=>new Date().toISOString()}){
  companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');
  const ownSeries=(seriesId)=>{seriesId=text(seriesId,'نوبت نمونه‌برداری');const owned=db.prepare('SELECT id,sampled_at FROM sampling_series WHERE id=? AND company_id=?').get(seriesId,companyId);if(!owned)throw new Error('نوبت نمونه‌برداری متعلق به این شرکت یافت نشد');return owned;};
  return{
    addComparisonParty(input){
      const id=text(input?.id,'شناسه طرف مقایسه‌ای');
      const seriesId=text(input?.seriesId,'نوبت نمونه‌برداری');ownSeries(seriesId);
      const partyType=text(input?.partyType,'نوع طرف مقایسه‌ای');
      if(!PARTY_TYPES.has(partyType))throw new Error('نوع طرف مقایسه‌ای معتبر نیست');
      const partyName=text(input?.partyName,'نام طرف مقایسه‌ای');
      const laboratoryName=optionalText(input?.laboratoryName);
      const samplerName=optionalText(input?.samplerName);
      const externalReference=optionalText(input?.externalReference);
      const notes=optionalText(input?.notes);
      const createdAt=clock();
      if(db.prepare('SELECT id FROM sampling_comparison_parties WHERE id=?').get(id))throw new Error('این طرف مقایسه‌ای قبلاً ثبت شده است');
      db.prepare(`INSERT INTO sampling_comparison_parties(id,company_id,series_id,party_type,party_name,laboratory_name,sampler_name,external_reference,notes,created_at,created_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,companyId,seriesId,partyType,partyName,laboratoryName,samplerName,externalReference,notes,createdAt,actor);
      return{id,seriesId,partyType,partyName,laboratoryName,samplerName,externalReference,notes,createdAt,createdBy:actor};
    },
    listComparisonParties(seriesId){
      seriesId=text(seriesId,'نوبت نمونه‌برداری');ownSeries(seriesId);
      return db.prepare(`SELECT id,series_id,party_type,party_name,laboratory_name,sampler_name,external_reference,notes,created_at,created_by
        FROM sampling_comparison_parties WHERE company_id=? AND series_id=? ORDER BY created_at,id`).all(companyId,seriesId);
    },
    saveComparisonResult(input){
      const resultId=text(input?.resultId,'شناسه نتیجه مقایسه‌ای');const seriesId=text(input?.seriesId,'نوبت نمونه‌برداری');const series=ownSeries(seriesId);
      const comparisonPartyId=text(input?.comparisonPartyId,'طرف مقایسه‌ای');const party=db.prepare('SELECT id FROM sampling_comparison_parties WHERE id=? AND series_id=? AND company_id=?').get(comparisonPartyId,seriesId,companyId);if(!party)throw new Error('طرف مقایسه‌ای متعلق به این نوبت یافت نشد');
      if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw new Error('شماره بازنگری معتبر نیست');
      const ageDays=input?.ageDays===null?null:Number(input?.ageDays);if(ageDays!==null&&(!Number.isSafeInteger(ageDays)||ageDays<=0))throw new Error('سن آزمون معتبر نیست');
      const specimenLabel=text(input?.specimenLabel,'شناسه نمونه طرف مقابل');const strengthMpa=optionalNumber(input?.strengthMpa,'مقاومت',{min:0});if(strengthMpa===null)throw new Error('مقاومت معتبر وارد کنید');
      const testedAt=utc(input?.testedAt,'زمان آزمون');const enteredAt=utc(clock(),'زمان ثبت');if(testedAt<series.sampled_at)throw new Error('زمان آزمون طرف مقابل نمی‌تواند پیش از نمونه‌برداری باشد');if(testedAt>enteredAt)throw new Error('زمان آزمون طرف مقابل نمی‌تواند در آینده باشد');
      const current=db.prepare('SELECT revision FROM current_comparison_results WHERE result_id=?').get(resultId);if((current?.revision??0)!==input.expectedRevision)throw new Error('نتیجه مقایسه‌ای تغییر کرده است؛ پرونده را دوباره باز کنید');
      const reason=input.expectedRevision>0?text(input?.reason,'علت اصلاح'):null;const revision=input.expectedRevision+1;
      db.prepare(`INSERT INTO comparison_result_revisions(result_id,revision,company_id,series_id,comparison_party_id,age_days,specimen_label,strength_mpa,tested_at,tested_by,notes,reason,entered_at,entered_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(resultId,revision,companyId,seriesId,comparisonPartyId,ageDays,specimenLabel,strengthMpa,testedAt,optionalText(input?.testedBy),optionalText(input?.notes),reason,enteredAt,actor);
      return{resultId,revision,seriesId,comparisonPartyId,ageDays,specimenLabel,strengthMpa,testedAt};
    },
    listComparisonResults(seriesId){
      seriesId=text(seriesId,'نوبت نمونه‌برداری');ownSeries(seriesId);
      return db.prepare(`SELECT r.result_id,r.revision,r.series_id,r.comparison_party_id,p.party_name,p.laboratory_name,r.age_days,r.specimen_label,r.strength_mpa,r.tested_at,r.tested_by,r.notes,r.reason,r.entered_at,r.entered_by
        FROM current_comparison_results r JOIN sampling_comparison_parties p ON p.id=r.comparison_party_id AND p.company_id=r.company_id
        WHERE r.company_id=? AND r.series_id=? ORDER BY COALESCE(r.age_days,9999),p.party_name,r.specimen_label,r.result_id`).all(companyId,seriesId);
    },
    saveMixSnapshot(input){
      const seriesId=text(input?.seriesId,'نوبت نمونه‌برداری');ownSeries(seriesId);
      const sourceMode=text(input?.sourceMode,'منبع طرح مخلوط');if(sourceMode!=='library'&&sourceMode!=='manual')throw new Error('منبع طرح مخلوط معتبر نیست');
      const mixDesignVersionId=optionalText(input?.mixDesignVersionId);
      let libraryVersion=null;
      if(mixDesignVersionId){libraryVersion=db.prepare(`SELECT v.id,v.revision,v.target_strength_mpa,v.max_water_cement_ratio,v.cement_kg_m3,v.water_kg_m3,d.code
        FROM mix_design_versions v JOIN mix_designs d ON d.id=v.mix_design_id AND d.company_id=v.company_id WHERE v.id=? AND v.company_id=?`).get(mixDesignVersionId,companyId);if(!libraryVersion)throw new Error('نسخه طرح اختلاط انتخاب‌شده یافت نشد');}
      const snapshot={mixCode:optionalText(input?.mixCode)??libraryVersion?.code??null,mixRevision:optionalNumber(input?.mixRevision??libraryVersion?.revision,'بازنگری طرح',{min:0}),characteristicStrengthMpa:optionalNumber(input?.characteristicStrengthMpa,'مقاومت مشخصه',{min:0}),targetStrengthMpa:optionalNumber(input?.targetStrengthMpa??libraryVersion?.target_strength_mpa,'مقاومت هدف',{min:0}),declaredWaterCementRatio:optionalNumber(input?.declaredWaterCementRatio??libraryVersion?.max_water_cement_ratio,'نسبت آب به سیمان',{min:0,max:2,exclusiveMin:true}),cementKgM3:optionalNumber(input?.cementKgM3??libraryVersion?.cement_kg_m3,'سیمان',{min:0}),waterKgM3:optionalNumber(input?.waterKgM3??libraryVersion?.water_kg_m3,'آب',{min:0}),notes:optionalText(input?.notes)??''};
      const rawComponents=Array.isArray(input?.components)?input.components:[];
      const components=rawComponents.map((item,index)=>{const id=text(item?.id,`شناسه مصالح ${index+1}`);const category=text(item?.category,`گروه مصالح ${index+1}`);if(!COMPONENT_CATEGORIES.has(category))throw new Error(`گروه مصالح ${index+1} معتبر نیست`);return{id,category,materialName:text(item?.materialName,`نام مصالح ${index+1}`),quantityKgM3:optionalNumber(item?.quantityKgM3,`مقدار مصالح ${index+1}`,{min:0})??0,sortOrder:index};});
      const createdAt=clock();
      return atomic(db,()=>{
        if(db.prepare('SELECT series_id FROM sampling_mix_snapshots WHERE series_id=?').get(seriesId))throw new Error('طرح مخلوط این نوبت قبلاً ثبت شده است');
        db.prepare(`INSERT INTO sampling_mix_snapshots(series_id,company_id,source_mode,mix_design_version_id,mix_code,mix_revision,characteristic_strength_mpa,target_strength_mpa,declared_water_cement_ratio,cement_kg_m3,water_kg_m3,notes,created_at,created_by)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(seriesId,companyId,sourceMode,mixDesignVersionId,snapshot.mixCode,snapshot.mixRevision,snapshot.characteristicStrengthMpa,snapshot.targetStrengthMpa,snapshot.declaredWaterCementRatio,snapshot.cementKgM3,snapshot.waterKgM3,snapshot.notes,createdAt,actor);
        const insert=db.prepare(`INSERT INTO sampling_mix_snapshot_components(id,series_id,company_id,category,material_name,quantity_kg_m3,sort_order,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)`);for(const item of components)insert.run(item.id,seriesId,companyId,item.category,item.materialName,item.quantityKgM3,item.sortOrder,createdAt,actor);
        return{seriesId,sourceMode,mixDesignVersionId,...snapshot,components,...quality(snapshot,components),createdAt,createdBy:actor};
      });
    },
    getMixSnapshot(seriesId){
      seriesId=text(seriesId,'نوبت نمونه‌برداری');ownSeries(seriesId);
      const row=db.prepare(`SELECT series_id,source_mode,mix_design_version_id,mix_code,mix_revision,characteristic_strength_mpa,target_strength_mpa,declared_water_cement_ratio,cement_kg_m3,water_kg_m3,notes,created_at,created_by FROM sampling_mix_snapshots WHERE company_id=? AND series_id=?`).get(companyId,seriesId);if(!row)return null;
      const components=db.prepare(`SELECT id,category,material_name,quantity_kg_m3,sort_order FROM sampling_mix_snapshot_components WHERE company_id=? AND series_id=? ORDER BY sort_order,id`).all(companyId,seriesId).map(item=>({id:item.id,category:item.category,materialName:item.material_name,quantityKgM3:item.quantity_kg_m3,sortOrder:item.sort_order}));
      const snapshot={cementKgM3:row.cement_kg_m3,waterKgM3:row.water_kg_m3,declaredWaterCementRatio:row.declared_water_cement_ratio};
      return{seriesId:row.series_id,sourceMode:row.source_mode,mixDesignVersionId:row.mix_design_version_id,mixCode:row.mix_code,mixRevision:row.mix_revision,characteristicStrengthMpa:row.characteristic_strength_mpa,targetStrengthMpa:row.target_strength_mpa,declaredWaterCementRatio:row.declared_water_cement_ratio,cementKgM3:row.cement_kg_m3,waterKgM3:row.water_kg_m3,notes:row.notes,components,...quality(snapshot,components),createdAt:row.created_at,createdBy:row.created_by};
    }
  };
}
