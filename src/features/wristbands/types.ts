/*
What the wristband procedures answer, shared by the server and the app. The refusals of
programming are the reasons the native bridge takes in `abort(requestId, reason)`, so the app
passes them on unchanged.
*/

/** Why the server will not hand out the password of a band. */
export type ProgramRefusal = 'not-genuine' | 'revoked' | 'assigned-to-other';

export type ProgramWristbandResult =
  { ok: true; password: string; pack: string } | { ok: false; reason: ProgramRefusal };

export type RegisterWristbandResult = { ok: true } | { ok: false; reason: ProgramRefusal };

/** A band of a Hof, as the AVP sees it. */
export interface HofBand {
  uid: string;
  status: 'active' | 'revoked';
}

/** One registration of a Hof, with the band the person wears. */
export interface HofPerson {
  registrationId: string;
  fullName: string;
  nickname: string | null;
  band: HofBand | null;
}

export interface HofWristbandList {
  people: HofPerson[];
  /** Programmed and active, not handed out yet. */
  spareBands: HofBand[];
}

/** Whose a band is, as security and first aid see it. */
export type WristbandIdentity =
  | { state: 'not-genuine'; uid: string }
  | { state: 'unknown'; uid: string }
  | { state: 'revoked'; uid: string }
  | { state: 'unassigned'; uid: string; hof: string }
  | {
      state: 'assigned';
      uid: string;
      fullName: string;
      nickname: string | null;
      hof: string;
      quartier: string | null;
      /**
       * Whether NXP's signature was checked. A cold tap opens `/tag/{uid}` with the UID alone,
       * which a copy of the band would show as well.
       */
      verified: boolean;
    };

/** One worn band in the list security and first aid keep on the phone. */
export interface RosterEntry {
  uid: string;
  fullName: string;
  nickname: string | null;
  hof: string;
  quartier: string | null;
}

export interface WristbandRoster {
  bands: RosterEntry[];
  /** Blocked bands, so a phone offline does not take one for a band it has not heard of. */
  revokedUids: string[];
}
