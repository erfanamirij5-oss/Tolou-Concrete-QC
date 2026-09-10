export const IPC_CHANNELS = {
  appInfo: 'app:info',
  health: 'app:health',
  createSeries: 'laboratory:create-series',
  listSeries: 'laboratory:list-series',
  saveDraft: 'laboratory:save-draft',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  locale: string;
}

export interface HealthStatus {
  ok: true;
  timestamp: string;
  database: 'ready';
}

export type LaboratoryKind = 'customer' | 'internal';

export interface CreateSeriesInput {
  id: string;
  kind: LaboratoryKind;
  projectId?: string;
  pourId?: string;
  title?: string;
  purpose?: string;
  sampledAt: string;
  samplerName: string;
}

export interface CreatedSample {
  id: string;
  ageDays: number | null;
  dueAt: string | null;
}

export interface CreateSeriesResult {
  id: string;
  samples: CreatedSample[];
}

export interface SeriesSummary {
  id: string;
  kind: LaboratoryKind;
  project_id: string | null;
  pour_id: string | null;
  title: string | null;
  purpose: string | null;
  sampled_at: string;
  sampler_name: string;
  entered_by: string;
}

export interface SaveDraftInput {
  sampleId: string;
  expectedRevision: number;
  strengthMpa: number;
  testedAt: string;
  testedBy: string;
  reason?: string;
}

export interface DraftResult {
  sampleId: string;
  revision: number;
  state: 'draft';
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface TolouBridge {
  getAppInfo(): Promise<AppInfo>;
  health(): Promise<HealthStatus>;
  createSeries(input: CreateSeriesInput): Promise<IpcResult<CreateSeriesResult>>;
  listSeries(kind: LaboratoryKind, projectId?: string): Promise<IpcResult<SeriesSummary[]>>;
  saveDraft(input: SaveDraftInput): Promise<IpcResult<DraftResult>>;
}
