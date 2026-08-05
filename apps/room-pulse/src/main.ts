import {renderDisplayView} from './displayView';
import './style.css';
import {renderVoteView} from './voteView';

function initApp() {
  const appRoot = document.querySelector<HTMLDivElement>('#app');
  if (!appRoot) return;

  let cleanupCurrentView: (() => void) | null = null;

  function route() {
    if (cleanupCurrentView) {
      cleanupCurrentView();
      cleanupCurrentView = null;
    }

    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const viewParam = search.get('view');

    const isDisplayView =
      path === '/display' ||
      path.startsWith('/display') ||
      viewParam === 'display' ||
      window.location.hash === '#display';

    if (isDisplayView) {
      document.title = 'Room Pulse — Projector Display';
      cleanupCurrentView = renderDisplayView(appRoot!);
    } else {
      document.title = "Room Pulse — Tonight's CRM Poll";
      cleanupCurrentView = renderVoteView(appRoot!);
    }
  }

  window.addEventListener('popstate', route);
  route();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
