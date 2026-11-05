/*
NXP signs the UID of every NTAG21x chip in the factory: ECDSA on secp128r1, over the 7 bytes
of the UID as they are, without hashing them first. The chip hands the 32-byte signature out
with READ_SIG, and anyone holding NXP's public key can check it. A chip whose UID was not made
by NXP has no such signature, so this tells a band we bought from a cheap copy. It does not
stop a copy of one particular band: the signature is readable, so a clone can carry it too.

Plain BigInt arithmetic, no crypto API: secp128r1 is too small for WebCrypto, and the same code
checks a band on the server and offline on a phone. Verification only handles public data, so
it need not run in constant time.
*/

/** secp128r1, from SEC 2. */
const P = 0xff_ff_ff_fd_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ffn;
const A = 0xff_ff_ff_fd_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_fcn;
const N = 0xff_ff_ff_fe_00_00_00_00_75_a3_0d_1b_90_38_a1_15n;
const G: Point = {
  x: 0x16_1f_f7_52_8b_89_9b_2d_0c_28_60_7c_a5_2c_5b_86n,
  y: 0xcf_5a_c8_39_5b_af_eb_13_c0_2d_a2_92_dd_ed_7a_83n,
};

/**
 * NXP's originality key for NTAG21x, uncompressed, as published in AN11350. It is a point of
 * secp128r1, which a mistyped key would not be, but it still has to be confirmed with the first
 * genuine wristband: every band read so far was a copy without a signature.
 */
export const NXP_NTAG21X_PUBLIC_KEY =
  '04494E1A386D3D3CFE3DC10E5DE68A499B1C202DB5B132393E89ED19FE5BE8BC61';

interface Point {
  x: bigint;
  y: bigint;
}

/** The point at infinity. */
type CurvePoint = Point | undefined;

const modulo = (value: bigint, modulus: bigint): bigint => ((value % modulus) + modulus) % modulus;

/** Modular inverse by the extended Euclidean algorithm. */
const invert = (value: bigint, modulus: bigint): bigint => {
  let [oldR, r] = [modulo(value, modulus), modulus];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  return modulo(oldS, modulus);
};

const add = (first: CurvePoint, second: CurvePoint): CurvePoint => {
  if (first === undefined) return second;
  if (second === undefined) return first;
  if (first.x === second.x && modulo(first.y + second.y, P) === 0n) return undefined;
  const slope =
    first.x === second.x && first.y === second.y
      ? modulo((3n * first.x * first.x + A) * invert(2n * first.y, P), P)
      : modulo((second.y - first.y) * invert(second.x - first.x, P), P);
  const x = modulo(slope * slope - first.x - second.x, P);
  return { x, y: modulo(slope * (first.x - x) - first.y, P) };
};

const multiply = (point: CurvePoint, scalar: bigint): CurvePoint => {
  let result: CurvePoint;
  let addend = point;
  for (let rest = scalar; rest > 0n; rest >>= 1n) {
    if ((rest & 1n) === 1n) result = add(result, addend);
    addend = add(addend, addend);
  }
  return result;
};

const isOnCurve = ({ x, y }: Point): boolean =>
  x < P && y < P && modulo(y * y - (x * x * x + A * x + B), P) === 0n;

const B = 0xe8_75_79_c1_10_79_f4_3d_d8_24_99_3c_2c_ee_5e_d3n;

const HEX = /^(?:[0-9A-F]{2})+$/i;

const toBigInt = (hex: string): bigint => (hex === '' ? 0n : BigInt(`0x${hex}`));

/** The public key from its uncompressed hex form, or undefined if it is no point of the curve. */
const parsePublicKey = (hex: string): CurvePoint => {
  if (hex.length !== 66 || !HEX.test(hex) || !hex.startsWith('04')) return undefined;
  const point = { x: toBigInt(hex.slice(2, 34)), y: toBigInt(hex.slice(34)) };
  return isOnCurve(point) ? point : undefined;
};

/**
 * Whether `signature` (64 hex characters, `r` then `s`) is the originality signature of the
 * chip with `uid` (14 hex characters). Anything malformed is simply not a valid signature.
 */
export const verifyNtagSignature = (
  uid: string,
  signature: string,
  publicKey: string = NXP_NTAG21X_PUBLIC_KEY,
): boolean => {
  if (uid.length !== 14 || !HEX.test(uid)) return false;
  if (signature.length !== 64 || !HEX.test(signature)) return false;
  const key = parsePublicKey(publicKey);
  if (key === undefined) return false;

  const r = toBigInt(signature.slice(0, 32));
  const s = toBigInt(signature.slice(32));
  if (r <= 0n || r >= N || s <= 0n || s >= N) return false;

  // the message is used as it is: 56 bits are shorter than the order, nothing is truncated
  const message = toBigInt(uid);
  const inverse = invert(s, N);
  const point = add(
    multiply(G, modulo(message * inverse, N)),
    multiply(key, modulo(r * inverse, N)),
  );
  return point !== undefined && modulo(point.x, N) === r;
};
