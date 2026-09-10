import * as XLSX from 'xlsx';
import type { ProjectQcReport } from '../shared/ipc.js';

type DetailedSpecimen={id:string;ageDays:number|null;dueAt:string|null;state:string|null;strengthMpa:number|null;testedAt:string|null;testedBy:string|null;approvedBy:string|null;shape:'cube'|'cylinder'|null;lengthMm:number|null;widthMm:number|null;heightMm:number|null;diameterMm:number|null;massKg:number|null;volumeM3:number|null;densityKgM3:number|null};
type DetailedSeries={id:string;sampledAt:string;samplerName:string;title:string;pourId:string|null;pourOccurredAt:string|null;concreteSourceName:string;freshConcrete:{slumpMm:number|null;temperatureC:number|null;measuredAt:string|null};specimens:DetailedSpecimen[];summary:{mean7Mpa:number|null;mean28Mpa:number|null;approved7Count:number;approved28Count:number}};
type DetailedReport=ProjectQcReport&{generatedAt?:string;organization?:{qcManagerName?:string;managingDirectorName?:string};series?:DetailedSeries[]};
const status=(value:string|null)=>value==='approved'?'تأییدشده':value==='draft'?'پیش‌نویس':value==='void'?'باطل':'بدون نتیجه';

export function projectReportWorkbook(report:ProjectQcReport){
  const enriched=report as DetailedReport;
  const wb=XLSX.utils.book_new();
  const metrics=[['شاخص','واحد','تعداد','میانگین','انحراف معیار نمونه','CV %','کمینه','بیشینه'],...[[report.analytics.strength,'مقاومت فشاری'],[report.analytics.slump,'اسلامپ بتن تازه'],[report.analytics.concreteTemperature,'دمای بتن تازه'],[report.analytics.hardenedDensity,'جرم حجمی بتن سخت‌شده']].map(([raw,label])=>{const metric=raw as typeof report.analytics.slump,s=metric.statistics;return[label,metric.unit,s.count,s.mean,s.sampleSd,s.cvPercent,s.min,s.max];})];
  const summary=XLSX.utils.aoa_to_sheet([['سامانه طلوع | گزارش رسمی کنترل کیفیت بتن'],['شرکت',report.company.name],['مسئول کنترل کیفیت',enriched.organization?.qcManagerName||'—'],['مدیرعامل',enriched.organization?.managingDirectorName||'—'],['پروژه',report.project.name],['مشتری',report.project.customerName||'—'],['نشانی',report.project.address||'—'],['تاریخ صدور',enriched.generatedAt||'—'],['شروع بازه',report.filters.startAt||'—'],['پایان بازه',report.filters.endAt||'—'],['نوبت‌های نمونه‌برداری',report.counts.samplingSeries],['نتایج مقاومت تأییدشده',report.counts.approvedStrengthResults],[],...metrics,[],['Rule Profile',report.standards.profile??'—'],['ارزیابی قبولی/رد',report.standards.acceptanceEvaluated?'بله':'خیر'],...report.notes.map(note=>['یادداشت',note])]);
  summary['!cols']=[{wch:32},{wch:42},{wch:16},{wch:16},{wch:20},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,summary,'خلاصه مدیریتی');

  const detailRows:any[][]=[['ردیف','تاریخ نمونه‌برداری','نمونه‌بردار','منبع بتن','اسلامپ mm','دمای بتن °C','سن روز','موعد آزمون','شکل','طول mm','عرض mm','ارتفاع mm','قطر mm','جرم kg','حجم m³','جرم حجمی kg/m³','مقاومت MPa','زمان آزمون','آزمایش‌کننده','تأییدکننده','وضعیت']];
  let rowNo=1;
  for(const series of enriched.series??[]){for(const specimen of series.specimens){detailRows.push([rowNo++,series.sampledAt,series.samplerName,series.concreteSourceName||'',series.freshConcrete.slumpMm,series.freshConcrete.temperatureC,specimen.ageDays??'شاهد',specimen.dueAt,specimen.shape==='cube'?'مکعبی':specimen.shape==='cylinder'?'استوانه‌ای':'',specimen.lengthMm,specimen.widthMm,specimen.heightMm,specimen.diameterMm,specimen.massKg,specimen.volumeM3,specimen.densityKgM3,specimen.strengthMpa,specimen.testedAt,specimen.testedBy||'',specimen.approvedBy||'',status(specimen.state)]);}}
  const details=XLSX.utils.aoa_to_sheet(detailRows);details['!cols']=[{wch:8},{wch:24},{wch:20},{wch:22},{wch:12},{wch:14},{wch:10},{wch:24},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:20},{wch:16},{wch:24},{wch:20},{wch:20},{wch:14}];XLSX.utils.book_append_sheet(wb,details,'ریز نتایج آزمون');

  const seriesRows:any[][]=[['نوبت','تاریخ نمونه‌برداری','نمونه‌بردار','منبع بتن','اسلامپ mm','دمای بتن °C','تعداد تأییدشده ۷ روزه','میانگین ۷ روزه MPa','تعداد تأییدشده ۲۸ روزه','میانگین ۲۸ روزه MPa']];
  (enriched.series??[]).forEach((s,i)=>seriesRows.push([i+1,s.sampledAt,s.samplerName,s.concreteSourceName||'',s.freshConcrete.slumpMm,s.freshConcrete.temperatureC,s.summary.approved7Count,s.summary.mean7Mpa,s.summary.approved28Count,s.summary.mean28Mpa]));
  const seriesSheet=XLSX.utils.aoa_to_sheet(seriesRows);seriesSheet['!cols']=[{wch:8},{wch:24},{wch:20},{wch:22},{wch:12},{wch:14},{wch:20},{wch:20},{wch:22},{wch:22}];XLSX.utils.book_append_sheet(wb,seriesSheet,'خلاصه نوبت‌های نمونه‌گیری');

  const trendSheet=XLSX.utils.aoa_to_sheet([['شاخص','زمان UTC','مقدار','واحد','سری نمونه‌گیری','نمونه','پروژه','سن روز'],...[[report.analytics.strength,'مقاومت فشاری'],[report.analytics.slump,'اسلامپ'],[report.analytics.concreteTemperature,'دمای بتن'],[report.analytics.hardenedDensity,'جرم حجمی']].flatMap(([raw,label])=>{const metric=raw as typeof report.analytics.slump;return metric.trend.map(p=>[label,p.at,p.value,metric.unit,p.seriesId??'',p.sampleId??'',p.projectId??'',p.ageDays??'']);})]);
  trendSheet['!cols']=[{wch:22},{wch:26},{wch:14},{wch:14},{wch:22},{wch:22},{wch:22},{wch:10}];XLSX.utils.book_append_sheet(wb,trendSheet,'داده‌های روند');
  const ageSheet=XLSX.utils.aoa_to_sheet([['سن روز','تعداد','میانگین MPa','SD','CV %','کمینه','بیشینه'],...Object.entries(report.analytics.strength.byAge).map(([age,s])=>[age,s.count,s.mean,s.sampleSd,s.cvPercent,s.min,s.max])]);ageSheet['!cols']=[{wch:12},{wch:12},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14}];XLSX.utils.book_append_sheet(wb,ageSheet,'مقاومت برحسب سن');
  return wb;
}
