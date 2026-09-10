const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است`);
  return value.trim();
};

/** Validate the distinction between customer and internal sampling before persistence. */
export function validateSamplingContext(input) {
  if (!input || !['customer', 'internal'].includes(input.kind)) throw new Error('مسیر نمونه‌برداری معتبر نیست');
  const samplerName = requiredText(input.samplerName, 'نام نمونه‌بردار');
  const enteredBy = requiredText(input.enteredBy, 'ثبت‌کننده');
  if (input.kind === 'customer') {
    return {kind: 'customer', projectId: requiredText(input.projectId, 'پروژه'), pourId: requiredText(input.pourId, 'نوبت بتن‌ریزی'), samplerName, enteredBy};
  }
  if (input.projectId != null || input.pourId != null) throw new Error('آزمایش داخلی نباید در پرونده بتن تحویلی ثبت شود');
  return {kind: 'internal', title: requiredText(input.title, 'عنوان آزمایش'), purpose: requiredText(input.purpose, 'هدف آزمایش'), samplerName, enteredBy};
}

/** Target batching quantities, not measured yield or corrected effective water. */
export function planLaboratoryBatch(components, targetVolumeLitres) {
  if (!Number.isFinite(targetVolumeLitres) || targetVolumeLitres <= 0) throw new Error('حجم هدف معتبر نیست');
  if (!Array.isArray(components) || !components.length) throw new Error('اجزای طرح را وارد کنید');
  const ids = new Set();
  return components.map(component => {
    const id = requiredText(component.id, 'شناسه جزء');
    if (ids.has(id)) throw new Error('جزء تکراری است');
    ids.add(id);
    if (!Number.isFinite(component.kgPerCubicMetre) || component.kgPerCubicMetre < 0) throw new Error('مقدار مصالح معتبر نیست');
    const plannedKg = component.kgPerCubicMetre * (targetVolumeLitres / 1000);
    if (!Number.isFinite(plannedKg)) throw new Error('مقدار محاسبه‌شده خارج از محدوده است');
    return {id, plannedKg, actualKg: null, basis: 'target-volume'};
  });
}
