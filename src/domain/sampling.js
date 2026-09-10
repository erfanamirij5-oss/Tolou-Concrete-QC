/** Product policy only; these are not standard acceptance rules. */
export function createSampleSchedule(sampledAt, seriesId) {
  if (!seriesId || typeof seriesId !== 'string') throw new Error('شناسه سری الزامی است');
  if (typeof sampledAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(sampledAt)) throw new Error('زمان باید منطقه زمانی مشخص داشته باشد');
  const instant = Date.parse(sampledAt);
  if (!Number.isFinite(instant)) throw new Error('زمان نمونه‌برداری معتبر نیست');
  return [7,7,28,28,28,null].map((ageDays, index) => ({
    id: `${seriesId}-${index + 1}`, ageDays,
    dueAt: ageDays === null ? null : new Date(instant + ageDays * 86400000).toISOString(),
    status: ageDays === null ? 'reserve' : 'pending',
  }));
}

export function earlyWarning(strengths, target, threshold = 0.6) {
  if (!Array.isArray(strengths) || !strengths.length || strengths.some(x => typeof x !== 'number' || !Number.isFinite(x) || x < 0)) throw new Error('نتایج معتبر و کامل وارد کنید');
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('هدف یا حد هشدار معتبر نیست');
  const mean = strengths.reduce((sum, x) => sum + x, 0) / strengths.length;
  return { mean, ratio: mean / target, threshold, status: mean / target < threshold ? 'caution' : 'threshold-met', basis: 'internal-policy', acceptance: 'not-evaluated', prediction: null };
}
