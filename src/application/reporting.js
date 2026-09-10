import {createAnalyticsService} from './analytics.js';

const requiredText=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;

export function createReportingService(db,{companyId}){
 companyId=requiredText(companyId,'شرکت');
 const analytics=createAnalyticsService(db,{companyId});
 const specimenStatement=db.prepare(`SELECT s.id,s.age_days,s.due_at,r.strength_mpa,r.tested_at,r.tested_by,r.approved_by,r.state,sp.shape,sp.length_mm,sp.width_mm,sp.height_mm,sp.diameter_mm,sp.mass_kg,sp.volume_m3,sp.density_kg_m3 FROM samples s LEFT JOIN current_results r ON r.sample_id=s.id LEFT JOIN current_specimen_physical_measurements sp ON sp.sample_id=s.id WHERE s.series_id=? ORDER BY CASE WHEN s.age_days IS NULL THEN 9999 ELSE s.age_days END,s.id`);
 const buildSeries=row=>{const specimens=specimenStatement.all(row.id);const strength7=specimens.filter(x=>x.age_days===7&&x.state==='approved'&&typeof x.strength_mpa==='number').map(x=>x.strength_mpa);const strength28=specimens.filter(x=>x.age_days===28&&x.state==='approved'&&typeof x.strength_mpa==='number').map(x=>x.strength_mpa);return{id:row.id,sampledAt:row.sampled_at,samplerName:row.sampler_name,title:row.title??'',pourId:row.pour_id??null,pourOccurredAt:row.occurred_at??null,concreteSourceName:row.concrete_source_name??'',freshConcrete:{slumpMm:row.slump_mm??null,temperatureC:row.concrete_temperature_c??null,measuredAt:row.measured_at??null},specimens:specimens.map(x=>({id:x.id,ageDays:x.age_days,dueAt:x.due_at,state:x.state??null,strengthMpa:x.strength_mpa??null,testedAt:x.tested_at??null,testedBy:x.tested_by??null,approvedBy:x.approved_by??null,shape:x.shape??null,lengthMm:x.length_mm??null,widthMm:x.width_mm??null,heightMm:x.height_mm??null,diameterMm:x.diameter_mm??null,massKg:x.mass_kg??null,volumeM3:x.volume_m3??null,densityKgM3:x.density_kg_m3??null})),summary:{mean7Mpa:mean(strength7),mean28Mpa:mean(strength28),approved7Count:strength7.length,approved28Count:strength28.length}};};
 const organization=()=>{const company=db.prepare('SELECT id,name FROM companies WHERE id=?').get(companyId);const profile=db.prepare('SELECT qc_manager_name,managing_director_name FROM company_profiles WHERE company_id=?').get(companyId)??{qc_manager_name:'',managing_director_name:''};return{company,profile};};
 return{
  samplingSeriesReport(seriesId){seriesId=requiredText(seriesId,'نوبت نمونه‌برداری');const row=db.prepare(`SELECT ss.id,ss.project_id,ss.sampled_at,ss.sampler_name,ss.title,ss.pour_id,p.occurred_at,pr.name AS project_name,pr.customer_name,pr.address,COALESCE(cs.name,'') AS concrete_source_name,fc.slump_mm,fc.concrete_temperature_c,fc.measured_at FROM sampling_series ss LEFT JOIN projects pr ON pr.id=ss.project_id LEFT JOIN pours p ON p.id=ss.pour_id LEFT JOIN pour_qc_contexts pc ON pc.pour_id=ss.pour_id LEFT JOIN concrete_sources cs ON cs.id=pc.concrete_source_id LEFT JOIN current_fresh_concrete_measurements fc ON fc.series_id=ss.id WHERE ss.id=? AND ss.company_id=?`).get(seriesId,companyId);if(!row)throw new Error('نوبت نمونه‌برداری یافت نشد');const {company,profile}=organization();return{schema:'tolou-qc-series-report',schemaVersion:1,generatedAt:new Date().toISOString(),company:{id:company.id,name:company.name},organization:{qcManagerName:profile.qc_manager_name,managingDirectorName:profile.managing_director_name},project:row.project_id?{id:row.project_id,name:row.project_name,customerName:row.customer_name,address:row.address}:null,series:buildSeries(row),standards:{profile:null,acceptanceEvaluated:false},notes:['این برگه، نتایج ثبت‌شده همین نوبت نمونه‌برداری را گزارش می‌کند و بدون Rule Profile مستند حکم قبولی یا رد صادر نمی‌کند.']};},
  projectQc(input={}){
   const projectId=requiredText(input.projectId,'پروژه');
   const project=db.prepare('SELECT id,name,customer_name,address FROM projects WHERE id=? AND company_id=?').get(projectId,companyId);
   if(!project)throw new Error('پروژه یافت نشد');
   const {company,profile}=organization();
   const summary=analytics.summary({projectId,startAt:input.startAt??null,endAt:input.endAt??null});
   const {startAt,endAt}=summary.filters;
   const clauses=['ss.company_id=?','ss.project_id=?'],params=[companyId,projectId];
   if(startAt){clauses.push('ss.sampled_at>=?');params.push(startAt);}
   if(endAt){clauses.push('ss.sampled_at<=?');params.push(endAt);}
   const seriesRows=db.prepare(`SELECT ss.id,ss.sampled_at,ss.sampler_name,ss.title,ss.pour_id,p.occurred_at,COALESCE(cs.name,'') AS concrete_source_name,fc.slump_mm,fc.concrete_temperature_c,fc.measured_at FROM sampling_series ss LEFT JOIN pours p ON p.id=ss.pour_id LEFT JOIN pour_qc_contexts pc ON pc.pour_id=ss.pour_id LEFT JOIN concrete_sources cs ON cs.id=pc.concrete_source_id LEFT JOIN current_fresh_concrete_measurements fc ON fc.series_id=ss.id WHERE ${clauses.join(' AND ')} ORDER BY ss.sampled_at`).all(...params);
   const series=seriesRows.map(buildSeries);
   return{schema:'tolou-qc-project-report',schemaVersion:2,generatedAt:new Date().toISOString(),company:{id:company.id,name:company.name},organization:{qcManagerName:profile.qc_manager_name,managingDirectorName:profile.managing_director_name},project:{id:project.id,name:project.name,customerName:project.customer_name,address:project.address},filters:summary.filters,counts:{samplingSeries:series.length,approvedStrengthResults:summary.strength.statistics.count},series,analytics:summary,standards:{profile:null,acceptanceEvaluated:false},notes:['این گزارش توصیفی است و بدون Rule Profile مستند هیچ حکم قبولی یا رد صادر نمی‌کند.']};
  }
 };
}
