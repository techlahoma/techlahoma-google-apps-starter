import {
  generatePhraseNumeronym,
  getNumeronymBreakdown,
  type NumeronymBreakdown,
} from './app';
import './style.css';

// DOM Elements
const inputText = document.querySelector<HTMLTextAreaElement>('#input-text');
const minLengthSelect =
  document.querySelector<HTMLSelectElement>('#min-length-select');
const numeronymOutput =
  document.querySelector<HTMLDivElement>('#numeronym-output');
const copyBtn = document.querySelector<HTMLButtonElement>('#copy-btn');
const copyToast = document.querySelector<HTMLDivElement>('#copy-toast');
const statsBadge = document.querySelector<HTMLDivElement>('#stats-badge');
const breakdownContainer = document.querySelector<HTMLDivElement>(
  '#breakdown-container',
);
const breakdownTag = document.querySelector<HTMLSpanElement>('#breakdown-tag');
const historyList = document.querySelector<HTMLDivElement>('#history-list');
const clearHistoryBtn =
  document.querySelector<HTMLButtonElement>('#clear-history-btn');
const presetChips = document.querySelector<HTMLDivElement>('#preset-chips');

interface HistoryItem {
  input: string;
  output: string;
  timestamp: string;
}

let history: HistoryItem[] = [];

// Initialize & Bind listeners
function init() {
  if (
    !inputText ||
    !minLengthSelect ||
    !numeronymOutput ||
    !breakdownContainer
  ) {
    throw new Error('Required DOM elements not found');
  }

  inputText.addEventListener('input', updateNumeronym);
  minLengthSelect.addEventListener('change', updateNumeronym);

  presetChips?.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const preset = target.getAttribute('data-preset');
    if (preset && inputText) {
      inputText.value = preset;
      updateNumeronym();
    }
  });

  copyBtn?.addEventListener('click', copyToClipboard);
  clearHistoryBtn?.addEventListener('click', clearHistory);

  // Initial calculation
  updateNumeronym();
}

function getMinLength(): number {
  return parseInt(minLengthSelect?.value || '3', 10);
}

function updateNumeronym() {
  if (!inputText || !numeronymOutput || !breakdownContainer || !statsBadge)
    return;

  const rawText = inputText.value;
  const minLength = getMinLength();

  if (!rawText.trim()) {
    numeronymOutput.textContent = '...';
    statsBadge.textContent = '0 words';
    renderEmptyBreakdown();
    return;
  }

  const result = generatePhraseNumeronym(rawText, minLength);
  numeronymOutput.textContent = result;

  // Stats
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  statsBadge.textContent = `${words.length} word${words.length === 1 ? '' : 's'}`;

  // Breakdown
  renderBreakdown(words, minLength);

  // Add to history
  addToHistory(rawText.trim(), result);
}

function renderEmptyBreakdown() {
  if (!breakdownContainer || !breakdownTag) return;
  breakdownTag.textContent = 'Analysis';
  breakdownContainer.innerHTML = `
    <p class="empty-state">Type a word above to inspect its numeronym structure.</p>
  `;
}

function renderBreakdown(words: string[], minLength: number) {
  if (!breakdownContainer || !breakdownTag) return;

  if (words.length === 1 && words[0]) {
    breakdownTag.textContent = 'Single Word Anatomy';
    const singleWord = words[0];
    const breakdown: NumeronymBreakdown = getNumeronymBreakdown(
      singleWord,
      minLength,
    );

    if (!breakdown.isEligible) {
      breakdownContainer.innerHTML = `
        <div class="breakdown-box">
          <p class="breakdown-word-title">Word: <span class="highlight">${breakdown.original}</span></p>
          <div class="breakdown-explanation">
            This word has length <strong>${breakdown.original.length}</strong>, which is less than the minimum length threshold of <strong>${minLength}</strong>. It remains unchanged.
          </div>
        </div>
      `;
      return;
    }

    breakdownContainer.innerHTML = `
      <div class="breakdown-box">
        <p class="breakdown-word-title">Analyzing: <span class="highlight">${breakdown.original}</span></p>
        <div class="anatomy-flex">
          <div class="part-badge part-first">
            <span class="char">${breakdown.firstChar}</span>
            <span class="label">First Letter</span>
          </div>
          <span class="anatomy-operator">+</span>
          <div class="part-badge part-middle">
            <span class="char">${breakdown.middleCount}</span>
            <span class="label">${breakdown.middleCount} Middle Letters</span>
          </div>
          <span class="anatomy-operator">+</span>
          <div class="part-badge part-last">
            <span class="char">${breakdown.lastChar}</span>
            <span class="label">Last Letter</span>
          </div>
          <span class="anatomy-equals">=</span>
          <div class="part-badge part-result">
            <span class="char">${breakdown.numeronym}</span>
            <span class="label">Numeronym</span>
          </div>
        </div>
        <div class="breakdown-explanation">
          Word starts with <strong>'${breakdown.firstChar}'</strong>, ends with <strong>'${breakdown.lastChar}'</strong>, and contains <span class="count-num">${breakdown.middleCount}</span> letters in between: <code>"${breakdown.middleText}"</code>.
        </div>
      </div>
    `;
  } else {
    breakdownTag.textContent = `Phrase Breakdown (${words.length} Words)`;
    const itemsHtml = words
      .map(w => {
        const b = getNumeronymBreakdown(w, minLength);
        if (!b.isEligible) {
          return `<div class="history-item"><span class="history-word">${w}</span> <span class="history-numeronym" style="color:#64748b;">(unchanged)</span></div>`;
        }
        return `
        <div class="history-item">
          <span class="history-word">${b.original} (${b.firstChar} + <span style="color:#f59e0b;">${b.middleCount}</span> + ${b.lastChar})</span>
          <span class="history-numeronym">${b.numeronym}</span>
        </div>
      `;
      })
      .join('');

    breakdownContainer.innerHTML = `
      <div class="history-list">
        ${itemsHtml}
      </div>
    `;
  }
}

function addToHistory(input: string, output: string) {
  if (!input || input === output) return;
  const firstItem = history[0];
  if (firstItem && firstItem.input === input) return;

  history.unshift({
    input,
    output,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });

  if (history.length > 5) history.pop();
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No recent history yet.</p>';
    return;
  }

  historyList.innerHTML = history
    .map(
      item => `
    <div class="history-item">
      <span class="history-word">${escapeHtml(item.input)}</span>
      <span class="history-numeronym">${escapeHtml(item.output)}</span>
    </div>
  `,
    )
    .join('');
}

function clearHistory() {
  history = [];
  renderHistory();
}

async function copyToClipboard() {
  if (!numeronymOutput || !copyToast) return;
  const text = numeronymOutput.textContent || '';
  if (!text || text === '...') return;

  try {
    await navigator.clipboard.writeText(text);
    copyToast.classList.add('show');
    setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, m => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return map[m] || m;
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') {
  init();
}
