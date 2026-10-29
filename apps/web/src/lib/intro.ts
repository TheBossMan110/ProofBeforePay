/** Coordinates the landing preloader with the hero: the hero's entrance waits until the curtain lifts. */
let done = false;
const listeners = new Set<() => void>();

export function markIntroDone(): void {
  if (done) return;
  done = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

export function isIntroDone(): boolean {
  return done;
}

/** Runs `listener` once the intro has finished (immediately if it already has). Returns an unsubscribe function. */
export function onIntroDone(listener: () => void): () => void {
  if (done) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
