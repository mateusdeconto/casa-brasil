// Pure production math: cycles accumulate up to a cap; offline time is capped. No penalties.
export interface ProducerDef {
  coins: number;
  periodSec: number;
}

export interface Producer {
  since: number;
}

export function readyCycles(def: ProducerDef, p: Producer, now: number, maxCycles: number): number {
  const elapsed = Math.max(0, now - p.since);
  return Math.min(maxCycles, Math.floor(elapsed / (def.periodSec * 1000)));
}

export function pendingCoins(def: ProducerDef, p: Producer, now: number, maxCycles: number): number {
  return readyCycles(def, p, now, maxCycles) * def.coins;
}

/** Collect ready coins; keeps the partial cycle in progress unless the cap was reached. */
export function collect(def: ProducerDef, p: Producer, now: number, maxCycles: number): number {
  const cycles = readyCycles(def, p, now, maxCycles);
  if (!cycles) return 0;
  const period = def.periodSec * 1000;
  p.since = cycles >= maxCycles ? now : p.since + cycles * period;
  return cycles * def.coins;
}

/**
 * Credit at most `capMs` of time spent away: production clocks are shifted forward
 * by the excess. Returns the excess that was not credited.
 */
export function applyOffline(producers: Producer[], savedAt: number, now: number, capMs: number): number {
  const away = now - savedAt;
  const excess = Math.max(0, away - capMs);
  if (excess) for (const p of producers) p.since = Math.max(p.since, Math.min(now, p.since + excess));
  return excess;
}
