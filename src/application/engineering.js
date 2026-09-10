function requiredText(value,label){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
}
function optionalText(value){ return typeof value==='string'?value.trim():''; }
function optionalNumber(value,label,{min=0,max=Number.MAX_VALUE,strictMin=false}={}){
  if(value===undefined||value===null||value==='') return null;
  const number=Number(value);
  if(!Number.isFinite(number)||(strictMin?number<=min:number<min)||number>=max) throw new Error(`${label} معتبر نیست`);
  return number;
}
function positiveRevision(value){
  const revision=Number(value);
  if(!Number.isInteger(revision)||revision<1) throw new Error('شماره بازنگری معتبر نیست');
  return revision;
}

export function createEngineeringService(db,{companyId,actor}){
  companyId=requiredText(companyId,'شرکت'); actor=requiredText(actor,'کاربر');

  function ownedProject(projectId){
    const row=db.prepare('SELECT id FROM projects WHERE id=? AND company_id=? AND archived=0').get(requiredText(projectId,'پروژه'),companyId);
    if(!row) throw new Error('پروژه فعال متعلق به این شرکت یافت نشد');
    return row;
  }
  function ownedPour(pourId){
    const row=db.prepare('SELECT id,project_id FROM pours WHERE id=? AND company_id=?').get(requiredText(pourId,'بتن‌ریزی'),companyId);
    if(!row) throw new Error('بتن‌ریزی متعلق به این شرکت یافت نشد');
    return row;
  }
  function ownedDesign(designId){
    const row=db.prepare('SELECT id FROM mix_designs WHERE id=? AND company_id=? AND archived=0').get(requiredText(designId,'طرح اختلاط'),companyId);
    if(!row) throw new Error('طرح اختلاط فعال متعلق به این شرکت یافت نشد');
    return row;
  }
  function ownedVersion(versionId){
    const row=db.prepare('SELECT id,mix_design_id,revision FROM mix_design_versions WHERE id=? AND company_id=?').get(requiredText(versionId,'نسخه طرح اختلاط'),companyId);
    if(!row) throw new Error('نسخه طرح اختلاط متعلق به این شرکت یافت نشد');
    return row;
  }

  return {
    createMixDesign(input){
      const id=requiredText(input?.id,'شناسه طرح اختلاط');
      const code=requiredText(input?.code,'کد طرح اختلاط');
      const title=requiredText(input?.title,'عنوان طرح اختلاط');
      if(db.prepare('SELECT id FROM mix_designs WHERE id=?').get(id)) throw new Error('این شناسه طرح اختلاط قبلاً ثبت شده است');
      if(db.prepare('SELECT id FROM mix_designs WHERE company_id=? AND code=?').get(companyId,code)) throw new Error('این کد طرح اختلاط قبلاً ثبت شده است');
      db.prepare('INSERT INTO mix_designs(id,company_id,code,title) VALUES(?,?,?,?)').run(id,companyId,code,title);
      return {id,code,title};
    },
    listMixDesigns(){
      return db.prepare(`SELECT id,code,title,archived FROM mix_designs WHERE company_id=? ORDER BY archived,code,id`).all(companyId);
    },
    createMixVersion(input){
      const id=requiredText(input?.id,'شناسه نسخه');
      const mixDesignId=requiredText(input?.mixDesignId,'طرح اختلاط');
      ownedDesign(mixDesignId);
      if(db.prepare('SELECT id FROM mix_design_versions WHERE id=?').get(id)) throw new Error('این شناسه نسخه قبلاً ثبت شده است');
      const current=db.prepare('SELECT COALESCE(MAX(revision),0) AS revision FROM mix_design_versions WHERE mix_design_id=? AND company_id=?').get(mixDesignId,companyId);
      const revision=positiveRevision(input?.revision ?? Number(current.revision)+1);
      if(revision!==Number(current.revision)+1) throw new Error('بازنگری طرح اختلاط باید به‌ترتیب ثبت شود');
      const values={
        targetStrengthMpa:optionalNumber(input?.targetStrengthMpa,'مقاومت هدف',{min:0,max:1000}),
        maxWaterCementRatio:optionalNumber(input?.maxWaterCementRatio,'حداکثر نسبت آب به سیمان',{min:0,max:5,strictMin:true}),
        targetSlumpMm:optionalNumber(input?.targetSlumpMm,'اسلامپ هدف',{min:0,max:1000}),
        nominalMaxAggregateMm:optionalNumber(input?.nominalMaxAggregateMm,'حداکثر اندازه اسمی سنگدانه',{min:0,max:500,strictMin:true}),
        cementKgM3:optionalNumber(input?.cementKgM3,'سیمان',{min:0,max:5000}),
        waterKgM3:optionalNumber(input?.waterKgM3,'آب',{min:0,max:5000}),
        fineAggregateKgM3:optionalNumber(input?.fineAggregateKgM3,'سنگدانه ریز',{min:0,max:5000}),
        coarseAggregateKgM3:optionalNumber(input?.coarseAggregateKgM3,'سنگدانه درشت',{min:0,max:5000}),
        scmKgM3:optionalNumber(input?.scmKgM3,'مواد سیمانی مکمل',{min:0,max:5000}),
        admixtureKgM3:optionalNumber(input?.admixtureKgM3,'افزودنی شیمیایی',{min:0,max:5000}),
      };
      db.prepare(`INSERT INTO mix_design_versions(
        id,mix_design_id,company_id,revision,target_strength_mpa,max_water_cement_ratio,target_slump_mm,nominal_max_aggregate_mm,
        cement_kg_m3,water_kg_m3,fine_aggregate_kg_m3,coarse_aggregate_kg_m3,scm_kg_m3,admixture_kg_m3,notes,created_at,created_by
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id,mixDesignId,companyId,revision,values.targetStrengthMpa,values.maxWaterCementRatio,values.targetSlumpMm,values.nominalMaxAggregateMm,
        values.cementKgM3,values.waterKgM3,values.fineAggregateKgM3,values.coarseAggregateKgM3,values.scmKgM3,values.admixtureKgM3,optionalText(input?.notes),new Date().toISOString(),actor
      );
      return {id,mixDesignId,revision};
    },
    listMixVersions(mixDesignId){
      ownedDesign(mixDesignId);
      return db.prepare(`SELECT id,mix_design_id,revision,target_strength_mpa,max_water_cement_ratio,target_slump_mm,nominal_max_aggregate_mm,
        cement_kg_m3,water_kg_m3,fine_aggregate_kg_m3,coarse_aggregate_kg_m3,scm_kg_m3,admixture_kg_m3,notes,created_at,created_by
        FROM mix_design_versions WHERE company_id=? AND mix_design_id=? ORDER BY revision DESC`).all(companyId,mixDesignId);
    },
    savePourSpecification(input){
      const pour=ownedPour(input?.pourId);
      const projectId=requiredText(input?.projectId,'پروژه');
      ownedProject(projectId);
      if(pour.project_id!==projectId) throw new Error('بتن‌ریزی به پروژه انتخاب‌شده تعلق ندارد');
      const mixDesignVersionId=input?.mixDesignVersionId?requiredText(input.mixDesignVersionId,'نسخه طرح اختلاط'):null;
      if(mixDesignVersionId) ownedVersion(mixDesignVersionId);
      const specifiedStrengthMpa=optionalNumber(input?.specifiedStrengthMpa,'مقاومت مشخصه',{min:0,max:1000});
      const targetSlumpMm=optionalNumber(input?.targetSlumpMm,'اسلامپ هدف',{min:0,max:1000});
      const nominalMaxAggregateMm=optionalNumber(input?.nominalMaxAggregateMm,'حداکثر اندازه اسمی سنگدانه',{min:0,max:500,strictMin:true});
      const plannedVolumeM3=optionalNumber(input?.plannedVolumeM3,'حجم برنامه‌ریزی‌شده',{min:0,max:1000000});
      db.prepare(`INSERT INTO pour_qc_specifications(
        pour_id,company_id,project_id,mix_design_version_id,element_name,concrete_class,specified_strength_mpa,target_slump_mm,nominal_max_aggregate_mm,exposure_class,placement_method,planned_volume_m3,notes
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(pour_id) DO UPDATE SET
        mix_design_version_id=excluded.mix_design_version_id,element_name=excluded.element_name,concrete_class=excluded.concrete_class,
        specified_strength_mpa=excluded.specified_strength_mpa,target_slump_mm=excluded.target_slump_mm,nominal_max_aggregate_mm=excluded.nominal_max_aggregate_mm,
        exposure_class=excluded.exposure_class,placement_method=excluded.placement_method,planned_volume_m3=excluded.planned_volume_m3,notes=excluded.notes`).run(
        pour.id,companyId,projectId,mixDesignVersionId,optionalText(input?.elementName),optionalText(input?.concreteClass),specifiedStrengthMpa,targetSlumpMm,nominalMaxAggregateMm,
        optionalText(input?.exposureClass),optionalText(input?.placementMethod),plannedVolumeM3,optionalText(input?.notes)
      );
      return {pourId:pour.id,projectId,mixDesignVersionId};
    },
    getPourSpecification(pourId){
      const pour=ownedPour(pourId);
      return db.prepare(`SELECT q.*,d.code AS mix_code,d.title AS mix_title,v.revision AS mix_revision
        FROM pour_qc_specifications q
        LEFT JOIN mix_design_versions v ON v.id=q.mix_design_version_id AND v.company_id=q.company_id
        LEFT JOIN mix_designs d ON d.id=v.mix_design_id AND d.company_id=q.company_id
        WHERE q.company_id=? AND q.pour_id=?`).get(companyId,pour.id) ?? null;
    }
  };
}
