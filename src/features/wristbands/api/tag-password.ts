import { createHmac } from 'node:crypto';

/** The NTAG21x write password (`PWD`, 4 bytes) and its acknowledge (`PACK`, 2 bytes), as hex. */
export interface TagCredentials {
  password: string;
  pack: string;
}

/**
 * The password that protects a band against being written over, derived from its UID:
 * `HMAC-SHA256(secret, uid)`, the first four bytes as `PWD`, the next two as `PACK`. Nothing is
 * stored per band, so programming one needs no write before the chip is done, and the server
 * can unlock any band again after the camp. The secret cannot change without reprogramming
 * every band.
 */
export const deriveTagCredentials = (uid: string, secret: string): TagCredentials => {
  const key = createHmac('sha256', secret).update(Buffer.from(uid, 'hex')).digest();
  return {
    password: key.subarray(0, 4).toString('hex').toUpperCase(),
    pack: key.subarray(4, 6).toString('hex').toUpperCase(),
  };
};
