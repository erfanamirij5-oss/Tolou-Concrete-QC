export const IPC_CHANNELS = {
  appInfo:'app:info', health:'app:health', createSeries:'laboratory:create-series', listSeries:'laboratory:list-series', saveDraft:'laboratory:save-draft',
  listSamples:'laboratory:list-samples', approveDraft:'laboratory:approve-draft', requestCorrection:'laboratory:request-correction', voidResult:'laboratory:void-result', reviewQueue:'laboratory:review-queue', resultHistory:'laboratory:result-history',
  scheduleWitness:'laboratory:schedule-witness', witnessScheduleHistory:'laboratory:witness-schedule-history',
  createProject:'projects:create', listProjects:'projects:list', createPour:'pours:create', listPours:'pours:list', dashboard:'dashboard:summary',
  createMixDesign:'engineering:create-mix-design', listMixDesigns:'engineering:list-mix-designs', createMixVersion:'engineering:create-mix-version', listMixVersions:'engineering:list-mix-versions',
  savePourSpecification:'engineering:save-pour-specification', getPourSpecification:'engineering:get-pour-specification',
  createCustomer:'qc-parties:create-customer', listCustomers:'qc-parties:list-customers', createConcreteSource:'qc-parties:create-concrete-source', listConcreteSources:'qc-parties:list-concrete-sources',
  createTestingLaboratory:'qc-parties:create-testing-laboratory', listTestingLaboratories:'qc-parties:list-testing-laboratories', registerExternalResult:'qc-parties:register-external-result', listExternalResults:'qc-parties:list-external-results',
} as const;
export interface AppInfo { name:string; version:string; platform:string; locale:string; }
export interface HealthStatus { ok:true; timestamp:string; database:'ready'; }
export type LaboratoryKind='customer'|'internal';
export type ResultState='draft'|'approved'|'void';
export interface CreateSeriesInput {id:string;kind:LaboratoryKind;projectId?:string;pourId?:string;title?:string;purpose?:string;sampledAt:string;samplerName:string;}
export interface CreatedSample {id:string;ageDays:number|null;dueAt:string|null;}
export interface CreateSeriesResult {id:string;samples:CreatedSample[];}
export interface SeriesSummary {id:string;kind:LaboratoryKind;project_id:string|null;pour_id:string|null;title:string|null;purpose:string|null;sampled_at:string;sampler_name:string;entered_by:string;}
export interface SaveDraftInput {sampleId:string;expectedRevision:number;strengthMpa:number;testedAt:string;testedBy:string;reason?:string;}
export interface ApproveDraftInput {sampleId:string;expectedRevision:number;}
export interface RequestCorrectionInput {sampleId:string;expectedRevision:number;strengthMpa:number;testedAt:string;testedBy:string;reason:string;}
export interface VoidResultInput {sampleId:string;expectedRevision:number;reason:string;}
export interface ScheduleWitnessInput {sampleId:string;expectedRevision:number;dueAt:string;reason:string;}
export interface WitnessScheduleResult {sampleId:string;revision:number;dueAt:string;}
export interface WitnessScheduleRevision {sample_id:string;revision:number;due_at:string;reason:string;entered_by:string;entered_at:string;}
export interface DraftResult {sampleId:string;revision:number;state:'draft';}
export interface ApprovalResult {sampleId:string;revision:number;state:'approved';}
export interface VoidResult {sampleId:string;revision:number;state:'void';}
export interface SampleSummary {id:string;series_id:string;age_days:number|null;due_at:string|null;witness_schedule_revision?:number|null;kind:LaboratoryKind;project_id:string|null;pour_id:string|null;title:string|null;project_name:string|null;revision:number|null;strength_mpa:number|null;state:ResultState|null;tested_at:string|null;tested_by:string|null;approved_by:string|null;reason?:string|null;}
export interface ResultRevision {sample_id:string;revision:number;strength_mpa:number|null;state:ResultState;tested_at:string;tested_by:string;entered_by:string;entered_at:string;approved_by:string|null;reason:string|null;}
export interface CreateProjectInput {id:string;name:string;customerName:string;address?:string;}
export interface ProjectSummary {id:string;name:string;customer_name:string;address:string;archived:number;}
export interface CreatePourInput {id:string;projectId:string;occurredAt:string;}
export interface PourSummary {id:string;project_id:string;occurred_at:string;}
export interface DashboardSummary {activeProjects:number;totalSeries:number;pendingResults:number;draftResults:number;}
export interface CreateMixDesignInput {id:string;code:string;title:string;}
export interface MixDesignSummary {id:string;code:string;title:string;archived:number;}
export interface CreateMixVersionInput {id:string;mixDesignId:string;revision?:number;targetStrengthMpa?:number|null;maxWaterCementRatio?:number|null;targetSlumpMm?:number|null;nominalMaxAggregateMm?:number|null;cementKgM3?:number|null;waterKgM3?:number|null;fineAggregateKgM3?:number|null;coarseAggregateKgM3?:number|null;scmKgM3?:number|null;admixtureKgM3?:number|null;notes?:string;}
export interface MixVersionSummary {id:string;mix_design_id:string;revision:number;target_strength_mpa:number|null;max_water_cement_ratio:number|null;target_slump_mm:number|null;nominal_max_aggregate_mm:number|null;cement_kg_m3:number|null;water_kg_m3:number|null;fine_aggregate_kg_m3:number|null;coarse_aggregate_kg_m3:number|null;scm_kg_m3:number|null;admixture_kg_m3:number|null;notes:string;created_at:string;created_by:string;}
export interface SavePourSpecificationInput {pourId:string;projectId:string;mixDesignVersionId?:string|null;elementName?:string;concreteClass?:string;specifiedStrengthMpa?:number|null;targetSlumpMm?:number|null;nominalMaxAggregateMm?:number|null;exposureClass?:string;placementMethod?:string;plannedVolumeM3?:number|null;notes?:string;}
export interface PourSpecification {pour_id:string;company_id:string;project_id:string;mix_design_version_id:string|null;element_name:string;concrete_class:string;specified_strength_mpa:number|null;target_slump_mm:number|null;nominal_max_aggregate_mm:number|null;exposure_class:string;placement_method:string;planned_volume_m3:number|null;notes:string;mix_code:string|null;mix_title:string|null;mix_revision:number|null;}
export interface CreateCustomerInput {id:string;code:string;name:string;}
export interface CustomerSummary {id:string;code:string;name:string;archived:number;}
export interface CreateConcreteSourceInput {id:string;code:string;name:string;sourceType:'internal'|'external';}
export interface ConcreteSourceSummary {id:string;code:string;name:string;source_type:'internal'|'external';archived:number;}
export interface CreateTestingLaboratoryInput {id:string;code:string;name:string;labType:'internal'|'external';}
export interface TestingLaboratorySummary {id:string;code:string;name:string;lab_type:'internal'|'external';archived:number;}
export interface RegisterExternalResultInput {id:string;sampleId:string;testingLaboratoryId:string;externalEventId:string;strengthMpa?:number|null;testedAt?:string|null;receivedAt?:string|null;notes?:string;}
export interface ExternalResultSummary {id:string;sample_id:string;testing_laboratory_id:string;laboratory_name:string;external_event_id:string;strength_mpa:number|null;tested_at:string|null;received_at:string;received_by:string;notes:string;}
export type IpcResult<T>={ok:true;data:T}|{ok:false;message:string};
export interface TolouBridge {
 getAppInfo():Promise<AppInfo>; health():Promise<HealthStatus>;
 createSeries(input:CreateSeriesInput):Promise<IpcResult<CreateSeriesResult>>; listSeries(kind:LaboratoryKind,projectId?:string):Promise<IpcResult<SeriesSummary[]>>; saveDraft(input:SaveDraftInput):Promise<IpcResult<DraftResult>>;
 listSamples(limit?:number):Promise<IpcResult<SampleSummary[]>>; approveDraft(input:ApproveDraftInput):Promise<IpcResult<ApprovalResult>>; requestCorrection(input:RequestCorrectionInput):Promise<IpcResult<DraftResult>>; voidResult(input:VoidResultInput):Promise<IpcResult<VoidResult>>; reviewQueue(limit?:number):Promise<IpcResult<SampleSummary[]>>; resultHistory(sampleId:string):Promise<IpcResult<ResultRevision[]>>;
 scheduleWitness(input:ScheduleWitnessInput):Promise<IpcResult<WitnessScheduleResult>>; witnessScheduleHistory(sampleId:string):Promise<IpcResult<WitnessScheduleRevision[]>>;
 createProject(input:CreateProjectInput):Promise<IpcResult<{id:string}>>; listProjects():Promise<IpcResult<ProjectSummary[]>>;
 createPour(input:CreatePourInput):Promise<IpcResult<{id:string}>>; listPours(projectId:string):Promise<IpcResult<PourSummary[]>>; dashboard():Promise<IpcResult<DashboardSummary>>;
 createMixDesign(input:CreateMixDesignInput):Promise<IpcResult<{id:string;code:string;title:string}>>; listMixDesigns():Promise<IpcResult<MixDesignSummary[]>>;
 createMixVersion(input:CreateMixVersionInput):Promise<IpcResult<{id:string;mixDesignId:string;revision:number}>>; listMixVersions(mixDesignId:string):Promise<IpcResult<MixVersionSummary[]>>;
 savePourSpecification(input:SavePourSpecificationInput):Promise<IpcResult<{pourId:string;projectId:string;mixDesignVersionId:string|null}>>; getPourSpecification(pourId:string):Promise<IpcResult<PourSpecification|null>>;
 createCustomer(input:CreateCustomerInput):Promise<IpcResult<{id:string;code:string;name:string}>>; listCustomers():Promise<IpcResult<CustomerSummary[]>>;
 createConcreteSource(input:CreateConcreteSourceInput):Promise<IpcResult<{id:string;code:string;name:string}>>; listConcreteSources():Promise<IpcResult<ConcreteSourceSummary[]>>;
 createTestingLaboratory(input:CreateTestingLaboratoryInput):Promise<IpcResult<{id:string;code:string;name:string}>>; listTestingLaboratories():Promise<IpcResult<TestingLaboratorySummary[]>>;
 registerExternalResult(input:RegisterExternalResultInput):Promise<IpcResult<{id:string;sampleId:string;externalEventId:string}>>; listExternalResults(limit?:number):Promise<IpcResult<ExternalResultSummary[]>>;
}
