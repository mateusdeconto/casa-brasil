// Coins that fly from a point on screen to the HUD counter.
import { itemUrl } from './dom';

export function flyCoins(root: HTMLElement, from: { x: number; y: number }, to: DOMRect, amount: number): void {
  const box = root.getBoundingClientRect();
  const count = Math.min(8, Math.max(3, Math.round(amount / 10)));
  for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    img.src = itemUrl('coin');
    img.className = 'fly-coin';
    const sx = from.x - box.left + (Math.random() - 0.5) * 50;
    const sy = from.y - box.top + (Math.random() - 0.5) * 30;
    img.style.left = `${sx}px`;
    img.style.top = `${sy}px`;
    root.appendChild(img);
    const dx = to.left + to.width / 2 - box.left - sx;
    const dy = to.top + to.height / 2 - box.top - sy;
    const anim = img.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)' },
        { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3 - 60}px)) scale(1.1)`, offset: 0.35 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.8)` },
      ],
      { duration: 700 + i * 70, easing: 'ease-in', fill: 'forwards' },
    );
    anim.onfinish = () => img.remove();
  }
}
