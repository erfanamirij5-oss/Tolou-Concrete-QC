import {createSampleSchedule} from '../domain/sampling.js';
import {validateSamplingContext} from '../domain/records.js';

const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
};

// Canonical internal timestamps; conversion from the Persian calendar belongs to the UI boundary.
export function utcTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw new Error('زمان ثبت‌شده معتبر نیست');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) throw new Error('تاریخ ثبت‌شده معتبر نیست');
  return value;
}

function atomic(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Main-process service only. actor/companyId must come from the trusted session, never IPC payload. */
export function createLaboratoryService(db, {companyId, actor, clock = () => new Date().toISOString()}) {
  companyId = text(companyId, 'شرکت');
  actor = text(actor, 'کاربر فعال');
  if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) throw new Error('کنترل ارتباط داده‌ها فعال نیست');
  if (!db.prepare('SELECT id FROM companies WHERE id=?').get(companyId)) throw new Error('شرکت یافت نشد');

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

    listSeries({kind, projectId} = {}) {
      if (!['customer','internal'].includes(kind)) throw new Error('مسیر نمایش را انتخاب کنید');
      if (kind === 'internal' && projectId != null) throw new Error('فیلتر پروژه برای آزمایش داخلی معتبر نیست');
      return db.prepare(`SELECT id,kind,project_id,pour_id,title,purpose,sampled_at,sampler_name,entered_by
        FROM sampling_series WHERE company_id=? AND kind=? AND (? IS NULL OR project_id=?) ORDER BY sampled_at DESC,id`)
        .all(companyId,kind,projectId??null,projectId??null);
    }
  };
}
