import type {CRMData, StorageResult} from './types';

export const STORAGE_KEY = 'example_crm_demo_data_v1';
export const NOTICE_HEADER = 'FICTIONAL DEMO DATA';

export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function getRelativeDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function getDefaultDemoData(): CRMData {
  const today = getTodayString();
  const overdue1 = getRelativeDateString(-2);
  const overdue2 = getRelativeDateString(-1);
  const upcoming1 = getRelativeDateString(1);
  const upcoming2 = getRelativeDateString(3);

  return {
    version: 1,
    notice: NOTICE_HEADER,
    config: {
      businessName: 'Spoke & Sprocket Repair Shop',
      customFieldLabel: 'Bike Model / Frame',
      isFirstRunComplete: false,
    },
    contacts: [
      {
        id: 'c-01',
        name: 'Demo Contact 01 — Alex River',
        email: 'alex.demo@example.com',
        phone: '(555) 019-2831',
        customFieldValue: 'Trek FX 3 Disc (2023)',
        isArchived: false,
        createdAt: getRelativeDateString(-10),
      },
      {
        id: 'c-02',
        name: 'Demo Contact 02 — Morgan Sprocket',
        email: 'morgan.demo@example.com',
        phone: '(555) 012-4491',
        customFieldValue: 'Specialized Rockhopper Comp',
        isArchived: false,
        createdAt: getRelativeDateString(-8),
      },
      {
        id: 'c-03',
        name: 'Demo Contact 03 — Taylor Chain',
        email: 'taylor.demo@example.com',
        phone: '(555) 018-9920',
        customFieldValue: 'Cannondale Synapse Carbon',
        isArchived: false,
        createdAt: getRelativeDateString(-6),
      },
      {
        id: 'c-04',
        name: 'Demo Contact 04 — Casey Spoke',
        email: 'casey.demo@example.com',
        phone: '(555) 014-7733',
        customFieldValue: 'Giant Escape 3 City',
        isArchived: false,
        createdAt: getRelativeDateString(-4),
      },
      {
        id: 'c-05',
        name: 'Demo Contact 05 — Jordan Pedal',
        email: 'jordan.demo@example.com',
        phone: '(555) 011-8844',
        customFieldValue: 'Surly Disc Trucker (Touring)',
        isArchived: false,
        createdAt: getRelativeDateString(-2),
      },
      {
        id: 'c-06',
        name: 'Demo Contact 06 — Riley Gear',
        email: 'riley.demo@example.com',
        phone: '(555) 016-3355',
        customFieldValue: 'Co-op Cycles CTY 1.1',
        isArchived: false,
        createdAt: today,
      },
    ],
    opportunities: [
      {
        id: 'opp-101',
        workOrderNumber: 'WO-101',
        contactId: 'c-01',
        title: 'Hydraulic Brake Bleed & New Pads',
        value: 120,
        stage: 'lead',
        createdAt: getRelativeDateString(-10),
        updatedAt: getRelativeDateString(-2),
      },
      {
        id: 'opp-102',
        workOrderNumber: 'WO-102',
        contactId: 'c-02',
        title: '1x12 Drivetrain Tune-up & Chain Replacement',
        value: 185,
        stage: 'estimate',
        createdAt: getRelativeDateString(-8),
        updatedAt: getRelativeDateString(-1),
      },
      {
        id: 'opp-103',
        workOrderNumber: 'WO-103',
        contactId: 'c-03',
        title: 'Custom Wheel Truing & Spoke Replacement',
        value: 95,
        stage: 'scheduled',
        createdAt: getRelativeDateString(-6),
        updatedAt: today,
      },
      {
        id: 'opp-104',
        workOrderNumber: 'WO-104',
        contactId: 'c-04',
        title: 'Complete Seasonal Overhaul & Cable Housing',
        value: 260,
        stage: 'complete',
        createdAt: getRelativeDateString(-14),
        updatedAt: getRelativeDateString(-3),
      },
      {
        id: 'opp-105',
        workOrderNumber: 'WO-105',
        contactId: 'c-05',
        title: 'Tubeless Tire Conversion & Sealant Refill',
        value: 110,
        stage: 'estimate',
        createdAt: getRelativeDateString(-3),
        updatedAt: today,
      },
    ],
    followUps: [
      {
        id: 'f-1',
        contactId: 'c-01',
        opportunityId: 'opp-101',
        dueDate: overdue1,
        note: 'Call Alex to confirm brake fluid preference & schedule drop-off',
        completed: false,
      },
      {
        id: 'f-2',
        contactId: 'c-02',
        opportunityId: 'opp-102',
        dueDate: overdue2,
        note: 'Send revised estimate breakdown for drivetrain upgrade',
        completed: false,
      },
      {
        id: 'f-3',
        contactId: 'c-03',
        opportunityId: 'opp-103',
        dueDate: today,
        note: 'Confirm bike arrival for wheel truing',
        completed: false,
      },
      {
        id: 'f-4',
        contactId: 'c-04',
        opportunityId: 'opp-104',
        dueDate: upcoming1,
        note: 'Post-service 1-week check-in on gear shifting feel',
        completed: false,
      },
      {
        id: 'f-5',
        contactId: 'c-05',
        opportunityId: 'opp-105',
        dueDate: upcoming2,
        note: 'Follow up on tubeless rim tape availability',
        completed: false,
      },
    ],
  };
}

