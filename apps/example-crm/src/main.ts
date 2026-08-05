import './style.css';
import {StorageAdapter, NOTICE_HEADER, getTodayString} from './storage';
import {
  completeFollowUp,
  addFollowUp,
  addContact,
  updateContact,
  archiveContact,
  unarchiveContact,
  addOpportunity,
  moveOpportunityStage,
  filterContacts,
  getOverdueAndUpcomingFollowUps,
  getOpportunitiesByStage,
  updateConfig,
} from './crm';
import type {CRMData, PipelineStage, Contact, Opportunity} from './types';

type ActiveTab = 'today' | 'contacts' | 'pipeline' | 'settings';

class CRMApp {
  private storage: StorageAdapter;
  private data!: CRMData;
  private activeTab: ActiveTab = 'today';
  private searchQuery = '';
  private showArchivedContacts = false;
  private activeModal: string | null = null;
  private editingContactId: string | null = null;

  constructor() {
    this.storage = new StorageAdapter();
    this.init();
  }

  private init() {
    const result = this.storage.load();
    if (result.success) {
      this.data = result.data;
    } else {
      this.showToast(result.error, 'error');
      const resetRes = this.storage.reset();
      if (resetRes.success) {
        this.data = resetRes.data;
      }
    }
    this.render();
  }

