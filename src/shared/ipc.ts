export const IPC_CHANNELS = {
  appInfo: 'tolou:app-info', health: 'tolou:health', createSeries: 'tolou:create-series', listSeries: 'tolou:list-series', saveDraft: 'tolou:save-draft', listSamples: 'tolou:list-samples', approveDraft: 'tolou:approve-draft', requestCorrection: 'tolou:request-correction', voidResult: 'tolou:void-result', reviewQueue: 'tolou:review-queue', resultHistory: 'tolou:result-history', scheduleWitness: 'tolou:schedule-witness', witnessScheduleHistory: 'tolou:witness-schedule-history', createProject: 'tolou:create-project', listProjects: 'tolou:list-projects', createPour: 'tolou:create-pour', listPours: 'tolou:list-pours', dashboard: 'tolou:dashboard', savePourContext: 'tolou:save-pour-context', getPourContext: 'tolou:get-pour-context', listPourContexts: 'tolou:list-pour-contexts', createMixDesign: 'tolou:create-mix-design', listMixDesigns: 'tolou:list-mix-designs', createMixVersion: 'tolou:create-mix-version', listMixVersions: 'tolou:list-mix-versions', savePourSpecification: 'tolou:save-pour-specification', getPourSpecification: 'tolou:get-pour-specification', createCustomer: 'tolou:create-customer', listCustomers: 'tolou:list-customers', createConcreteSource: 'tolou:create-concrete-source', listConcreteSources: 'tolou:list-concrete-sources', createTestingLaboratory: 'tolou:create-testing-laboratory', listTestingLaboratories: 'tolou:list-testing-laboratories', registerExternalResult: 'tolou:register-external-result', listExternalResults: 'tolou:list-external-results', listExternalAttachments: 'tolou:list-external-attachments', addExternalAttachment: 'tolou:add-external-attachment', saveSpecimenPhysics: 'tolou:save-specimen-physics', getSpecimenPhysics: 'tolou:get-specimen-physics', listSpecimenPhysics: 'tolou:list-specimen-physics', specimenPhysicsHistory: 'tolou:specimen-physics-history', saveFreshConcrete: 'tolou:save-fresh-concrete', getFreshConcrete: 'tolou:get-fresh-concrete', freshConcreteHistory: 'tolou:fresh-concrete-history', analyticsSummary: 'tolou:analytics-summary', projectQcReport: 'tolou:project-qc-report', exportProjectQcPdf: 'tolou:export-project-qc-pdf', exportProjectQcExcel: 'tolou:export-project-qc-excel'
} as const;

export type IpcResult<T> = { ok: true; data: T } | { ok: false; message: string };
export type LaboratoryKind = 'internal' | 'customer';
export type ResultState = 'draft' | 'approved' | 'void';
export type QcDueStatus = 'scheduled' | 'warning' | 'overdue';

export type AppInfo = { name: string; version: string; platform: string; locale: string };
export type HealthStatus = { ok: true; timestamp: string; database: 'ready' };
export type ProjectSummary = { id: string; name: string; customer_name: string; address: string; archived: number };
export type PourSummary = { id: string; project_id: string; occurred_at: string };
export type DashboardDueItem = { sampleId:string; seriesId:string; ageDays:number|null; dueAt:string; sampledAt:string; projectId:string|null; projectName:string|null; title:string|null; kind:LaboratoryKind; remainingHours:number; status:QcDueStatus };
export type DashboardSummary = { activeProjects:number; totalSeries:number; pendingResults:number; draftResults:number; dueSoonCount:number; overdueCount:number; dueSchedule:DashboardDueItem[] };
export type CreateProjectInput = { id:string; name:string; customerName:string; address:string };
export type CreatePourInput = { id:string; projectId:string; occurredAt:string; customerId?:string; concreteSourceId?:string };
export type CreateSeriesInput = { id:string; kind:LaboratoryKind; projectId?:string; pourId?:string; title?:string; purpose?:string; sampledAt:string; samplerName:string };
export type ScheduledSample = { id:string; ageDays:number|null; dueAt:string|null; status:'pending'|'reserve' };
export type CreateSeriesResult = { id:string; samples:ScheduledSample[] };
export type SeriesSummary = { id:string; kind:LaboratoryKind; project_id:string|null; pour_id:string|null; title:string|null; purpose:string|null; sampled_at:string; sampler_name:string; entered_by:string; project_name?:string|null };
export type SampleSummary = { id:string; series_id:string; age_days:number|null; due_at:string|null; witness_schedule_revision:number|null; kind:LaboratoryKind; project_id:string|null; pour_id:string|null; title:string|null; project_name:string|null; revision:number|null; strength_mpa:number|null; state:ResultState|null; tested_at:string|null; tested_by:string|null; approved_by:string|null; reason?:string|null };
export type SaveDraftInput = { sampleId:string; expectedRevision:number; strengthMpa:number; testedAt:string; testedBy:string; reason?:string };
export type DraftResult = { sampleId:string; revision:number; state:'draft' };
export type ApproveDraftInput = { sampleId:string; expectedRevision:number };
export type ApprovalResult = { sampleId:string; revision:number; state:'approved' };
export type RequestCorrectionInput = SaveDraftInput;
export type VoidResultInput = { sampleId:string; expectedRevision:number; reason:string };
export type VoidResult = { sampleId:string; revision:number; state:'void' };
export type ResultRevision = { sample_id:string; revision:number; strength_mpa:number|null; state:ResultState; tested_at:string|null; tested_by:string|null; entered_by:string; entered_at:string; approved_by:string|null; reason:string|null };
export type ScheduleWitnessInput = { sampleId:string; expectedRevision:number; dueAt:string; reason:string };
export type WitnessScheduleResult = { sampleId:string; revision:number; dueAt:string };
export type WitnessScheduleRevision = { sample_id:string; revision:number; due_at:string; reason:string; entered_by:string; entered_at:string };

