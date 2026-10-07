// Parent PIN: 4 digits, stored as a salted hash on this device only. Demo grade, not real security.
import { PIN_LENGTH } from '../config';
import { sha256Hex } from './hash';

const SALT = 'casa-brasil-pin-demo';

export const isValidPin = (pin: string): boolean => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

export const hashPin = (pin: string): string => sha256Hex(`${SALT}:${pin}`);

export const checkPin = (pin: string, stored: string | null): boolean => !!stored && isValidPin(pin) && hashPin(pin) === stored;
