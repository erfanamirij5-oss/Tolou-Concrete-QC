const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const optionalText=(value)=>typeof value==='string'&&value.trim()?value.trim():null;
const optionalNumber=(value,label,{min=0,max=Number.MAX_SAFE_INTEGER,exclusiveMin=false}={})=>{if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${label} معتبر نیست`);if((exclusiveMin?value<=min:value<min)||value>max)throw new Error(`${label} خارج از محدوده معتبر است`);return value;};
const PARTY_TYPES=new Set(['laboratory','person','consultant','client','supervisor','other']);
const COMPONENT_CATEGORIES=new Set(['fine_aggregate','coarse_aggregate','scm','powder','chemical_admixture','air_entrainer','fiber','other']);

function atomic(db,operation){db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
function quality(snapshot,components){const calculated=snapshot.cementKgM3&&snapshot.waterKgM3!==null?snapshot.waterKgM3/snapshot.cementKgM3:null;const mismatch=calculated!==null&&snapshot.declaredWaterCementRatio!==null?Math.abs(calculated-snapshot.declaredWaterCementRatio)>0.01:false;const componentTotal=components.reduce((sum,item)=>sum+item.quantityKgM3,0);const totalMass=(snapshot.cementKgM3??0)+(snapshot.waterKgM3??0)+componentTotal;return{calculatedWaterCementRatio:calculated,waterCementMismatch:mismatch,totalRecordedMassKgM3:totalMass};}

export function createSamplingTraceabilityService(db,{companyId,actor,clock=()=>new Date().toISOString()}){
  companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');
  const ownSeries=(seriesId)=>{seriesId=text(seriesId,'نوبت نمونه‌برداری');const owned=db.prepare('SELECT id FROM sampling_series WHERE id=? AND company_id=?').get(seriesId,companyId);if(!owned)throw new Error('نوبت نمونه‌برداری متعلق به این شرکت یافت نشد');return seriesId;};
  return{
    addComparisonParty(input){
      const id=text(input?.id,'شناسه طرف مقایسه‌ای');
      const seriesId=ownSeries(input?.seriesId);
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
      seriesId=ownSeries(seriesId);
      return db.prepare(`SELECT id,series_id,party_type,party_name,laboratory_name,sampler_name,external_reference,notes,created_at,created_by
        FROM sampling_comparison_parties WHERE company_id=? AND series_id=? ORDER BY created_at,id`).all(companyId,seriesId);
    },
    saveMixSnapshot(input){
      const seriesId=ownSeries(input?.seriesId);
      const sourceMode=text(input?.sourceMode,'منبع طرح مخلوط');if(sourceMode!=='library'&&sourceMode!=='manual')throw new Error('منبع طرح مخلوط معتبر نیست');
      const mixDesignVersionId=optionalText(input?.mixDesignVersionId);
      let libraryVersion=null;
      if(mixDesignVersionId){libraryVersion=db.prepare(`SELECT v.id,v.revision,v.target_strength_mpa,v.max_water_cement_ratio,v.cement_kg_m3,v.water_kg_m3,d.code
        FROM mix_design_versions v JOIN mix_designs d ON d.id=v.mix_design_id AND d.company_id=v.company_id WHERE v.id=? AND v.company_id=?`).get(mixDesignVersionId,companyId);if(!libraryVersion)throw new Error('نسخه طرح اختلاط انتخاب‌شده یافت نشد');}
      const snapshot={
        mixCode:optionalText(input?.mixCode)??libraryVersion?.code??null,
        mixRevision:optionalNumber(input?.mixRevision??libraryVersion?.revision,'بازنگری طرح',{min:0}),
        characteristicStrengthMpa:optionalNumber(input?.characteristicStrengthMpa,'مقاومت مشخصه',{min:0}),
        targetStrengthMpa:optionalNumber(input?.targetStrengthMpa??libraryVersion?.target_strength_mpa,'مقاومت هدف',{min:0}),
        declaredWaterCementRatio:optionalNumber(input?.declaredWaterCementRatio??libraryVersion?.max_water_cement_ratio,'نسبت آب به سیمان',{min:0,max:2,exclusiveMin:true}),
        cementKgM3:optionalNumber(input?.cementKgM3??libraryVersion?.cement_kg_m3,'سیمان',{min:0}),
        waterKgM3:optionalNumber(input?.waterKgM3??libraryVersion?.water_kg_m3,'آب',{min:0}),
        notes:optionalText(input?.notes)??''
      };
      const rawComponents=Array.isArray(input?.components)?input.components:[];
      const components=rawComponents.map((item,index)=>{const id=text(item?.id,`شناسه مصالح ${index+1}`);const category=text(item?.category,`گروه مصالح ${index+1}`);if(!COMPONENT_CATEGORIES.has(category))throw new Error(`گروه مصالح ${index+1} معتبر نیست`);return{id,category,materialName:text(item?.materialName,`نام مصالح ${index+1}`),quantityKgM3:optionalNumber(item?.quantityKgM3,`مقدار مصالح ${index+1}`,{min:0})??0,sortOrder:index};});
      const createdAt=clock();
      return atomic(db,()=>{
        if(db.prepare('SELECT series_id FROM sampling_mix_snapshots WHERE series_id=?').get(seriesId))throw new Error('طرح مخلوط این نوبت قبلاً ثبت شده است');
        db.prepare(`INSERT INTO sampling_mix_snapshots(series_id,company_id,source_mode,mix_design_version_id,mix_code,mix_revision,characteristic_strength_mpa,target_strength_mpa,declared_water_cement_ratio,cement_kg_m3,water_kg_m3,notes,created_at,created_by)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(seriesId,companyId,sourceMode,mixDesignVersionId,snapshot.mixCode,snapshot.mixRevision,snapshot.characteristicStrengthMpa,snapshot.targetStrengthMpa,snapshot.declaredWaterCementRatio,snapshot.cementKgM3,snapshot.waterKgM3,snapshot.notes,createdAt,actor);
        const insert=db.prepare(`INSERT INTO sampling_mix_snapshot_components(id,series_id,company_id,category,material_name,quantity_kg_m3,sort_order,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)`);
        for(const item of components)insert.run(item.id,seriesId,companyId,item.category,item.materialName,item.quantityKgM3,item.sortOrder,createdAt,actor);
        return{seriesId,sourceMode,mixDesignVersionId,...snapshot,components,...quality(snapshot,components),createdAt,createdBy:actor};
      });
    },
    getMixSnapshot(seriesId){
      seriesId=ownSeries(seriesId);
      const row=db.prepare(`SELECT series_id,source_mode,mix_design_version_id,mix_code,mix_revision,characteristic_strength_mpa,target_strength_mpa,declared_water_cement_ratio,cement_kg_m3,water_kg_m3,notes,created_at,created_by FROM sampling_mix_snapshots WHERE company_id=? AND series_id=?`).get(companyId,seriesId);
      if(!row)return null;
      const components=db.prepare(`SELECT id,category,material_name,quantity_kg_m3,sort_order FROM sampling_mix_snapshot_components WHERE company_id=? AND series_id=? ORDER BY sort_order,id`).all(companyId,seriesId).map(item=>({id:item.id,category:item.category,materialName:item.material_name,quantityKgM3:item.quantity_kg_m3,sortOrder:item.sort_order}));
      const snapshot={cementKgM3:row.cement_kg_m3,waterKgM3:row.water_kg_m3,declaredWaterCementRatio:row.declared_water_cement_ratio};
      return{seriesId:row.series_id,sourceMode:row.source_mode,mixDesignVersionId:row.mix_design_version_id,mixCode:row.mix_code,mixRevision:row.mix_revision,characteristicStrengthMpa:row.characteristic_strength_mpa,targetStrengthMpa:row.target_strength_mpa,declaredWaterCementRatio:row.declared_water_cement_ratio,cementKgM3:row.cement_kg_m3,waterKgM3:row.water_kg_m3,notes:row.notes,components,...quality(snapshot,components),createdAt:row.created_at,createdBy:row.created_by};
    }
  };
}
