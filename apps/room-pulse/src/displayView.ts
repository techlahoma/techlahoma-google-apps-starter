import {renderQRCodeToCanvas} from './qr';
import {
  addSyntheticVotes,
  computeSummary,
  loadState,
  POLL_OPTIONS,
  POLL_QUESTION,
  resetVotes,
  subscribeToStateChanges,
} from './state';
import type {PollState} from './types';

export function renderDisplayView(container: HTMLElement): () => void {
  let currentState: PollState = loadState();

  const origin = window.location.origin;
  const voteUrl = `${origin}/vote`;

  container.innerHTML = `
    <div class="display-page">
      <header class="display-header">
        <div class="display-top-bar">
          <div class="display-brand">
            <span class="live-dot animate-pulse"></span>
            <span class="display-title-tag">ROOM PULSE</span>
            <span class="projector-tag">PROJECTOR DISPLAY</span>
          </div>
          <div class="vote-count-pill" id="total-vote-pill">
            <span class="vote-count-label">TOTAL VOTES</span>
            <span class="vote-count-number" id="total-votes-count">0</span>
          </div>
        </div>

        <h1 class="display-question">${POLL_QUESTION}</h1>

        <div class="leader-banner-container" id="leader-banner-container">
          <!-- Leader or tie state rendered dynamically -->
        </div>
      </header>

      <main class="display-content-grid">
        <div class="tally-bars-container" id="tally-bars-container">
          <!-- Rendered dynamically -->
        </div>

        <aside class="sidebar-panel">
          <div class="qr-card">
            <div class="qr-header">
              <span class="qr-badge">LOCAL DEMO URL</span>
              <p class="qr-hint">Scan with phone camera to vote</p>
            </div>
            <div class="qr-canvas-wrapper">
              <canvas id="qr-canvas"></canvas>
            </div>
            <div class="url-display-box">
              <code id="vote-url-text">${voteUrl}</code>
            </div>
          </div>

          <div class="facilitator-dock">
            <div class="facilitator-title">
              <span>⚙️ FACILITATOR CONTROLS</span>
            </div>
            <div class="facilitator-actions">
              <button type="button" class="btn-demo-votes" id="btn-synthetic-votes">
                ⚡ SYNTHETIC DEMO VOTES (+10)
              </button>
              <button type="button" class="btn-reset-votes" id="btn-reset-votes">
                🗑️ RESET ALL VOTES
              </button>
            </div>
            <div class="votes-meta-info" id="votes-meta-info">
              <!-- Synthetic vs Real breakdown -->
            </div>
          </div>
        </aside>
      </main>

      <footer class="display-footer">
        <div class="disclaimer-note">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
          <span>Note: This local build does not synchronize separate devices; Firebase is the later shared-room upgrade.</span>
        </div>
        <div class="nav-switch-box">
          <a href="/vote" id="nav-to-vote-link" class="vote-link-btn">
            📱 Open Phone Vote View (/vote)
          </a>
        </div>
      </footer>
    </div>
  `;

  const canvas = container.querySelector('#qr-canvas') as HTMLCanvasElement;
  if (canvas) {
    void renderQRCodeToCanvas(canvas, voteUrl, {
      width: 170,
      darkColor: '#ffffff',
    });
  }

  const navLink = container.querySelector(
    '#nav-to-vote-link',
  ) as HTMLAnchorElement;
  if (navLink) {
    navLink.addEventListener('click', e => {
      e.preventDefault();
      window.history.pushState({}, '', '/vote');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  const btnSynthetic = container.querySelector(
    '#btn-synthetic-votes',
  ) as HTMLButtonElement;
  if (btnSynthetic) {
    btnSynthetic.addEventListener('click', () => {
      currentState = addSyntheticVotes(currentState);
      updateUI();
    });
  }

  const btnReset = container.querySelector(
    '#btn-reset-votes',
  ) as HTMLButtonElement;
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (window.confirm('Reset all real and synthetic demo votes?')) {
        currentState = resetVotes();
        updateUI();
      }
    });
  }

  const totalVotesCountEl = container.querySelector(
    '#total-votes-count',
  ) as HTMLElement;
  const leaderBannerContainer = container.querySelector(
    '#leader-banner-container',
  ) as HTMLElement;
  const tallyBarsContainer = container.querySelector(
    '#tally-bars-container',
  ) as HTMLElement;
  const votesMetaInfoEl = container.querySelector(
    '#votes-meta-info',
  ) as HTMLElement;

  function updateUI() {
    const summary = computeSummary(currentState);

    if (totalVotesCountEl) {
      totalVotesCountEl.textContent = String(summary.totalVotes);
    }

    // Leader banner / Celebration status
    if (!summary.hasVotes) {
      leaderBannerContainer.innerHTML = `
        <div class="status-banner empty">
          <span class="status-icon">⏳</span>
          <span class="status-text">WAITING FOR AUDIENCE VOTES</span>
        </div>
      `;
    } else if (summary.isTie) {
      const tiedLabels = summary.tiedOptionIds
        .map(id => POLL_OPTIONS.find(o => o.id === id)?.label)
        .filter(Boolean)
        .join(' & ');
      leaderBannerContainer.innerHTML = `
        <div class="status-banner tie">
          <span class="status-icon">⚖️</span>
          <span class="status-text">TIED FOR THE LEAD: <strong>${tiedLabels}</strong></span>
        </div>
      `;
    } else if (summary.leaderId && summary.leaderLabel) {
      const leaderOption = POLL_OPTIONS.find(o => o.id === summary.leaderId);
      leaderBannerContainer.innerHTML = `
        <div class="status-banner leader glow-celebration" style="--leader-color: ${leaderOption?.color || '#34A853'};">
          <span class="status-icon">${leaderOption?.icon || '🏆'}</span>
          <span class="status-text">CURRENT LEADER: <strong>${summary.leaderLabel.toUpperCase()}</strong></span>
          <span class="celebration-sparkle">✨</span>
        </div>
      `;
    }

    // Tally Bars
    tallyBarsContainer.innerHTML = summary.tally
      .map(tally => {
        return `
        <div class="display-bar-card ${tally.isLeader ? 'is-leader' : ''}">
          <div class="bar-card-header">
            <div class="bar-title-group">
              <span class="bar-icon">${tally.icon}</span>
              <span class="bar-label">${tally.label}</span>
              ${tally.isLeader ? '<span class="leader-tag">LEADER</span>' : ''}
            </div>
            <div class="bar-stats-group">
              <span class="bar-percentage">${tally.percentage}%</span>
              <span class="bar-count">(${tally.count} ${tally.count === 1 ? 'vote' : 'votes'})</span>
            </div>
          </div>
          <div class="bar-track">
            <div 
              class="bar-fill" 
              style="width: ${tally.percentage}%; background-color: ${tally.color};"
            ></div>
          </div>
        </div>
      `;
      })
      .join('');

    // Meta breakdown
    if (votesMetaInfoEl) {
      votesMetaInfoEl.innerHTML = `
        <span>SYNTHETIC DEMO VOTES: <strong>${summary.syntheticVotesCount}</strong></span>
        <span class="meta-sep">•</span>
        <span>USER VOTES: <strong>${summary.userVotesCount}</strong></span>
      `;
    }
  }

  updateUI();

  // Subscribe to live state updates
  const unsubscribe = subscribeToStateChanges(newState => {
    currentState = newState;
    updateUI();
  });

  return unsubscribe;
}
