// Small synchronous SHA-256 (works on http too, where crypto.subtle does not exist).
// Used for the parent PIN and the event QR token. Constants are derived, not typed in.
const primes = (n: number): number[] => {
  const out: number[] = [];
  for (let c = 2; out.length < n; c++) if (out.every((p) => c % p)) out.push(c);
  return out;
};
const frac32 = (x: number) => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0;
const P = primes(64);
const K = P.map((p) => frac32(Math.cbrt(p)));
const H0 = P.slice(0, 8).map((p) => frac32(Math.sqrt(p)));
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256Hex(text: string): string {
  const data = new TextEncoder().encode(text);
  const padded = new Uint8Array((((data.length + 9 + 63) >> 6) << 6));
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0);
  const h = [...H0];
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [hh, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => (h[i] = (h[i] + v) >>> 0));
  }
  return h.map((v) => v.toString(16).padStart(8, '0')).join('');
}