export class StorageAdapter {
  private key: string;

  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  public load(): StorageResult<CRMData> {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        const initial = getDefaultDemoData();
        this.save(initial);
        return {success: true, data: initial};
      }

      const parsed = JSON.parse(raw);
      const validation = this.validateSchema(parsed);
      if (!validation.success) {
        return validation;
      }

      return {success: true, data: parsed as CRMData};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown storage error';
      return {success: false, error: `Failed to load CRM data: ${msg}`};
    }
  }

  public save(data: CRMData): StorageResult<CRMData> {
    try {
      data.notice = NOTICE_HEADER;
      const json = JSON.stringify(data, null, 2);
      localStorage.setItem(this.key, json);
      return {success: true, data};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage write error';
      return {
        success: false,
        error: `Storage quota exceeded or disabled: ${msg}`,
      };
    }
  }

  public reset(): StorageResult<CRMData> {
    const fresh = getDefaultDemoData();
    // Mark first run as complete so user doesn't get stuck after reset if they already did setup
    fresh.config.isFirstRunComplete = true;
    return this.save(fresh);
  }

  public importJSON(jsonStr: string): StorageResult<CRMData> {
    try {
      if (!jsonStr || !jsonStr.trim()) {
        return {success: false, error: 'Import payload cannot be empty.'};
      }
      const parsed = JSON.parse(jsonStr);
      const validation = this.validateSchema(parsed);
      if (!validation.success) {
        return validation;
      }
      const saveResult = this.save(parsed as CRMData);
      return saveResult;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON string';
      return {success: false, error: `JSON Parse Error: ${msg}`};
    }
  }

  public exportJSON(data: CRMData): string {
    const payload: CRMData = {
      ...data,
      version: 1,
      notice: NOTICE_HEADER,
    };
    return JSON.stringify(payload, null, 2);
  }

  public validateSchema(obj: unknown): StorageResult<CRMData> {
    if (typeof obj !== 'object' || obj === null) {
      return {
        success: false,
        error: 'Root payload must be a valid JSON object.',
      };
    }

    const rec = obj as Record<string, unknown>;

    if (rec.version !== 1) {
      return {
        success: false,
        error: 'Unsupported or missing schema version (must be 1).',
      };
    }

    if (
      !rec.notice ||
      typeof rec.notice !== 'string' ||
      !rec.notice.includes('FICTIONAL DEMO DATA')
    ) {
      return {
        success: false,
        error: 'Missing required notice banner "FICTIONAL DEMO DATA".',
      };
    }

    if (!rec.config || typeof rec.config !== 'object') {
      return {success: false, error: 'Missing or invalid "config" object.'};
    }

    const cfg = rec.config as Record<string, unknown>;
    if (typeof cfg.businessName !== 'string' || !cfg.businessName.trim()) {
      return {
        success: false,
        error: 'Invalid config: "businessName" must be a non-empty string.',
      };
    }
    if (
      typeof cfg.customFieldLabel !== 'string' ||
      !cfg.customFieldLabel.trim()
    ) {
      return {
        success: false,
        error: 'Invalid config: "customFieldLabel" must be a non-empty string.',
      };
    }

    if (!Array.isArray(rec.contacts)) {
      return {
        success: false,
        error: 'Invalid payload: "contacts" must be an array.',
      };
    }

    if (!Array.isArray(rec.opportunities)) {
      return {
        success: false,
        error: 'Invalid payload: "opportunities" must be an array.',
      };
    }

    if (!Array.isArray(rec.followUps)) {
      return {
        success: false,
        error: 'Invalid payload: "followUps" must be an array.',
      };
    }

    for (const c of rec.contacts as Record<string, unknown>[]) {
      if (
        !c.id ||
        typeof c.id !== 'string' ||
        !c.name ||
        typeof c.name !== 'string'
      ) {
        return {
          success: false,
          error: 'Contact entry missing required id or name string.',
        };
      }
    }

    for (const o of rec.opportunities as Record<string, unknown>[]) {
      if (
        !o.id ||
        typeof o.id !== 'string' ||
        !o.stage ||
        typeof o.stage !== 'string'
      ) {
        return {
          success: false,
          error: 'Opportunity entry missing required id or stage string.',
        };
      }
      const validStages = ['lead', 'estimate', 'scheduled', 'complete'];
      if (!validStages.includes(o.stage as string)) {
        return {
          success: false,
          error: `Invalid opportunity stage "${o.stage}".`,
        };
      }
    }

    for (const f of rec.followUps as Record<string, unknown>[]) {
      if (!f.id || typeof f.id !== 'string' || typeof f.dueDate !== 'string') {
        return {
          success: false,
          error: 'FollowUp entry missing required id or dueDate.',
        };
      }
    }

    return {success: true, data: obj as CRMData};
  }
}