export type MixDesignSummary={id:string;code:string;title:string;archived:number};
export type MixVersionSummary={id:string;mix_design_id:string;version_no:number,cement_kg_m3:number,water_kg_m3:number,fine_aggregate_kg_m3:number,coarse_aggregate_kg_m3:number,scm_kg_m3:number,admixture_kg_m3:number,created_at:string};
export type CreateMixDesignInput={id:string;code:string;title:string};
export type CreateMixVersionInput={id:string;mixDesignId:string;cementKgM3:number;waterKgM3:number;fineAggregateKgM3:number;coarseAggregateKgM3:number;scmKgM3?:number;admixtureKgM3?:number};
export type SavePourSpecificationInput={pourId:string;mixVersionId:string;targetStrengthMpa:number;targetSlumpMm?:number|null;notes?:string};
export type PourSpecificationSummary={pour_id:string;mix_version_id:string;target_strength_mpa:number;target_slump_mm:number|null;notes:string|null};
export type CreateCustomerInput={id:string;name:string};
export type CreateConcreteSourceInput={id:string;name:string};
export type CreateTestingLaboratoryInput={id:string;name:string};
export type RegisterExternalResultInput={id:string;sampleId:string;testingLaboratoryId:string;strengthMpa:number;testedAt:string;referenceNo?:string};
export type AttachmentSummary={id:string,event_id:string,original_name:string,stored_name:string,mime_type:string,size_bytes:number,sha256:string,created_at:string};
export type AddAttachmentResult={cancelled:boolean;attachment?:AttachmentSummary};
export type SpecimenShape='cube'|'cylinder';
export type SaveSpecimenPhysicsInput={sampleId:string;expectedRevision:number;shape:SpecimenShape;lengthMm?:number|null;widthMm?:number|null;heightMm?:number|null;diameterMm?:number|null;massKg:number;reason?:string};
export type SpecimenPhysicsSummary={sample_id:string;revision:number;shape:SpecimenShape;length_mm:number|null;width_mm:number|null;height_mm:number|null;diameter_mm:number|null;mass_kg:number;volume_m3:number;density_kg_m3:number;entered_by:string;entered_at:string;reason:string|null};
export type SaveFreshConcreteInput={seriesId:string;expectedRevision:number;slumpMm:number|null;concreteTemperatureC:number|null;measuredAt:string;reason?:string};
export type FreshConcreteSummary={series_id:string;revision:number;slump_mm:number|null;concrete_temperature_c:number|null;measured_at:string;entered_by:string;entered_at:string;reason:string|null};
export type AnalyticsFilter={projectId?:string;from?:string;to?:string};
export type AnalyticsSeries={metric:string;unit:string;count:number;mean:number|null;min:number|null;max:number|null;stdDev:number|null;points:Array<{at:string;value:number;label:string}>};
export type AnalyticsSummary={strength:AnalyticsSeries;slump:AnalyticsSeries;temperature:AnalyticsSeries;density:AnalyticsSeries};
export type ProjectQcReportInput={projectId:string;from?:string;to?:string};
export type ProjectQcReport={project:{id:string;name:string;customerName:string};generatedAt:string;analytics:AnalyticsSummary;sampleCount:number;approvedResultCount:number;pendingResultCount:number};
export type ReportExportResult={cancelled:boolean;path?:string};
