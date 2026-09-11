import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProjectWorkbench } from './ProjectWorkbench';
import { ReviewWorkspace } from './ReviewWorkspace';
import { EngineeringWorkbench } from './EngineeringWorkbench';
import { QcPartiesWorkbench } from './QcPartiesWorkbench';
import { AnalyticsWorkbench } from './AnalyticsWorkbench';
import { ReportCenter } from './ReportCenter';
import { SamplingWorkspace } from './SamplingWorkspace';
import { FreshConcreteWorkspace } from './FreshConcreteWorkspace';
import { ResultEntryWorkspace } from './ResultEntryWorkspace';
import { SpecimenListWorkspace } from './SpecimenListWorkspace';
import { SystemCenter } from './SystemCenter';
import { isoToPersianLocal } from './jalali';
import type { DashboardSummary, PourContextSummary, PourSpecification, ProjectSummary, SampleSummary } from '../shared/ipc';
import { AnalyticsIcon, DashboardIcon, FreshIcon, MixIcon, ProjectsIcon, ReportsIcon, ResultIcon, ReviewIcon, SamplingIcon, SettingsIcon, SpecimenIcon } from './RecoveryIcons';
import './ui-recovery.css';
import './dashboard-precision.css';
import './final-polish.css';

"+(await (async()=>{throw new Error('placeholder')})())}