import {
  castVote,
  computeSummary,
  getVoterChoice,
  loadState,
  POLL_OPTIONS,
  POLL_QUESTION,
  subscribeToStateChanges,
} from './state';
import type {OptionId, PollState} from './types';

export function renderVoteView(container: HTMLElement): () => void {
  let currentState: PollState = loadState();

  container.innerHTML = `
    <div class="vote-page">
      <header class="vote-header">
        <div class="brand-badge">
          <span class="pulse-dot"></span>
          <span class="brand-name">ROOM PULSE</span>
          <span class="mode-tag">PHONE VOTE</span>
        </div>
        <h1 class="vote-question">${POLL_QUESTION}</h1>
        <p class="vote-subtitle">Tap an option below to submit your vote instantly.</p>
      </header>

      <main class="vote-options-grid" id="vote-options-container">
        <!-- Rendered dynamically -->
      </main>

      <div class="vote-status-banner" id="vote-status-banner">
        <!-- Status message rendered dynamically -->
      </div>

      <footer class="vote-footer">
        <div class="disclaimer-box">
          <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
          <span>Note: This local build does not synchronize separate devices; Firebase is the later shared-room upgrade.</span>
        </div>
        <div class="view-switch-bar">
          <a href="/display" id="nav-to-display-link" class="nav-btn-link">
            📺 Open Projector Display View (/display)
          </a>
        </div>
      </footer>
    </div>
  `;

  const optionsContainer = container.querySelector(
    '#vote-options-container',
  ) as HTMLElement;
  const statusBanner = container.querySelector(
    '#vote-status-banner',
  ) as HTMLElement;
  const navLink = container.querySelector(
    '#nav-to-display-link',
  ) as HTMLAnchorElement;

  if (navLink) {
    navLink.addEventListener('click', e => {
      e.preventDefault();
      window.history.pushState({}, '', '/display');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  function updateUI() {
    const voterChoice = getVoterChoice(currentState);
    const summary = computeSummary(currentState);

    optionsContainer.innerHTML = POLL_OPTIONS.map(option => {
      const isSelected = voterChoice === option.id;
      return `
        <button 
          type="button"
          class="vote-card ${isSelected ? 'selected' : ''}" 
          data-option-id="${option.id}"
          style="--accent-color: ${option.color};"
        >
          <div class="vote-card-header">
            <span class="vote-icon">${option.icon}</span>
            <span class="vote-label">${option.label}</span>
          </div>
          <p class="vote-desc">${option.description}</p>
          <div class="vote-card-footer">
            ${
              isSelected
                ? '<span class="selected-badge">✓ Your Selection</span>'
                : '<span class="action-prompt">Tap to Vote →</span>'
            }
          </div>
        </button>
      `;
    }).join('');

    // Attach click listeners to cards
    const cards = optionsContainer.querySelectorAll('.vote-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const optionId = card.getAttribute('data-option-id') as OptionId;
        if (optionId) {
          currentState = castVote(currentState, optionId);
          updateUI();
        }
      });
    });

    // Update status banner
    if (voterChoice) {
      const chosenOption = POLL_OPTIONS.find(o => o.id === voterChoice);
      statusBanner.innerHTML = `
        <div class="status-pill success">
          <span>Vote cast for <strong>${chosenOption?.label || voterChoice}</strong>. You can change your vote anytime.</span>
        </div>
      `;
    } else {
      statusBanner.innerHTML = `
        <div class="status-pill prompt">
          <span>No vote recorded for this profile yet. Total poll votes: <strong>${summary.totalVotes}</strong></span>
        </div>
      `;
    }
  }

  updateUI();

  // Subscribe to live state updates from other tabs / storage
  const unsubscribe = subscribeToStateChanges(newState => {
    currentState = newState;
    updateUI();
  });

  return unsubscribe;
}
