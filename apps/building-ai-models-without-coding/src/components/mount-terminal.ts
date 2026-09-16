import {FitAddon} from '@xterm/addon-fit';
import {Terminal} from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {annotateTerminalLines} from './terminal-lines';

export interface MountedTerminal {
  setOutput(output: string): void;
  setStatus(message: string, outcome: 'success' | 'error' | 'idle'): void;
  dispose(): void;
}

const asTerminalText = (text: string) => text.replace(/\r?\n/g, '\r\n');

export function mountTerminalOutput(
  host: HTMLElement,
  title: string,
  ariaLabel = title,
): MountedTerminal {
  host.className = 'terminal-shell';
  host.setAttribute('aria-label', ariaLabel);
  const toolbar = document.createElement('div');
  toolbar.className = 'terminal-toolbar';
  const heading = document.createElement('span');
  heading.textContent = title;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'terminal-copy';
  copy.setAttribute('aria-label', `Copy ${title}`);
  copy.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 0 1 3.75 20.625V10.875c0-.621.504-1.125 1.125-1.125H7.5m8.25 7.5h3.375c.621 0 1.125-.504 1.125-1.125V6.108c0-.298-.119-.585-.33-.796l-4.232-4.232a1.125 1.125 0 0 0-.796-.33H9.375c-.621 0-1.125.504-1.125 1.125v14.25c0 .621.504 1.125 1.125 1.125h6.375Z"/></svg><span>Copy</span>';
  const viewport = document.createElement('div');
  viewport.className = 'terminal-viewport';
  const accessibleOutput = document.createElement('pre');
  accessibleOutput.className = 'sr-only';
  accessibleOutput.dataset.terminalPlain = '';
  toolbar.append(heading, copy);
  const statusLine = document.createElement('p');
  statusLine.className = 'terminal-status';
  statusLine.hidden = true;
  host.replaceChildren(toolbar, viewport, accessibleOutput, statusLine);

  const terminal = new Terminal({
    convertEol: true,
    cursorBlink: false,
    disableStdin: true,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.45,
    rows: 12,
    screenReaderMode: true,
    scrollback: 5000,
    theme: {
      background: '#0b1020',
      foreground: '#e2e8f0',
      cursor: '#93c5fd',
      selectionBackground: '#334155',
    },
  });
  const fit = new FitAddon();
  terminal.loadAddon(fit);
  terminal.open(viewport);
  viewport
    .querySelector('.xterm-helper-textarea')
    ?.setAttribute('aria-label', ariaLabel);

  let output = '';
  // Fit only within a bounded viewport. An auto-height host grows on every fit.
  const fitVisible = () => {
    if (viewport.clientWidth > 0 && viewport.clientHeight > 0) fit.fit();
  };
  let frame = requestAnimationFrame(fitVisible);
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fitVisible);
  });
  observer.observe(viewport);
  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(output).then(
      () => {
        copy.querySelector('span')!.textContent = 'Copied';
      },
      () => {
        copy.querySelector('span')!.textContent = 'Select text to copy';
      },
    );
  });

  return {
    setStatus(message, outcome) {
      statusLine.hidden = !message;
      statusLine.textContent = `${outcome === 'success' ? '✅ ' : outcome === 'error' ? '❌ ' : ''}${message}`;
    },
    setOutput(next) {
      output = next;
      accessibleOutput.textContent = next;
      terminal.reset();
      terminal.write(asTerminalText(annotateTerminalLines(next)));
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      terminal.dispose();
    },
  };
}
