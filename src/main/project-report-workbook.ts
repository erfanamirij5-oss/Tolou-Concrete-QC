import * as XLSX from 'xlsx';
import type { ProjectQcReport } from '../shared/ipc.js';

export function projectReportWorkbook(report:ProjectQcReport){
  const wb=XLSX.utils.book_new();
  const metrics=[['شاخص','واحد','تعداد','میانگین','انحراف معیار نمونه','CV %','کمینه','بیشینه'],...[[report.analytics.strength,'مقاومت فشاری'],[report.analytics.slump,'اسلامپ بتن تازه'],[report.analytics.concreteTemperature,'دمای بتن تازه'],[report.analytics.hardenedDensity,'جرم حجمی بتن سخت‌شده']].map(([raw,label])=>{const metric=raw as typeof report.analytics.slump,s=metric.statistics;return[label,metric.unit,s.count,s.mean,s.sampleSd,s.cvPercent,s.min,s.max];})];
  const summary=XLSX.utils.aoa_to_sheet([['سامانه طلوع | گزارش مهندسی کنترل کیفیت بتن'],['شرکت',report.company.name],['پروژه',report.project.name],['مشتری',report.project.customerName||'—'],['نشانی',report.project.address||'—'],['شروع بازه',report.filters.startAt||'—'],['پایان بازه',report.filters.endAt||'—'],['سری‌های نمونه‌گیری',report.counts.samplingSeries],['نتایج مقاومت تأییدشده',report.counts.approvedStrengthResults],[],...metrics,[],['Rule Profile',report.standards.profile??'—'],['ارزیابی قبولی/رد',report.standards.acceptanceEvaluated?'بله':'خیر'],...report.notes.map(note=>['یادداشت',note])]);
  summary['!cols']=[{wch:30},{wch:38},{wch:14},{wch:16},{wch:20},{wch:12},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,summary,'خلاصه');
  const trendSheet=XLSX.utils.aoa_to_sheet([['شاخص','زمان UTC','مقدار','واحد','سری نمونه‌گیری','نمونه','پروژه','سن روز'],...[[report.analytics.strength,'مقاومت فشاری'],[report.analytics.slump,'اسلامپ'],[report.analytics.concreteTemperature,'دمای بتن'],[report.analytics.hardenedDensity,'جرم حجمی']].flatMap(([raw,label])=>{const metric=raw as typeof report.analytics.slump;return metric.trend.map(p=>[label,p.at,p.value,metric.unit,p.seriesId??'',p.sampleId??'',p.projectId??'',p.ageDays??'']);})]);
  trendSheet['!cols']=[{wch:22},{wch:26},{wch:14},{wch:14},{wch:22},{wch:22},{wch:22},{wch:10}];
  XLSX.utils.book_append_sheet(wb,trendSheet,'داده‌های روند');
  const ageSheet=XLSX.utils.aoa_to_sheet([['سن روز','تعداد','میانگین MPa','SD','CV %','کمینه','بیشینه'],...Object.entries(report.analytics.strength.byAge).map(([age,s])=>[age,s.count,s.mean,s.sampleSd,s.cvPercent,s.min,s.max])]);
  ageSheet['!cols']=[{wch:12},{wch:12},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ageSheet,'مقاومت برحسب سن');
  return wb;
}
