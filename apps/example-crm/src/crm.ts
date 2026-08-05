import type {
  CRMData,
  Contact,
  Opportunity,
  FollowUp,
  PipelineStage,
} from './types';
import {getTodayString} from './storage';

export function getOverdueAndUpcomingFollowUps(data: CRMData) {
  const today = getTodayString();
  const overdue: FollowUp[] = [];
  const upcoming: FollowUp[] = [];

  for (const f of data.followUps) {
    if (f.completed) continue;
    if (f.dueDate < today) {
      overdue.push(f);
    } else {
      upcoming.push(f);
    }
  }

  overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {overdue, upcoming};
}

export function completeFollowUp(data: CRMData, followUpId: string): CRMData {
  const updatedFollowUps = data.followUps.map(f => {
    if (f.id === followUpId) {
      return {...f, completed: true, completedAt: getTodayString()};
    }
    return f;
  });

  return {...data, followUps: updatedFollowUps};
}

export function addFollowUp(
  data: CRMData,
  contactId: string,
  note: string,
  dueDate: string,
  opportunityId?: string,
): CRMData {
  const newFollowUp: FollowUp = {
    id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    contactId,
    note,
    dueDate,
    ...(opportunityId ? {opportunityId} : {}),
    completed: false,
  };

  return {
    ...data,
    followUps: [newFollowUp, ...data.followUps],
  };
}

export function addContact(
  data: CRMData,
  contact: {
    name: string;
    email: string;
    phone: string;
    customFieldValue: string;
  },
): CRMData {
  const newContact: Contact = {
    id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: contact.name.trim(),
    email: contact.email.trim(),
    phone: contact.phone.trim(),
    customFieldValue: contact.customFieldValue.trim(),
    isArchived: false,
    createdAt: getTodayString(),
  };

  return {
    ...data,
    contacts: [...data.contacts, newContact],
  };
}

export function updateContact(
  data: CRMData,
  contactId: string,
  updates: Partial<Omit<Contact, 'id' | 'createdAt'>>,
): CRMData {
  const updatedContacts = data.contacts.map(c => {
    if (c.id === contactId) {
      return {
        ...c,
        ...updates,
        name: updates.name ? updates.name.trim() : c.name,
        email: updates.email ? updates.email.trim() : c.email,
        phone: updates.phone ? updates.phone.trim() : c.phone,
        customFieldValue:
          updates.customFieldValue !== undefined
            ? updates.customFieldValue.trim()
            : c.customFieldValue,
      };
    }
    return c;
  });

  return {...data, contacts: updatedContacts};
}

export function archiveContact(data: CRMData, contactId: string): CRMData {
  const updatedContacts = data.contacts.map(c => {
    if (c.id === contactId) {
      return {...c, isArchived: true};
    }
    return c;
  });

  return {...data, contacts: updatedContacts};
}

export function unarchiveContact(data: CRMData, contactId: string): CRMData {
  const updatedContacts = data.contacts.map(c => {
    if (c.id === contactId) {
      return {...c, isArchived: false};
    }
    return c;
  });

  return {...data, contacts: updatedContacts};
}

export function addOpportunity(
  data: CRMData,
  opp: {contactId: string; title: string; value: number; stage: PipelineStage},
): CRMData {
  const woNum = `WO-${100 + data.opportunities.length + 1}`;
  const newOpp: Opportunity = {
    id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workOrderNumber: woNum,
    contactId: opp.contactId,
    title: opp.title.trim(),
    value: Number(opp.value) || 0,
    stage: opp.stage,
    createdAt: getTodayString(),
    updatedAt: getTodayString(),
  };

  return {
    ...data,
    opportunities: [...data.opportunities, newOpp],
  };
}

export function moveOpportunityStage(
  data: CRMData,
  oppId: string,
  newStage: PipelineStage,
): CRMData {
  const updatedOpps = data.opportunities.map(o => {
    if (o.id === oppId) {
      return {
        ...o,
        stage: newStage,
        updatedAt: getTodayString(),
      };
    }
    return o;
  });

  return {...data, opportunities: updatedOpps};
}

export function filterContacts(
  data: CRMData,
  query: string,
  showArchived = false,
): Contact[] {
  const q = query.toLowerCase().trim();
  return data.contacts.filter(c => {
    if (!showArchived && c.isArchived) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.customFieldValue.toLowerCase().includes(q)
    );
  });
}

export function getOpportunitiesByStage(data: CRMData) {
  const stages: Record<PipelineStage, Opportunity[]> = {
    lead: [],
    estimate: [],
    scheduled: [],
    complete: [],
  };

  for (const o of data.opportunities) {
    if (stages[o.stage]) {
      stages[o.stage].push(o);
    }
  }

  return stages;
}

export function updateConfig(
  data: CRMData,
  businessName: string,
  customFieldLabel: string,
): CRMData {
  return {
    ...data,
    config: {
      ...data.config,
      businessName: businessName.trim(),
      customFieldLabel: customFieldLabel.trim(),
      isFirstRunComplete: true,
    },
  };
}
