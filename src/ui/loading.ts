// Controls the loading screen that index.html draws before any script runs.
const fill = () => document.getElementById('ld-fill');
const screen = () => document.getElementById('loading');

export const loading = {
  /** 0..1 */
  progress(p: number): void {
    const f = fill();
    if (f) f.style.width = `${Math.max(6, Math.round(p * 100))}%`;
  },
  done(): void {
    const s = screen();
    if (!s) return;
    this.progress(1);
    s.classList.add('done');
    setTimeout(() => s.remove(), 350);
  },
};
