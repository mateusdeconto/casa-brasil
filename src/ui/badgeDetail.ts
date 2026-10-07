// Detail card for a medal: how to earn it and whether it is already yours.
import { badgeById } from '../core/badges';
import { formatDate } from '../core/dates';
import { showCard } from './card';

export function showBadgeDetail(root: HTMLElement, id: string, earnedAt?: number): void {
  const b = badgeById(id);
  showCard(root, {
    title: b.name,
    image: b.sprite,
    text: `${b.how}<br>${earnedAt ? `Conquistada em ${formatDate(earnedAt)}!` : 'Ainda não conquistada.'}`,
    buttons: [{ label: 'Fechar', onClick: () => {} }],
  });
}
