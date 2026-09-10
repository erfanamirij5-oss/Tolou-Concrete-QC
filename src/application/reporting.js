import {createAnalyticsService} from './analytics.js';

const requiredText=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};

export function createReportingService(db,{companyId}){
 companyId=requiredText(companyId,'شرکت');
 const analytics=createAnalyticsService(db,{companyId});
 return{
  projectQc(input={}){
   const projectId=requiredText(input.projectId,'پروژه');
   const project=db.prepare('SELECT id,name,customer_name,address FROM projects WHERE id=? AND company_id=?').get(projectId,companyId);
   if(!project)throw new Error('پروژه یافت نشد');
   const company=db.prepare('SELECT id,name FROM companies WHERE id=?').get(companyId);
   const summary=analytics.summary({projectId,startAt:input.startAt??null,endAt:input.endAt??null});
   const seriesCount=db.prepare('SELECT COUNT(*) AS count FROM sampling_series WHERE company_id=? AND project_id=?').get(companyId,projectId).count;
   const approvedResultCount=db.prepare(`SELECT COUNT(*) AS count FROM current_results r JOIN samples s ON s.id=r.sample_id JOIN sampling_series ss ON ss.id=s.series_id WHERE ss.company_id=? AND ss.project_id=? AND r.state='approved'`).get(companyId,projectId).count;
   return{
    schema:'tolou-qc-project-report',
    schemaVersion:1,
    company:{id:company.id,name:company.name},
    project:{id:project.id,name:project.name,customerName:project.customer_name,address:project.address},
    filters:summary.filters,
    counts:{samplingSeries:seriesCount,approvedStrengthResults:approvedResultCount},
    analytics:summary,
    standards:{profile:null,acceptanceEvaluated:false},
    notes:['این گزارش فعلاً توصیفی است و بدون Rule Profile مستند هیچ حکم قبولی یا رد صادر نمی‌کند.']
   };
  }
 };
}