  private saveData(data: CRMData, toastMsg?: string) {
    this.data = data;
    const res = this.storage.save(this.data);
    if (!res.success) {
      this.showToast(res.error, 'error');
    } else if (toastMsg) {
      this.showToast(toastMsg, 'success');
    }
    this.render();
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    const area =
      document.getElementById('toast-area') || this.createToastArea();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.role = 'alert';
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${this.escapeHTML(message)}</span>
    `;
    area.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  private createToastArea(): HTMLElement {
    const area = document.createElement('div');
    area.id = 'toast-area';
    area.className = 'toast-area';
    document.body.appendChild(area);
    return area;
  }

  private render() {
    const root = document.getElementById('app');
    if (!root) return;

    const {overdue, upcoming} = getOverdueAndUpcomingFollowUps(this.data);
    const activeContactsCount = filterContacts(this.data, '', false).length;

    root.innerHTML = `
      <div class="demo-banner" role="region" aria-label="Demo Notice">
        <span>🛠️ ${NOTICE_HEADER} — ${this.escapeHTML(this.data.config.businessName)}</span>
        <span class="demo-banner-badge">VERSION 1 JSON SCHEMA</span>
      </div>

      <header class="site-header">
        <div class="header-container">
          <div class="shop-branding">
            <div class="shop-icon" aria-hidden="true">🔧</div>
            <div class="shop-title">
              <h1>${this.escapeHTML(this.data.config.businessName)}</h1>
              <div class="shop-subtitle">Bike Repair Shop CRM • Local Storage Persistence</div>
            </div>
          </div>

          <nav class="nav-tabs" aria-label="Main Navigation">
            <button class="nav-btn ${this.activeTab === 'today' ? 'active' : ''}" id="tab-today-btn" data-tab="today">
              📅 Today ${overdue.length > 0 ? `<span class="badge-count" style="background:#DC2626;color:white;">${overdue.length}</span>` : ''}
            </button>
            <button class="nav-btn ${this.activeTab === 'contacts' ? 'active' : ''}" id="tab-contacts-btn" data-tab="contacts">
              👥 Contacts <span class="badge-count">${activeContactsCount}</span>
            </button>
            <button class="nav-btn ${this.activeTab === 'pipeline' ? 'active' : ''}" id="tab-pipeline-btn" data-tab="pipeline">
              📊 Pipeline <span class="badge-count">${this.data.opportunities.length}</span>
            </button>
            <button class="nav-btn ${this.activeTab === 'settings' ? 'active' : ''}" id="tab-settings-btn" data-tab="settings">
              ⚙️ Settings & Data
            </button>
          </nav>
        </div>
      </header>

      <div class="app-container">
        ${!this.data.config.isFirstRunComplete ? this.renderFirstRunSetup() : ''}

        ${this.activeTab === 'today' ? this.renderTodayView(overdue, upcoming) : ''}
        ${this.activeTab === 'contacts' ? this.renderContactsView() : ''}
        ${this.activeTab === 'pipeline' ? this.renderPipelineView() : ''}
        ${this.activeTab === 'settings' ? this.renderSettingsView() : ''}
      </div>

      ${this.renderModals()}
    `;

    this.bindEvents();
  }

  private renderFirstRunSetup(): string {
    return `
      <section class="setup-callout" role="alert">
        <div class="setup-info">
          <h2>⚡ Welcome! Complete First-Run Business Setup</h2>
          <p>Customize your fictional repair shop name and custom detail field (e.g., Bike Model / Frame).</p>
        </div>
        <button class="btn btn-primary" id="start-setup-btn">Configure Business Details</button>
      </section>
    `;
  }

  private renderTodayView(
    overdue: CRMData['followUps'],
    upcoming: CRMData['followUps'],
  ): string {
    const totalPendingOpps = this.data.opportunities.filter(
      o => o.stage !== 'complete',
    ).length;

    return `
      <div class="view-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon overdue">⚠️</div>
            <div>
              <div class="stat-value">${overdue.length}</div>
              <div class="stat-label">Overdue Follow-ups</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon upcoming">📅</div>
            <div>
              <div class="stat-value">${upcoming.length}</div>
              <div class="stat-label">Upcoming Follow-ups</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon total">🛠️</div>
            <div>
              <div class="stat-value">${totalPendingOpps}</div>
              <div class="stat-label">Active Work Orders</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">⚠️ Overdue Follow-ups (${overdue.length})</h2>
          </div>
          ${
            overdue.length === 0
              ? `<div class="empty-state">
                  <div class="empty-icon">🎉</div>
                  <p>No overdue follow-ups! Great job keeping up with repair jobs.</p>
                </div>`
              : overdue.map(f => this.renderFollowUpItem(f, true)).join('')
          }
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">📅 Upcoming Follow-ups (${upcoming.length})</h2>
            <button class="btn btn-secondary btn-sm" id="open-add-followup-btn">+ Add Follow-up</button>
          </div>
          ${
            upcoming.length === 0
              ? `<div class="empty-state">
                  <div class="empty-icon">🚲</div>
                  <p>No upcoming follow-ups scheduled.</p>
                </div>`
              : upcoming.map(f => this.renderFollowUpItem(f, false)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderFollowUpItem(
    f: CRMData['followUps'][0],
    isOverdue: boolean,
  ): string {
    const contact = this.data.contacts.find(c => c.id === f.contactId);
    const opp = f.opportunityId
      ? this.data.opportunities.find(o => o.id === f.opportunityId)
      : null;

    return `
      <div class="followup-item ${isOverdue ? 'overdue' : ''}">
        <div class="followup-content">
          <h4>${this.escapeHTML(f.note)}</h4>
          <div class="followup-meta">
            <span>👤 <strong>${contact ? this.escapeHTML(contact.name) : 'Unknown Contact'}</strong></span>
            ${opp ? `<span class="wo-tag">${opp.workOrderNumber}: ${this.escapeHTML(opp.title)}</span>` : ''}
            <span>📆 Due: <strong>${f.dueDate}</strong></span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm complete-followup-btn" data-id="${f.id}">
          ✓ Complete
        </button>
      </div>
    `;
  }

  private renderContactsView(): string {
    const filtered = filterContacts(
      this.data,
      this.searchQuery,
      this.showArchivedContacts,
    );

    return `
      <div class="view-section">
        <div class="card">
          <div class="contacts-controls">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="search"
                id="contact-search-input"
                class="search-input"
                placeholder="Search contacts by name, email, phone, or ${this.escapeHTML(this.data.config.customFieldLabel)}..."
                value="${this.escapeHTML(this.searchQuery)}"
              />
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
              <input type="checkbox" id="show-archived-toggle" ${this.showArchivedContacts ? 'checked' : ''} />
              Show Archived
            </label>
            <button class="btn btn-primary" id="open-add-contact-btn">+ Add Contact</button>
          </div>
        </div>

        <div class="contacts-grid">
          ${
            filtered.length === 0
              ? `<div class="empty-state" style="grid-column:1/-1;">
                  <div class="empty-icon">🔍</div>
                  <p>No contacts found matching "${this.escapeHTML(this.searchQuery)}".</p>
                </div>`
              : filtered.map(c => this.renderContactCard(c)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderContactCard(c: Contact): string {
    const opps = this.data.opportunities.filter(o => o.contactId === c.id);

    return `
      <div class="contact-card ${c.isArchived ? 'archived' : ''}">
        <div class="contact-header">
          <div>
            <div class="contact-name">${this.escapeHTML(c.name)} ${c.isArchived ? '<span class="wo-tag">ARCHIVED</span>' : ''}</div>
            <div class="custom-field-badge" style="margin-top:4px;">
              🏷️ ${this.escapeHTML(this.data.config.customFieldLabel)}: <strong>${this.escapeHTML(c.customFieldValue || 'N/A')}</strong>
            </div>
          </div>
        </div>

        <div class="contact-detail">📧 ${this.escapeHTML(c.email || 'No email')}</div>
        <div class="contact-detail">📞 ${this.escapeHTML(c.phone || 'No phone')}</div>
        <div class="contact-detail">🛠️ Work Orders: <strong>${opps.length} total</strong></div>

        <div style="display:flex;gap:8px;margin-top:auto;padding-top:8px;">
          <button class="btn btn-secondary btn-sm edit-contact-btn" data-id="${c.id}">✏️ Edit</button>
          ${
            c.isArchived
              ? `<button class="btn btn-secondary btn-sm unarchive-contact-btn" data-id="${c.id}">Unarchive</button>`
              : `<button class="btn btn-secondary btn-sm archive-contact-btn" data-id="${c.id}">Archive</button>`
          }
        </div>
      </div>
    `;
  }

  private renderPipelineView(): string {
    const stages = getOpportunitiesByStage(this.data);
    const stageInfo: Array<{id: PipelineStage; label: string; icon: string}> = [
      {id: 'lead', label: 'Lead', icon: '📥'},
      {id: 'estimate', label: 'Estimate', icon: '📝'},
      {id: 'scheduled', label: 'Scheduled', icon: '🔧'},
      {id: 'complete', label: 'Complete', icon: '✅'},
    ];

    return `
      <div class="view-section">
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 class="card-title">📊 Work Order Pipeline</h2>
            <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">
              Drag cards or use arrow controls to move opportunities between repair stages.
            </p>
          </div>
          <button class="btn btn-primary" id="open-add-opp-btn">+ New Opportunity</button>
        </div>

        <div class="pipeline-board">
          ${stageInfo.map(s => this.renderPipelineColumn(s.id, s.label, s.icon, stages[s.id])).join('')}
        </div>
      </div>
    `;
  }

  private renderPipelineColumn(
    stageId: PipelineStage,
    label: string,
    icon: string,
    opps: Opportunity[],
  ): string {
    const totalValue = opps.reduce((sum, o) => sum + o.value, 0);

    return `
      <div class="pipeline-col" data-stage="${stageId}">
        <div class="pipeline-col-header">
          <div class="pipeline-col-title">
            <span>${icon}</span>
            <span>${label}</span>
            <span class="wo-tag">${opps.length}</span>
          </div>
          <div class="pipeline-col-metrics">$${totalValue}</div>
        </div>

        ${
          opps.length === 0
            ? '<div class="empty-state" style="padding:20px 8px;font-size:13px;">No work orders</div>'
            : opps.map(o => this.renderOpportunityCard(o)).join('')
        }
      </div>
    `;
  }

  private renderOpportunityCard(o: Opportunity): string {
    const contact = this.data.contacts.find(c => c.id === o.contactId);
    const validStages: PipelineStage[] = [
      'lead',
      'estimate',
      'scheduled',
      'complete',
    ];
    const currentIndex = validStages.indexOf(o.stage);
    const prevStage = currentIndex > 0 ? validStages[currentIndex - 1] : null;
    const nextStage =
      currentIndex < validStages.length - 1
        ? validStages[currentIndex + 1]
        : null;

    return `
      <div class="opp-card" draggable="true" data-id="${o.id}">
        <div class="opp-card-header">
          <span class="wo-tag">${o.workOrderNumber}</span>
          <span class="stage-badge stage-${o.stage}">${o.stage}</span>
        </div>
        <div class="opp-title">${this.escapeHTML(o.title)}</div>
        <div style="font-size:13px;color:var(--text-muted);">
          👤 ${contact ? this.escapeHTML(contact.name) : 'Unknown Contact'}
        </div>
        <div class="opp-value">$${o.value}</div>

        <div class="opp-actions">
          ${
            prevStage
              ? `<button class="btn btn-secondary btn-sm move-stage-btn" data-id="${o.id}" data-stage="${prevStage}" title="Move back to ${prevStage}">← Prev</button>`
              : '<span></span>'
          }
          ${
            nextStage
              ? `<button class="btn btn-secondary btn-sm move-stage-btn" data-id="${o.id}" data-stage="${nextStage}" title="Move to ${nextStage}">Next →</button>`
              : '<span></span>'
          }
        </div>
      </div>
    `;
  }

  private renderSettingsView(): string {
    return `
      <div class="view-section">
        <div class="settings-grid">
          <div class="card">
            <h2 class="card-title">⚙️ Business Configuration</h2>
            <form id="config-form" style="margin-top:16px;">
              <div class="form-group">
                <label for="config-business-name">Fictional Business Name</label>
                <input
                  type="text"
                  id="config-business-name"
                  class="form-control"
                  value="${this.escapeHTML(this.data.config.businessName)}"
                  required
                />
              </div>

              <div class="form-group">
                <label for="config-custom-label">Custom Detail Field Label</label>
                <input
                  type="text"
                  id="config-custom-label"
                  class="form-control"
                  value="${this.escapeHTML(this.data.config.customFieldLabel)}"
                  required
                />
              </div>

              <button type="submit" class="btn btn-primary">Save Configuration</button>
            </form>
          </div>

          <div class="card">
            <h2 class="card-title">💾 Versioned Data Backup (JSON)</h2>
            <p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">
              Export your CRM state or import a versioned JSON file. Schema errors will be rejected safely without mutating existing records.
            </p>

            <div style="display:flex;gap:12px;margin-bottom:16px;">
              <button class="btn btn-primary" id="export-json-btn">📥 Export JSON Backup</button>
            </div>

            <div class="form-group">
              <label for="import-json-input">Import JSON Payload</label>
              <textarea
                id="import-json-input"
                class="form-control"
                rows="4"
                placeholder='Paste raw CRM JSON payload here (must contain "FICTIONAL DEMO DATA" notice)...'
              ></textarea>
            </div>

            <button class="btn btn-secondary" id="import-json-btn">📤 Verify & Import JSON</button>
          </div>

          <div class="card" style="border-color:var(--color-overdue-border);background:var(--color-overdue-bg);">
            <h2 class="card-title" style="color:var(--color-overdue-text);">🔄 Reset Fictional Demo Data</h2>
            <p style="font-size:13px;color:var(--color-overdue-text);margin:8px 0 16px;">
              Reset all contacts, opportunities, and follow-ups back to the 6 initial fictional records.
            </p>
            <button class="btn btn-danger" id="reset-demo-btn">Reset to Initial 6 Demo Records</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderModals(): string {
    if (!this.activeModal) return '';

    if (this.activeModal === 'setup' || this.activeModal === 'config') {
      return `
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>🔧 Configure Repair Shop</h2>
              <button class="modal-close" id="close-modal-btn">✕</button>
            </div>
            <form id="modal-config-form">
              <div class="form-group">
                <label for="modal-biz-name">Fictional Business Name</label>
                <input
                  type="text"
                  id="modal-biz-name"
                  class="form-control"
                  value="${this.escapeHTML(this.data.config.businessName)}"
                  required
                />
              </div>
              <div class="form-group">
                <label for="modal-custom-field">Custom Field Label (e.g., Bike Model / Frame)</label>
                <input
                  type="text"
                  id="modal-custom-field"
                  class="form-control"
                  value="${this.escapeHTML(this.data.config.customFieldLabel)}"
                  required
                />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
                <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save & Complete Setup</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    if (
      this.activeModal === 'add-contact' ||
      this.activeModal === 'edit-contact'
    ) {
      const isEdit = this.activeModal === 'edit-contact';
      const c = isEdit
        ? this.data.contacts.find(x => x.id === this.editingContactId)
        : null;

      return `
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>${isEdit ? '✏️ Edit Contact' : '👤 Add New Contact'}</h2>
              <button class="modal-close" id="close-modal-btn">✕</button>
            </div>
            <form id="contact-form">
              <div class="form-group">
                <label for="contact-name-input">Full Name *</label>
                <input
                  type="text"
                  id="contact-name-input"
                  class="form-control"
                  value="${this.escapeHTML(c?.name || '')}"
                  required
                />
              </div>
              <div class="form-group">
                <label for="contact-email-input">Email Address</label>
                <input
                  type="email"
                  id="contact-email-input"
                  class="form-control"
                  value="${this.escapeHTML(c?.email || '')}"
                />
              </div>
              <div class="form-group">
                <label for="contact-phone-input">Phone Number</label>
                <input
                  type="tel"
                  id="contact-phone-input"
                  class="form-control"
                  value="${this.escapeHTML(c?.phone || '')}"
                />
              </div>
              <div class="form-group">
                <label for="contact-custom-input">${this.escapeHTML(this.data.config.customFieldLabel)}</label>
                <input
                  type="text"
                  id="contact-custom-input"
                  class="form-control"
                  value="${this.escapeHTML(c?.customFieldValue || '')}"
                />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
                <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update Contact' : 'Save Contact'}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'add-opp') {
      const activeContacts = filterContacts(this.data, '', false);

      return `
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>🛠️ Create New Work Order / Opportunity</h2>
              <button class="modal-close" id="close-modal-btn">✕</button>
            </div>
            <form id="opp-form">
              <div class="form-group">
                <label for="opp-contact-select">Select Customer *</label>
                <select id="opp-contact-select" class="form-control" required>
                  ${activeContacts
                    .map(
                      c =>
                        `<option value="${c.id}">${this.escapeHTML(c.name)}</option>`,
                    )
                    .join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="opp-title-input">Repair Job Title *</label>
                <input
                  type="text"
                  id="opp-title-input"
                  class="form-control"
                  placeholder="e.g. Brake Adjustment & Tire Swap"
                  required
                />
              </div>
              <div class="form-group">
                <label for="opp-value-input">Estimated Value ($)</label>
                <input
                  type="number"
                  id="opp-value-input"
                  class="form-control"
                  value="125"
                  min="0"
                />
              </div>
              <div class="form-group">
                <label for="opp-stage-select">Initial Pipeline Stage</label>
                <select id="opp-stage-select" class="form-control">
                  <option value="lead">Lead</option>
                  <option value="estimate">Estimate</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
                <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Work Order</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'add-followup') {
      const activeContacts = filterContacts(this.data, '', false);

      return `
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>📅 Schedule Follow-up Action</h2>
              <button class="modal-close" id="close-modal-btn">✕</button>
            </div>
            <form id="followup-form">
              <div class="form-group">
                <label for="fu-contact-select">Select Customer *</label>
                <select id="fu-contact-select" class="form-control" required>
                  ${activeContacts
                    .map(
                      c =>
                        `<option value="${c.id}">${this.escapeHTML(c.name)}</option>`,
                    )
                    .join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="fu-note-input">Action Note *</label>
                <input
                  type="text"
                  id="fu-note-input"
                  class="form-control"
                  placeholder="e.g. Call customer to verify part delivery"
                  required
                />
              </div>
              <div class="form-group">
                <label for="fu-date-input">Due Date *</label>
                <input
                  type="date"
                  id="fu-date-input"
                  class="form-control"
                  value="${getTodayString()}"
                  required
                />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
                <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Schedule Follow-up</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    return '';
  }

  private bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.getAttribute('data-tab') as ActiveTab;
        if (tab) {
          this.activeTab = tab;
          this.render();
        }
      });
    });

    // First run setup button
    document
      .getElementById('start-setup-btn')
      ?.addEventListener('click', () => {
        this.activeModal = 'setup';
        this.render();
      });

    // Follow-up completion
    document.querySelectorAll('.complete-followup-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const updated = completeFollowUp(this.data, id);
          this.saveData(updated, 'Follow-up marked as completed!');
        }
      });
    });

    // Add follow-up modal open
    document
      .getElementById('open-add-followup-btn')
      ?.addEventListener('click', () => {
        this.activeModal = 'add-followup';
        this.render();
      });

    // Contacts search & toggle
    const searchInput = document.getElementById(
      'contact-search-input',
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        const filtered = filterContacts(
          this.data,
          this.searchQuery,
          this.showArchivedContacts,
        );
        const grid = document.querySelector('.contacts-grid');
        if (grid) {
          grid.innerHTML =
            filtered.length === 0
              ? `<div class="empty-state" style="grid-column:1/-1;">
                  <div class="empty-icon">🔍</div>
                  <p>No contacts found matching "${this.escapeHTML(this.searchQuery)}".</p>
                </div>`
              : filtered.map(c => this.renderContactCard(c)).join('');
          this.bindCardActionButtons();
        }
      });
    }

    const archivedToggle = document.getElementById(
      'show-archived-toggle',
    ) as HTMLInputElement;
    if (archivedToggle) {
      archivedToggle.addEventListener('change', e => {
        this.showArchivedContacts = (e.target as HTMLInputElement).checked;
        this.render();
      });
    }

    document
      .getElementById('open-add-contact-btn')
      ?.addEventListener('click', () => {
        this.activeModal = 'add-contact';
        this.editingContactId = null;
        this.render();
      });

    this.bindCardActionButtons();

    // Pipeline stage movement buttons & drag/drop
    document.querySelectorAll('.move-stage-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id');
        const stage = target.getAttribute('data-stage') as PipelineStage;
        if (id && stage) {
          const updated = moveOpportunityStage(this.data, id, stage);
          this.saveData(
            updated,
            `Opportunity moved to ${stage.toUpperCase()} stage!`,
          );
        }
      });
    });

    document
      .getElementById('open-add-opp-btn')
      ?.addEventListener('click', () => {
        this.activeModal = 'add-opp';
        this.render();
      });

    // HTML5 Drag and Drop for Pipeline cards
    document.querySelectorAll('.opp-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        const dt = (e as DragEvent).dataTransfer;
        const id = (card as HTMLElement).getAttribute('data-id');
        if (dt && id) {
          dt.setData('text/plain', id);
        }
      });
    });

    document.querySelectorAll('.pipeline-col').forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        (col as HTMLElement).style.background = '#E2E8F0';
      });

      col.addEventListener('dragleave', () => {
        (col as HTMLElement).style.background = 'var(--bg-surface-subtle)';
      });

      col.addEventListener('drop', e => {
        e.preventDefault();
        (col as HTMLElement).style.background = 'var(--bg-surface-subtle)';
        const dt = (e as DragEvent).dataTransfer;
        const oppId = dt?.getData('text/plain');
        const newStage = (col as HTMLElement).getAttribute(
          'data-stage',
        ) as PipelineStage;
        if (oppId && newStage) {
          const updated = moveOpportunityStage(this.data, oppId, newStage);
          this.saveData(
            updated,
            `Opportunity moved to ${newStage.toUpperCase()}!`,
          );
        }
      });
    });

    // Settings & JSON Backup handlers
    document.getElementById('config-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const bizName = (
        document.getElementById('config-business-name') as HTMLInputElement
      ).value;
      const customLabel = (
        document.getElementById('config-custom-label') as HTMLInputElement
      ).value;
      const updated = updateConfig(this.data, bizName, customLabel);
      this.saveData(updated, 'Business configuration saved!');
    });

    document
      .getElementById('export-json-btn')
      ?.addEventListener('click', () => {
        const jsonStr = this.storage.exportJSON(this.data);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `example-crm-backup-${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Versioned JSON exported successfully!', 'success');
      });

    document
      .getElementById('import-json-btn')
      ?.addEventListener('click', () => {
        const textarea = document.getElementById(
          'import-json-input',
        ) as HTMLTextAreaElement;
        const jsonStr = textarea.value;
        const res = this.storage.importJSON(jsonStr);
        if (res.success) {
          this.saveData(res.data, 'Versioned JSON imported successfully!');
        } else {
          this.showToast(res.error, 'error');
        }
      });

    document.getElementById('reset-demo-btn')?.addEventListener('click', () => {
      if (
        confirm(
          'Are you sure you want to reset to the 6 initial fictional demo records?',
        )
      ) {
        const fresh = this.storage.reset();
        if (fresh.success) {
          this.saveData(
            fresh.data,
            'Reset to 6 initial demo records complete.',
          );
        }
      }
    });

    // Modal submit handlers
    document
      .getElementById('close-modal-btn')
      ?.addEventListener('click', () => {
        this.activeModal = null;
        this.render();
      });
    document
      .getElementById('cancel-modal-btn')
      ?.addEventListener('click', () => {
        this.activeModal = null;
        this.render();
      });

    document
      .getElementById('modal-config-form')
      ?.addEventListener('submit', e => {
        e.preventDefault();
        const bizName = (
          document.getElementById('modal-biz-name') as HTMLInputElement
        ).value;
        const customField = (
          document.getElementById('modal-custom-field') as HTMLInputElement
        ).value;
        const updated = updateConfig(this.data, bizName, customField);
        this.activeModal = null;
        this.saveData(updated, 'Setup complete!');
      });

    document.getElementById('contact-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const name = (
        document.getElementById('contact-name-input') as HTMLInputElement
      ).value;
      const email = (
        document.getElementById('contact-email-input') as HTMLInputElement
      ).value;
      const phone = (
        document.getElementById('contact-phone-input') as HTMLInputElement
      ).value;
      const customFieldValue = (
        document.getElementById('contact-custom-input') as HTMLInputElement
      ).value;

      let updated: CRMData;
      if (this.activeModal === 'edit-contact' && this.editingContactId) {
        updated = updateContact(this.data, this.editingContactId, {
          name,
          email,
          phone,
          customFieldValue,
        });
      } else {
        updated = addContact(this.data, {name, email, phone, customFieldValue});
      }

      this.activeModal = null;
      this.saveData(updated, 'Contact saved successfully!');
    });

    document.getElementById('opp-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const contactId = (
        document.getElementById('opp-contact-select') as HTMLSelectElement
      ).value;
      const title = (
        document.getElementById('opp-title-input') as HTMLInputElement
      ).value;
      const value =
        Number(
          (document.getElementById('opp-value-input') as HTMLInputElement)
            .value,
        ) || 0;
      const stage = (
        document.getElementById('opp-stage-select') as HTMLSelectElement
      ).value as PipelineStage;

      const updated = addOpportunity(this.data, {
        contactId,
        title,
        value,
        stage,
      });
      this.activeModal = null;
      this.saveData(updated, 'New work order created!');
    });

    document.getElementById('followup-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const contactId = (
        document.getElementById('fu-contact-select') as HTMLSelectElement
      ).value;
      const note = (
        document.getElementById('fu-note-input') as HTMLInputElement
      ).value;
      const dueDate = (
        document.getElementById('fu-date-input') as HTMLInputElement
      ).value;

      const updated = addFollowUp(this.data, contactId, note, dueDate);
      this.activeModal = null;
      this.saveData(updated, 'Follow-up scheduled successfully!');
    });
  }

  private bindCardActionButtons() {
    document.querySelectorAll('.edit-contact-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          this.editingContactId = id;
          this.activeModal = 'edit-contact';
          this.render();
        }
      });
    });

    document.querySelectorAll('.archive-contact-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const updated = archiveContact(this.data, id);
          this.saveData(updated, 'Contact archived.');
        }
      });
    });

    document.querySelectorAll('.unarchive-contact-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const updated = unarchiveContact(this.data, id);
          this.saveData(updated, 'Contact unarchived.');
        }
      });
    });
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CRMApp();
});
