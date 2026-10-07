// Short WebAudio sounds and haptics. Sound starts only after the first touch and follows the setting.
import type { Emitter, GameEvents } from '../core/events';
import type { Store } from '../core/state';

type SoundName = 'collect' | 'buy' | 'stamp' | 'button';

// [frequency Hz, start s, duration s, wave, volume]
const NOTES: Record<SoundName, [number, number, number, OscillatorType, number][]> = {
  collect: [[660, 0, 0.09, 'square', 0.07], [880, 0.08, 0.09, 'square', 0.07], [1320, 0.16, 0.16, 'square', 0.06]],
  buy: [[523, 0, 0.07, 'triangle', 0.1], [784, 0.07, 0.2, 'triangle', 0.1]],
  stamp: [[110, 0, 0.14, 'sawtooth', 0.12], [70, 0.02, 0.2, 'sine', 0.2], [900, 0.12, 0.05, 'square', 0.04]],
  button: [[740, 0, 0.035, 'square', 0.04]],
};

export interface Feedback {
  play(name: SoundName): void;
}

export function createFeedback(bus: Emitter<GameEvents>, store: Store): Feedback {
  let ctx: AudioContext | null = null;
  const unlock = () => {
    if (ctx) return ctx.state === 'suspended' ? void ctx.resume() : undefined;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    } catch {
      ctx = null; // no audio on this device: the game stays silent
    }
  };
  // browsers only allow audio after a touch or click
  window.addEventListener('pointerdown', unlock, { capture: true });

  const play = (name: SoundName) => {
    if (!ctx || !store.settings.sound) return;
    const t0 = ctx.currentTime;
    for (const [freq, start, dur, wave, vol] of NOTES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  };

  let coins = store.data.coins;
  bus.on('coins', (n) => {
    if (n < coins) play('buy');
    coins = n;
  });
  bus.on('profileChanged', () => (coins = store.data.coins));
  bus.on('collected', () => (play('collect'), navigator.vibrate?.(25)));
  bus.on('visitCompleted', () => (play('stamp'), navigator.vibrate?.(60)));
  document.addEventListener('click', (e) => (e.target as HTMLElement).closest?.('#ui button, #ui a.btn') && play('button'), true);
  return { play };
}
