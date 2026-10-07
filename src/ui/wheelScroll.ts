/**
 * Makes mouse wheels and touchpads scroll the DOM pages reliably. The nearest scrollable ancestor
 * of the pointer gets the delta; if the pointer is elsewhere (the dark margins around the phone-sized
 * box on a desktop, the HUD, the nav), the open page is scrolled instead.
 */
const LINE_PX = 16;
const PAGE_SCROLLERS = '#ui .page-body, #ui .flow-content, #ui .shop-list, #ui .picker .grid, #ui .phone-screen';

function scrollable(el: Element | null, horizontal: boolean): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    const mode = horizontal ? s.overflowX : s.overflowY;
    if (mode !== 'auto' && mode !== 'scroll') continue;
    if (horizontal ? n.scrollWidth > n.clientWidth : n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

/** the topmost open page that can scroll vertically */
function openPage(): HTMLElement | null {
  const open = [...document.querySelectorAll<HTMLElement>(PAGE_SCROLLERS)].filter((e) => e.offsetParent && e.scrollHeight > e.clientHeight);
  return open[open.length - 1] ?? null;
}

export function enableWheelScroll(): void {
  document.addEventListener(
    'wheel',
    (e) => {
      const target = e.target as HTMLElement;
      if (e.ctrlKey || target.tagName === 'CANVAS' || target.closest('textarea, select')) return;
      const k = e.deltaMode === 1 ? LINE_PX : 1;
      const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const box = scrollable(target, !vertical) ?? (vertical ? openPage() : null);
      if (!box) return;
      if (vertical) box.scrollTop += e.deltaY * k;
      else box.scrollLeft += e.deltaX * k;
      e.preventDefault();
    },
    { passive: false },
  );
}
