/**
 * Makes mouse wheels and touchpads scroll the DOM pages reliably (Windows precision touchpads
 * can ignore native scrolling inside a game shell). The nearest scrollable ancestor gets the delta.
 */
const LINE_PX = 16;

function scrollable(el: Element | null, horizontal: boolean): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    const mode = horizontal ? s.overflowX : s.overflowY;
    if (mode !== 'auto' && mode !== 'scroll') continue;
    if (horizontal ? n.scrollWidth > n.clientWidth : n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

export function enableWheelScroll(root: HTMLElement): void {
  root.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || (e.target as HTMLElement).tagName === 'CANVAS') return;
      const k = e.deltaMode === 1 ? LINE_PX : 1;
      const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const box = scrollable(e.target as Element, !vertical);
      if (!box) return;
      if (vertical) box.scrollTop += e.deltaY * k;
      else box.scrollLeft += e.deltaX * k;
      e.preventDefault();
    },
    { passive: false },
  );
}
