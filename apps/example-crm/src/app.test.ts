import {describe, expect, test, beforeEach} from 'bun:test';
import {StorageAdapter, getDefaultDemoData, STORAGE_KEY} from './storage';
import {
  completeFollowUp,
  addContact,
  updateContact,
  archiveContact,
  moveOpportunityStage,
  filterContacts,
  getOverdueAndUpcomingFollowUps,
  updateConfig,
} from './crm';
import type {CRMData} from './types';

// Mock localStorage for Bun test environment
const mockStorage: Record<string, string> = {};

globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  },
  length: 0,
  key: () => null,
};

describe('Example CRM Core Logic & Storage', () => {
  let storage: StorageAdapter;
  let sampleData: CRMData;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageAdapter(STORAGE_KEY);
    sampleData = getDefaultDemoData();
  });

  test('Default demo data populates successfully with correct schema header', () => {
    const loadResult = storage.load();
    expect(loadResult.success).toBe(true);
    if (!loadResult.success) return;

    expect(loadResult.data.notice).toContain('FICTIONAL DEMO DATA');
    expect(loadResult.data.contacts.length).toBeLessThanOrEqual(6);
    expect(loadResult.data.contacts.length).toBeGreaterThan(0);
    expect(loadResult.data.contacts[0]!.name).toContain('Demo Contact');
  });

  test('Pipeline movement correctly updates opportunity stage and timestamp', () => {
    const oppId = sampleData.opportunities[0]!.id;
    const initialStage = sampleData.opportunities[0]!.stage;

    expect(initialStage).toBe('lead');
    const updated = moveOpportunityStage(sampleData, oppId, 'estimate');

    const movedOpp = updated.opportunities.find(o => o.id === oppId);
    expect(movedOpp?.stage).toBe('estimate');

    const movedAgain = moveOpportunityStage(updated, oppId, 'complete');
    expect(movedAgain.opportunities.find(o => o.id === oppId)?.stage).toBe(
      'complete',
    );
  });

  test('JSON round-trip export and import preserves data accurately', () => {
    storage.save(sampleData);
    const exportedJSON = storage.exportJSON(sampleData);

    expect(exportedJSON).toContain('"notice": "FICTIONAL DEMO DATA"');
    expect(exportedJSON).toContain('Spoke & Sprocket Repair Shop');

    localStorage.clear();
    const importResult = storage.importJSON(exportedJSON);

    expect(importResult.success).toBe(true);
    if (!importResult.success) return;

    expect(importResult.data.config.businessName).toBe(
      'Spoke & Sprocket Repair Shop',
    );
    expect(importResult.data.contacts.length).toEqual(
      sampleData.contacts.length,
    );
    expect(importResult.data.opportunities.length).toEqual(
      sampleData.opportunities.length,
    );
  });

  test('Invalid JSON imports are rejected and DO NOT replace existing storage data', () => {
    storage.save(sampleData);

    // Corrupted JSON string
    const corruptedJSON =
      '{ "version": 1, "notice": "FICTIONAL DEMO DATA", contacts: invalid }';
    const resultCorrupted = storage.importJSON(corruptedJSON);

    expect(resultCorrupted.success).toBe(false);
    if (!resultCorrupted.success) {
      expect(resultCorrupted.error).toContain('JSON Parse Error');
    }

    // Missing required fields
    const invalidSchemaJSON = JSON.stringify({
      version: 2, // Unsupported version
      notice: 'REAL DATA', // Missing FICTIONAL DEMO DATA
    });
    const resultInvalid = storage.importJSON(invalidSchemaJSON);

    expect(resultInvalid.success).toBe(false);
    if (!resultInvalid.success) {
      expect(resultInvalid.error).toContain(
        'Unsupported or missing schema version',
      );
    }

    // Verify existing storage data was preserved untouched
    const currentData = storage.load();
    expect(currentData.success).toBe(true);
    if (currentData.success) {
      expect(currentData.data.config.businessName).toBe(
        'Spoke & Sprocket Repair Shop',
      );
    }
  });

  test('Follow-up completion and overdue/upcoming sorting works properly', () => {
    const {overdue, upcoming} = getOverdueAndUpcomingFollowUps(sampleData);
    expect(overdue.length).toBeGreaterThan(0);
    expect(upcoming.length).toBeGreaterThan(0);

    const firstOverdueId = overdue[0]!.id;
    const updatedData = completeFollowUp(sampleData, firstOverdueId);

    const target = updatedData.followUps.find(f => f.id === firstOverdueId);
    expect(target?.completed).toBe(true);
    expect(target?.completedAt).toBeDefined();

    const newOverdue = getOverdueAndUpcomingFollowUps(updatedData).overdue;
    expect(newOverdue.some(f => f.id === firstOverdueId)).toBe(false);
  });

  test('Contacts CRUD operations, archiving, and search filtering work as expected', () => {
    // Add contact
    const withNewContact = addContact(sampleData, {
      name: 'Demo Contact 07 — New Rider',
      email: 'newrider@example.com',
      phone: '(555) 999-0000',
      customFieldValue: 'Trek Marlin 7',
    });
    expect(withNewContact.contacts.length).toBe(sampleData.contacts.length + 1);

    // Search contact
    const filtered = filterContacts(withNewContact, 'Marlin');
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.name).toBe('Demo Contact 07 — New Rider');

    // Update contact
    const addedId =
      withNewContact.contacts[withNewContact.contacts.length - 1]!.id;
    const updatedData = updateContact(withNewContact, addedId, {
      customFieldValue: 'Trek Marlin 8 Upgraded',
    });
    const updatedContact = updatedData.contacts.find(c => c.id === addedId);
    expect(updatedContact?.customFieldValue).toBe('Trek Marlin 8 Upgraded');

    // Archive contact
    const archivedData = archiveContact(updatedData, addedId);
    const activeContacts = filterContacts(archivedData, '', false);
    const allContactsIncludingArchived = filterContacts(archivedData, '', true);

    expect(activeContacts.some(c => c.id === addedId)).toBe(false);
    expect(allContactsIncludingArchived.some(c => c.id === addedId)).toBe(true);
  });

  test('First-run setup updates business configuration', () => {
    const updatedConfig = updateConfig(
      sampleData,
      'Velocity Bike Works',
      'Serial Number',
    );
    expect(updatedConfig.config.businessName).toBe('Velocity Bike Works');
    expect(updatedConfig.config.customFieldLabel).toBe('Serial Number');
    expect(updatedConfig.config.isFirstRunComplete).toBe(true);
  });
});
