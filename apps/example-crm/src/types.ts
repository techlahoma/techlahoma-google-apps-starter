export type PipelineStage = 'lead' | 'estimate' | 'scheduled' | 'complete';

export interface CRMConfig {
  businessName: string;
  customFieldLabel: string;
  isFirstRunComplete: boolean;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  customFieldValue: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  workOrderNumber: string;
  contactId: string;
  title: string;
  value: number;
  stage: PipelineStage;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  contactId: string;
  opportunityId?: string;
  dueDate: string; // YYYY-MM-DD
  note: string;
  completed: boolean;
  completedAt?: string;
}

export interface CRMData {
  version: 1;
  notice: 'FICTIONAL DEMO DATA';
  config: CRMConfig;
  contacts: Contact[];
  opportunities: Opportunity[];
  followUps: FollowUp[];
}

export type StorageResult<T> =
  {success: true; data: T} | {success: false; error: string};
