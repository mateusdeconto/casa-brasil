// Last line of defence: an uncaught error shows a friendly card with "Recarregar", never a blank screen.
// Inline styles on purpose: this must work even if the stylesheet did not load.
const IGNORED = /ResizeObserver loop|Script error/i;

export function installErrorGuard(): void {
  let shown = false;
  const show = (err: unknown) => {
    const text = err instanceof Error ? err.message : String(err ?? '');
    console.error('[Casa Brasil]', err);
    if (shown || IGNORED.test(text)) return;
    shown = true;
    const box = document.createElement('div');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', 'Algo deu errado');
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1c1730ee;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Fredoka",sans-serif;';
    const card = document.createElement('div');
    card.style.cssText = 'max-width:340px;width:100%;background:#efdcae;color:#3a2414;border:4px solid #4a3322;border-radius:14px;padding:18px;text-align:center;font-size:18px;line-height:1.3;';
    card.innerHTML = '<b style="font-size:22px">Ops! Algo deu errado.</b><p style="margin:10px 0 14px">Não se preocupe: o que você já fez está guardado. Toque em Recarregar para continuar.</p>';
    const btn = (label: string, primary: boolean, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `display:block;width:100%;margin-top:8px;font:inherit;font-size:18px;padding:12px;border-radius:10px;border:3px solid #33231a;cursor:pointer;background:${primary ? '#e9a24e' : '#6a4a33'};color:${primary ? '#3a2414' : '#f1ddb0'};`;
      b.onclick = fn;
      return b;
    };
    card.append(btn('Recarregar', true, () => location.reload()), btn('Tentar continuar', false, () => ((shown = false), box.remove())));
    box.appendChild(card);
    document.body.appendChild(box);
  };
  window.addEventListener('error', (e) => show(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => show(e.reason));
}
