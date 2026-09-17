/** Follow new chat output until the reader scrolls up to inspect an earlier turn. */
export function followChatOutput(container: HTMLElement): () => void {
  let thread: HTMLElement | null = null;
  let following = true;
  let frame = 0;
  const onScroll = () => {
    if (thread)
      following =
        thread.scrollHeight - thread.scrollTop - thread.clientHeight < 48;
  };
  const refresh = () => {
    const next = container.querySelector<HTMLElement>('.chat-thread');
    if (next !== thread) {
      thread?.removeEventListener('scroll', onScroll);
      thread = next;
      following = true;
      thread?.addEventListener('scroll', onScroll, {passive: true});
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (following && thread) thread.scrollTop = thread.scrollHeight;
    });
  };
  const onSubmit = () => {
    following = true;
    refresh();
  };
  const onAction = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('#tuning-run, #tuning-compare, #rust-run'))
      onSubmit();
  };
  const observer = new MutationObserver(refresh);
  observer.observe(container, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  container.addEventListener('submit', onSubmit, true);
  container.addEventListener('click', onAction, true);
  refresh();
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    thread?.removeEventListener('scroll', onScroll);
    container.removeEventListener('submit', onSubmit, true);
    container.removeEventListener('click', onAction, true);
  };
}
