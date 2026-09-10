import {createSampleSchedule} from '../domain/sampling.js';
import {validateSamplingContext} from '../domain/records.js';

const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
};

export function utcTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new Error('زمان ثبت‌شده معتبر نیست');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) throw new Error('تاریخ ثبت‌شده معتبر نیست');
  return value;
}

function atomic(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = operation(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function createLaboratoryService(db, {companyId, actor, clock = () => new Date().toISOString()}) {
  companyId = text(companyId, 'شرکت');
  actor = text(actor, 'کاربر فعال');
  if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) throw new Error('کنترل ارتباط داده‌ها فعال نیست');
  if (!db.prepare('SELECT id FROM companies WHERE id=?').get(companyId)) throw new Error('شرکت یافت نشد');

  const ownedCurrent = (sampleId) => db.prepare(`SELECT r.*,s.due_at,ss.sampled_at FROM current_results r JOIN samples s ON s.id=r.sample_id
    JOIN sampling_series ss ON ss.id=s.series_id WHERE r.sample_id=? AND ss.company_id=?`).get(sampleId,companyId);

  return {
    createSeries(input) {
      const id = text(input?.id, 'شناسه سری');
      const context = validateSamplingContext({...input, enteredBy: actor});
      const sampledAt = utcTimestamp(input.sampledAt);
      const schedule = createSampleSchedule(sampledAt, id);
      return atomic(db, () => {
        if (db.prepare('SELECT id FROM sampling_series WHERE id=?').get(id)) throw new Error('این سری قبلاً ثبت شده است');
        if (context.kind === 'customer') {
          const pour = db.prepare(`SELECT p.id FROM pours p JOIN projects j ON j.id=p.project_id AND j.company_id=p.company_id
            WHERE p.id=? AND p.project_id=? AND p.company_id=? AND j.archived=0`).get(context.pourId,context.projectId,companyId);
          if (!pour) throw new Error('نوبت بتن‌ریزی یا پروژه فعال متعلق به این شرکت یافت نشد');
        }
        db.prepare(`INSERT INTO sampling_series(id,company_id,kind,project_id,pour_id,title,purpose,sampled_at,sampler_name,entered_by)
          VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,companyId,context.kind,context.projectId??null,context.pourId??null,context.title??null,context.purpose??null,sampledAt,context.samplerName,actor);
        const insert = db.prepare('INSERT INTO samples(id,series_id,age_days,due_at) VALUES(?,?,?,?)');
        for (const sample of schedule) insert.run(sample.id,id,sample.ageDays,sample.dueAt);
        return {id,samples:schedule};
      });
    },

    saveDraft(input) {
      const sampleId = text(input?.sampleId, 'شناسه نمونه');
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('شماره بازنگری معتبر نیست');
      if (typeof input.strengthMpa !== 'number' || !Number.isFinite(input.strengthMpa) || input.strengthMpa < 0 || input.strengthMpa >= 1e308) throw new Error('مقاومت معتبر وارد کنید');
      const testedAt = utcTimestamp(input.testedAt);
      const testedBy = text(input.testedBy,'انجام‌دهنده آزمون');
      const enteredAt = utcTimestamp(clock());
      if (testedAt > enteredAt) throw new Error('زمان آزمون نمی‌تواند در آینده باشد');
      const reason = input.expectedRevision > 0 ? text(input.reason,'علت اصلاح') : null;
      return atomic(db, () => {
        const sample = db.prepare(`SELECT s.id,s.due_at,r.sampled_at FROM samples s JOIN sampling_series r ON r.id=s.series_id
          WHERE s.id=? AND r.company_id=?`).get(sampleId,companyId);
        if (!sample) throw new Error('نمونه متعلق به این شرکت یافت نشد');
        if (testedAt < sample.sampled_at) throw new Error('زمان آزمون پیش از نمونه‌برداری است');
        if (sample.due_at === null) throw new Error('ابتدا زمان و علت آزمون نمونه شاهد را تعیین کنید');
        const current = db.prepare('SELECT revision,state FROM current_results WHERE sample_id=?').get(sampleId);
        if ((current?.revision ?? 0) !== input.expectedRevision) throw new Error('نتیجه تغییر کرده است؛ پرونده را دوباره باز کنید');
        if (current && current.state !== 'draft') throw new Error('اصلاح نتیجه تأییدشده یا باطل‌شده به گردش تأیید نیاز دارد');
        const revision = input.expectedRevision+1;
        db.prepare(`INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason)
          VALUES(?,?,?,'draft',?,?,?,?,NULL,?)`).run(sampleId,revision,input.strengthMpa,testedAt,testedBy,actor,enteredAt,reason);
        return {sampleId,revision,state:'draft'};
      });
    },

    requestCorrection(input) {
      const sampleId=text(input?.sampleId,'شناسه نمونه');
      if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<1) throw new Error('شماره بازنگری معتبر نیست');
      if(typeof input?.strengthMpa!=='number'||!Number.isFinite(input.strengthMpa)||input.strengthMpa<0||input.strengthMpa>=1e308) throw new Error('مقاومت معتبر وارد کنید');
      const testedAt=utcTimestamp(input.testedAt); const testedBy=text(input.testedBy,'انجام‌دهنده آزمون'); const reason=text(input.reason,'علت اصلاح'); const enteredAt=utcTimestamp(clock());
      if(testedAt>enteredAt) throw new Error('زمان آزمون نمی‌تواند در آینده باشد');
      return atomic(db,()=>{
        const current=ownedCurrent(sampleId);
        if(!current) throw new Error('نتیجه متعلق به این شرکت یافت نشد');
        if(current.revision!==input.expectedRevision) throw new Error('نتیجه تغییر کرده است؛ پرونده را دوباره باز کنید');
        if(current.state!=='approved') throw new Error('فقط نتیجه تأییدشده از مسیر اصلاح مهندسی قابل بازنگری است');
        if(testedAt<current.sampled_at) throw new Error('زمان آزمون پیش از نمونه‌برداری است');
        const revision=current.revision+1;
        db.prepare(`INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason)
          VALUES(?,?,?,'draft',?,?,?,?,NULL,?)`).run(sampleId,revision,input.strengthMpa,testedAt,testedBy,actor,enteredAt,reason);
        return {sampleId,revision,state:'draft'};
      });
    },

    voidResult(input) {
      const sampleId=text(input?.sampleId,'شناسه نمونه');
      if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<1) throw new Error('شماره بازنگری معتبر نیست');
      const reason=text(input?.reason,'علت ابطال'); const enteredAt=utcTimestamp(clock());
      return atomic(db,()=>{
        const current=ownedCurrent(sampleId);
        if(!current) throw new Error('نتیجه متعلق به این شرکت یافت نشد');
        if(current.revision!==input.expectedRevision) throw new Error('نتیجه تغییر کرده است؛ پرونده را دوباره باز کنید');
        if(current.state==='void') throw new Error('نتیجه قبلاً باطل شده است');
        const revision=current.revision+1;
        db.prepare(`INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason)
          VALUES(?,?,NULL,'void',?,?,?,?,NULL,?)`).run(sampleId,revision,current.tested_at,current.tested_by,actor,enteredAt,reason);
        return {sampleId,revision,state:'void'};
      });
    },

    approveDraft(input) {
      const sampleId = text(input?.sampleId, 'شناسه نمونه');
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error('شماره بازنگری معتبر نیست');
      const enteredAt = utcTimestamp(clock());
      return atomic(db, () => {
        const current = ownedCurrent(sampleId);
        if (!current) throw new Error('نتیجه‌ای برای تأیید یافت نشد');
        if (current.revision !== input.expectedRevision) throw new Error('نتیجه تغییر کرده است؛ پرونده را دوباره باز کنید');
        if (current.state !== 'draft') throw new Error('فقط نتیجه پیش‌نویس قابل تأیید است');
        const revision = current.revision + 1;
        const reason = `تأیید بازنگری ${current.revision}`;
        db.prepare(`INSERT INTO result_revisions(sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason)
          VALUES(?,?,?,'approved',?,?,?,?,?,?)`).run(sampleId,revision,current.strength_mpa,current.tested_at,current.tested_by,actor,enteredAt,actor,reason);
        return {sampleId,revision,state:'approved'};
      });
    },

    listSamples({limit=50}={}) {
      const safeLimit = Number.isSafeInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
      return db.prepare(`SELECT s.id,s.series_id,s.age_days,s.due_at,ss.kind,ss.project_id,ss.pour_id,ss.title,
        p.name AS project_name,r.revision,r.strength_mpa,r.state,r.tested_at,r.tested_by,r.approved_by
        FROM samples s JOIN sampling_series ss ON ss.id=s.series_id LEFT JOIN projects p ON p.id=ss.project_id AND p.company_id=ss.company_id
        LEFT JOIN current_results r ON r.sample_id=s.id WHERE ss.company_id=?
        ORDER BY COALESCE(s.due_at,ss.sampled_at) DESC,s.id DESC LIMIT ?`).all(companyId,safeLimit);
    },

    listReviewQueue({limit=100}={}) {
      const safeLimit=Number.isSafeInteger(limit)&&limit>0&&limit<=200?limit:100;
      return db.prepare(`SELECT s.id,s.series_id,s.age_days,s.due_at,ss.kind,ss.project_id,ss.pour_id,ss.title,p.name AS project_name,
        r.revision,r.strength_mpa,r.state,r.tested_at,r.tested_by,r.approved_by,r.reason
        FROM current_results r JOIN samples s ON s.id=r.sample_id JOIN sampling_series ss ON ss.id=s.series_id
        LEFT JOIN projects p ON p.id=ss.project_id AND p.company_id=ss.company_id
        WHERE ss.company_id=? AND r.state='draft' ORDER BY r.entered_at ASC,s.id ASC LIMIT ?`).all(companyId,safeLimit);
    },

    listResultHistory(sampleId) {
      sampleId = text(sampleId,'شناسه نمونه');
      const owned = db.prepare(`SELECT s.id FROM samples s JOIN sampling_series ss ON ss.id=s.series_id WHERE s.id=? AND ss.company_id=?`).get(sampleId,companyId);
      if (!owned) throw new Error('نمونه متعلق به این شرکت یافت نشد');
      return db.prepare(`SELECT sample_id,revision,strength_mpa,state,tested_at,tested_by,entered_by,entered_at,approved_by,reason
        FROM result_revisions WHERE sample_id=? ORDER BY revision DESC`).all(sampleId);
    },

    listSeries({kind, projectId} = {}) {
      if (!['customer','internal'].includes(kind)) throw new Error('مسیر نمایش را انتخاب کنید');
      if (kind === 'internal' && projectId != null) throw new Error('فیلتر پروژه برای آزمایش داخلی معتبر نیست');
      return db.prepare(`SELECT id,kind,project_id,pour_id,title,purpose,sampled_at,sampler_name,entered_by
        FROM sampling_series WHERE company_id=? AND kind=? AND (? IS NULL OR project_id=?) ORDER BY sampled_at DESC,id`)
        .all(companyId,kind,projectId??null,projectId??null);
    }
  };
}
