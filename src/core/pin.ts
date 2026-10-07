// Parent PIN: 4 digits, stored as a salted hash on this device only. Demo grade, not real security.
import { PIN_LENGTH } from '../config';
import { sha256Hex } from './hash';

const SALT = 'casa-brasil-pin-demo';

export const isValidPin = (pin: string): boolean => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

export const hashPin = (pin: string): string => sha256Hex(`${SALT}:${pin}`);

export const checkPin = (pin: string, stored: string | null): boolean => !!stored && isValidPin(pin) && hashPin(pin) === stored;

const FREE_TRIES = 3;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 600_000;

/** Seconds the keypad stays locked (0 = open). */
export const lockSecondsLeft = (lockUntil: number, now: number): number => Math.max(0, Math.ceil((lockUntil - now) / 1000));

/** After every 3 wrong tries the keypad locks for 30 s, then 60 s, 120 s... up to 10 minutes. */
export function lockAfterFail(fails: number, now: number): number {
  if (fails % FREE_TRIES !== 0) return 0;
  const rounds = fails / FREE_TRIES - 1;
  return now + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** rounds);
}
