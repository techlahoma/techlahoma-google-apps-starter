import './style.css';

async function bootstrap() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const path = window.location.pathname;

  if (path.startsWith('/room/')) {
    const roomCode = path.replace('/room/', '').trim();
    const {PlayerViewController} = await import('./ui/player-view');
    const playerView = new PlayerViewController();
    await playerView.mount(appContainer, roomCode);
  } else {
    const {HostViewController} = await import('./ui/host-view');
    const hostView = new HostViewController();
    await hostView.mount(appContainer);
  }
}

bootstrap().catch(err => console.error('Bootstrap error:', err));
