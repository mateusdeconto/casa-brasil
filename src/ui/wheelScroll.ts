/**
 * Wheel and touchpad scrolling. Over a list or page the browser scrolls natively (smooth, and it keeps the
 * fractional deltas of precision touchpads). Only when the pointer is somewhere with nothing to scroll
 * (the dark margins around the phone-sized box on a desktop, the HUD, the nav) is the wheel forwarded to the open page.
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
  let carry = 0; // pixels below 1 that scrollBy would drop
  document.addEventListener(
    'wheel',
    (e) => {
      const target = e.target as HTMLElement;
      if (e.ctrlKey || target.tagName === 'CANVAS' || target.closest('textarea, select')) return;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // sideways: always native
      if (scrollable(target, false)) return; // something under the pointer scrolls: let the browser do it
      const page = openPage();
      if (!page) return;
      const total = carry + e.deltaY * (e.deltaMode === 1 ? LINE_PX : 1);
      const whole = Math.trunc(total);
      carry = total - whole;
      if (whole) page.scrollBy({ top: whole });
      e.preventDefault();
    },
    { passive: false },
  );
}
