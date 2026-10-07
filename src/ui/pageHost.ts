// Full-height pages that sit between the HUD and the nav bar (Clube Família, Álbum, Passaporte...).
import { el } from './dom';

export interface PageHandle {
  el: HTMLElement;
  body: HTMLElement;
  /** called when the page is removed, to free object URLs and listeners */
  onClose?: () => void;
}

export interface PageOpts {
  title: string;
  /** shows a back arrow that runs this */
  back?: () => void;
  className?: string;
  /** hide the wood header (pages that draw their own) */
  bare?: boolean;
}

export function makePage(opts: PageOpts): PageHandle {
  const root = el('section', `page ${opts.className ?? ''}`);
  if (!opts.bare) {
    const head = el('header', 'page-head');
    if (opts.back) {
      const b = el('button', 'back', '←');
      b.setAttribute('aria-label', 'Voltar');
      b.onclick = opts.back;
      head.appendChild(b);
    }
    head.appendChild(el('h2', '', opts.title));
    root.appendChild(head);
  }
  const body = el('div', 'page-body');
  root.appendChild(body);
  return { el: root, body };
}

/** Keeps a stack of pages: `open` replaces everything, `push` stacks a sub-page, `pop` goes back. */
export class PageHost {
  private stack: PageHandle[] = [];

  constructor(private root: HTMLElement) {}

  get top(): PageHandle | undefined {
    return this.stack[this.stack.length - 1];
  }

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  open(page: PageHandle): void {
    this.closeAll();
    this.stack = [page];
    this.root.appendChild(page.el);
  }

  push(page: PageHandle): void {
    this.stack[this.stack.length - 1]?.el.classList.add('hidden');
    this.stack.push(page);
    this.root.appendChild(page.el);
  }

  pop(): void {
    const top = this.stack.pop();
    top?.onClose?.();
    top?.el.remove();
    this.stack[this.stack.length - 1]?.el.classList.remove('hidden');
  }

  closeAll(): void {
    while (this.stack.length) this.pop();
  }
}
