const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
};
const optional=(value)=>typeof value==='string'&&value.trim()?value.trim():null;
const utcTimestamp = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new Error('زمان بتن‌ریزی معتبر نیست');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) throw new Error('تاریخ بتن‌ریزی معتبر نیست');
  return value;
};
export function createProjectService(db, {companyId,actor='کاربر محلی'}) {
  companyId = text(companyId, 'شرکت');actor=text(actor,'کاربر');
  return {
    createProject(input) {const id=text(input?.id,'شناسه پروژه'),name=text(input?.name,'نام پروژه'),customerName=text(input?.customerName,'نام مشتری');const address=typeof input?.address==='string'?input.address.trim():'';if(db.prepare('SELECT id FROM projects WHERE id=?').get(id))throw new Error('این شناسه پروژه قبلاً ثبت شده است');db.prepare('INSERT INTO projects(id,company_id,name,customer_name,address) VALUES(?,?,?,?,?)').run(id,companyId,name,customerName,address);return{id,name,customerName,address};},
    listProjects(){return db.prepare(`SELECT id,name,customer_name,address,archived FROM projects WHERE company_id=? ORDER BY archived,name,id`).all(companyId);},
    createPour(input) {
      const id=text(input?.id,'شناسه بتن‌ریزی'),projectId=text(input?.projectId,'پروژه'),occurredAt=utcTimestamp(input?.occurredAt),customerId=optional(input?.customerId),concreteSourceId=optional(input?.concreteSourceId);
      const project=db.prepare('SELECT id FROM projects WHERE id=? AND company_id=? AND archived=0').get(projectId,companyId);if(!project)throw new Error('پروژه فعال متعلق به این شرکت یافت نشد');if(db.prepare('SELECT id FROM pours WHERE id=?').get(id))throw new Error('این شناسه بتن‌ریزی قبلاً ثبت شده است');
      if(customerId&&!db.prepare('SELECT id FROM customers WHERE id=? AND company_id=? AND archived=0').get(customerId,companyId))throw new Error('مشتری فعال متعلق به این شرکت یافت نشد');if(concreteSourceId&&!db.prepare('SELECT id FROM concrete_sources WHERE id=? AND company_id=? AND archived=0').get(concreteSourceId,companyId))throw new Error('منبع بتن فعال متعلق به این شرکت یافت نشد');
      db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO pours(id,company_id,project_id,occurred_at) VALUES(?,?,?,?)').run(id,companyId,projectId,occurredAt);if(customerId||concreteSourceId)db.prepare(`INSERT INTO pour_qc_contexts(pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by) VALUES(?,?,?,?,?,?,?)`).run(id,companyId,projectId,customerId,concreteSourceId,new Date().toISOString(),actor);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return{id,projectId,occurredAt};
    },
    listPours(projectId){projectId=text(projectId,'پروژه');return db.prepare(`SELECT id,project_id,occurred_at FROM pours WHERE company_id=? AND project_id=? ORDER BY occurred_at DESC,id`).all(companyId,projectId);},
    dashboard(){const activeProjects=db.prepare('SELECT count(*) AS n FROM projects WHERE company_id=? AND archived=0').get(companyId).n;const totalSeries=db.prepare('SELECT count(*) AS n FROM sampling_series WHERE company_id=?').get(companyId).n;const pendingResults=db.prepare(`SELECT count(*) AS n FROM samples s JOIN sampling_series ss ON ss.id=s.series_id LEFT JOIN current_results r ON r.sample_id=s.id LEFT JOIN current_witness_schedules w ON w.sample_id=s.id WHERE ss.company_id=? AND COALESCE(s.due_at,w.due_at) IS NOT NULL AND r.sample_id IS NULL`).get(companyId).n;const draftResults=db.prepare(`SELECT count(*) AS n FROM current_results r JOIN samples s ON s.id=r.sample_id JOIN sampling_series ss ON ss.id=s.series_id WHERE ss.company_id=? AND r.state='draft'`).get(companyId).n;return{activeProjects:Number(activeProjects),totalSeries:Number(totalSeries),pendingResults:Number(pendingResults),draftResults:Number(draftResults)};}
  };
}
