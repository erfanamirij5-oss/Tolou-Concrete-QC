const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
};
const optional=(value)=>typeof value==='string'&&value.trim()?value.trim():null;
const positiveNumber=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new Error(`${label} معتبر نیست`);return value;};
const utcTimestamp = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new Error('زمان بتن‌ریزی معتبر نیست');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) throw new Error('تاریخ بتن‌ریزی معتبر نیست');
  return value;
};
export function createProjectService(db, {companyId,actor='کاربر محلی',clock=()=>new Date().toISOString()}) {
  companyId = text(companyId, 'شرکت');actor=text(actor,'کاربر');
  return {
    createProject(input) {
      const id=text(input?.id,'شناسه پروژه'),name=text(input?.name,'نام پروژه'),customerName=text(input?.customerName,'نام مشتری');
      const address=typeof input?.address==='string'?input.address.trim():'';
      const characteristicStrengthMpa=positiveNumber(input?.characteristicStrengthMpa,'مقاومت مشخصه پروژه');
      if(db.prepare('SELECT id FROM projects WHERE id=?').get(id))throw new Error('این شناسه پروژه قبلاً ثبت شده است');
      const now=clock();
      db.exec('BEGIN IMMEDIATE');try{
        db.prepare('INSERT INTO projects(id,company_id,name,customer_name,address) VALUES(?,?,?,?,?)').run(id,companyId,name,customerName,address);
        db.prepare(`INSERT INTO project_strength_requirements(project_id,company_id,characteristic_strength_mpa,seven_day_reference_ratio,created_at,created_by,updated_at,updated_by)
          VALUES(?,?,?,0.60,?,?,?,?)`).run(id,companyId,characteristicStrengthMpa,now,actor,now,actor);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      return{id,name,customerName,address,characteristicStrengthMpa,sevenDayReferenceMpa:characteristicStrengthMpa*0.60,twentyEightDayReferenceMpa:characteristicStrengthMpa};
    },
    listProjects(){return db.prepare(`SELECT p.id,p.name,p.customer_name,p.address,p.archived,r.characteristic_strength_mpa,r.seven_day_reference_ratio,
      r.characteristic_strength_mpa*r.seven_day_reference_ratio AS seven_day_reference_mpa,r.characteristic_strength_mpa AS twenty_eight_day_reference_mpa
      FROM projects p LEFT JOIN project_strength_requirements r ON r.project_id=p.id AND r.company_id=p.company_id
      WHERE p.company_id=? ORDER BY p.archived,p.name,p.id`).all(companyId);},
    createPour(input) {
      const id=text(input?.id,'شناسه بتن‌ریزی'),projectId=text(input?.projectId,'پروژه'),occurredAt=utcTimestamp(input?.occurredAt),customerId=optional(input?.customerId),concreteSourceId=optional(input?.concreteSourceId);
      const project=db.prepare('SELECT id FROM projects WHERE id=? AND company_id=? AND archived=0').get(projectId,companyId);if(!project)throw new Error('پروژه فعال متعلق به این شرکت یافت نشد');if(db.prepare('SELECT id FROM pours WHERE id=?').get(id))throw new Error('این شناسه بتن‌ریزی قبلاً ثبت شده است');
      if(customerId&&!db.prepare('SELECT id FROM customers WHERE id=? AND company_id=? AND archived=0').get(customerId,companyId))throw new Error('مشتری فعال متعلق به این شرکت یافت نشد');if(concreteSourceId&&!db.prepare('SELECT id FROM concrete_sources WHERE id=? AND company_id=? AND archived=0').get(concreteSourceId,companyId))throw new Error('منبع بتن فعال متعلق به این شرکت یافت نشد');
      db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO pours(id,company_id,project_id,occurred_at) VALUES(?,?,?,?)').run(id,companyId,projectId,occurredAt);if(customerId||concreteSourceId)db.prepare(`INSERT INTO pour_qc_contexts(pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by) VALUES(?,?,?,?,?,?,?)`).run(id,companyId,projectId,customerId,concreteSourceId,new Date().toISOString(),actor);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return{id,projectId,occurredAt};
    },
    listPours(projectId){projectId=text(projectId,'پروژه');return db.prepare(`SELECT id,project_id,occurred_at FROM pours WHERE company_id=? AND project_id=? ORDER BY occurred_at DESC,id`).all(companyId,projectId);},
    dashboard(){
      const activeProjects=db.prepare('SELECT count(*) AS n FROM projects WHERE company_id=? AND archived=0').get(companyId).n;
      const totalSeries=db.prepare('SELECT count(*) AS n FROM sampling_series WHERE company_id=?').get(companyId).n;
      const pendingResults=db.prepare(`SELECT count(*) AS n FROM samples s JOIN sampling_series ss ON ss.id=s.series_id LEFT JOIN current_results r ON r.sample_id=s.id LEFT JOIN current_witness_schedules w ON w.sample_id=s.id WHERE ss.company_id=? AND COALESCE(s.due_at,w.due_at) IS NOT NULL AND r.sample_id IS NULL`).get(companyId).n;
      const draftResults=db.prepare(`SELECT count(*) AS n FROM current_results r JOIN samples s ON s.id=r.sample_id JOIN sampling_series ss ON ss.id=s.series_id WHERE ss.company_id=? AND r.state='draft'`).get(companyId).n;
      const nowIso=utcTimestamp(clock());
      const nowMs=Date.parse(nowIso);
      const rows=db.prepare(`SELECT s.id AS sample_id,s.series_id,s.age_days,COALESCE(s.due_at,w.due_at) AS due_at,ss.sampled_at,ss.kind,ss.project_id,ss.title,p.name AS project_name
        FROM samples s
        JOIN sampling_series ss ON ss.id=s.series_id
        LEFT JOIN projects p ON p.id=ss.project_id AND p.company_id=ss.company_id
        LEFT JOIN current_results r ON r.sample_id=s.id
        LEFT JOIN current_witness_schedules w ON w.sample_id=s.id
        WHERE ss.company_id=? AND COALESCE(s.due_at,w.due_at) IS NOT NULL AND r.sample_id IS NULL
        ORDER BY COALESCE(s.due_at,w.due_at) ASC,s.id ASC
        LIMIT 100`).all(companyId);
      const dueSchedule=rows.map((row)=>{
        const dueMs=Date.parse(row.due_at);
        const remainingMs=dueMs-nowMs;
        const status=remainingMs<0?'overdue':remainingMs<=48*60*60*1000?'warning':'scheduled';
        return {
          sampleId:row.sample_id,
          seriesId:row.series_id,
          ageDays:row.age_days,
          dueAt:row.due_at,
          sampledAt:row.sampled_at,
          projectId:row.project_id??null,
          projectName:row.project_name??null,
          title:row.title??null,
          kind:row.kind,
          remainingHours:remainingMs/3600000,
          status,
        };
      });
      const dueSoonCount=dueSchedule.filter((item)=>item.status==='warning').length;
      const overdueCount=dueSchedule.filter((item)=>item.status==='overdue').length;
      return{activeProjects:Number(activeProjects),totalSeries:Number(totalSeries),pendingResults:Number(pendingResults),draftResults:Number(draftResults),dueSoonCount,overdueCount,dueSchedule};
    }
  };
}
