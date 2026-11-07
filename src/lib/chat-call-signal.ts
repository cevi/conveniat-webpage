import { z } from 'zod';

/**
 * One message of the call handshake between two devices. The server only checks who may send
 * it to whom and forwards it on the partner's personal realtime channel; nothing is stored.
 *
 * - `invite` rings every device of the partner, `accept` names the one that picked up.
 * - `decline`, `busy` and `hangup` end the call, from either side.
 * - `offer`, `answer` and `ice` carry the WebRTC session between the two chosen devices.
 */
export const callSignalKinds = [
  'invite',
  'accept',
  'decline',
  'busy',
  'hangup',
  'offer',
  'answer',
  'ice',
] as const;
export type CallSignalKind = (typeof callSignalKinds)[number];

/**
 * pg_notify refuses payloads above 8000 bytes, and the event around the signal needs some of
 * them. An audio-only offer without candidates is 2-4 kB; candidates trickle separately.
 */
const MAX_SDP_LENGTH = 6000;
const MAX_CANDIDATE_LENGTH = 1000;

export const callSignalInputSchema = z.object({
  chatId: z.uuid(),
  callId: z.uuid(),
  kind: z.enum(callSignalKinds),
  /** The sending device, random per page load, so a partner with two phones is told apart. */
  fromDevice: z.uuid(),
  /** The one device of the partner the signal is meant for; unset for an `invite`. */
  toDevice: z.uuid().optional(),
  sdp: z.string().max(MAX_SDP_LENGTH).optional(),
  candidate: z
    .object({
      candidate: z.string().max(MAX_CANDIDATE_LENGTH),
      sdpMid: z.string().max(64).nullable(),
      sdpMLineIndex: z.number().int().min(0).max(16).nullable(),
    })
    .optional(),
});

export type CallSignalInput = z.infer<typeof callSignalInputSchema>;

/** A signal as it arrives on the realtime stream: the input plus who sent it. */
export interface CallSignal extends CallSignalInput {
  fromUser: string;
  fromName: string;
}

/** The ICE servers a device may use for one call, with short-lived TURN credentials. */
export interface CallIceServers {
  iceServers: { urls: string[]; username?: string; credential?: string }[];
}
