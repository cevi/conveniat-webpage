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

/**
 * How a person comes to the camp: as a participant, or to lead or help in any other role of
 * the registration, see `isParticipantRole`.
 */
export type HofRole = 'participant' | 'leader';

/** One registration of a Hof, with the band the person wears. */
export interface HofPerson {
  registrationId: string;
  fullName: string;
  nickname: string | null;
  /** the Abteilung whose Cevi.DB event the person registered through, null if it has no name */
  abteilung: string | null;
  role: HofRole;
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

/** A band handed out to nobody yet, in the list security and first aid keep on the phone. */
export interface SpareRosterBand {
  uid: string;
  hof: string;
}

export interface WristbandRoster {
  bands: RosterEntry[];
  /**
   * Programmed and active, handed out to nobody. Missing in a list a phone kept from before
   * spare bands were part of it.
   */
  spareBands?: SpareRosterBand[];
  /** Blocked bands, so a phone offline does not take one for a band it has not heard of. */
  revokedUids: string[];
}

/** What the user may do with the bands. */
export interface WristbandAccess {
  /** how many Höfe the user programs and hands out bands for, see `listWristbandHoefe` */
  hoefe: number;
  /** whether the user reads bands, for security and first aid */
  reader: boolean;
}

/** An AVP of a Hof, as the safety team reaches them from a band. */
export interface HofContact {
  userId: string;
  fullName: string;
  nickname: string | null;
}

/** The wearer on the page a tapped band opens, as everybody signed in sees them. */
export type WristbandWearerCard =
  /** unknown, blocked or not handed out yet: nobody to name */
  | { state: 'none' }
  /** the signature does not match the UID: a copy, which names nobody */
  | { state: 'not-genuine' }
  | { state: 'own' }
  | {
      state: 'worn';
      /** the Ceviname, or without one the first name; null if the registration has neither */
      name: string | null;
      /** whether the wearer has the app, so a chat can be started */
      canChat: boolean;
    };

/** What the page of a tapped band shows the user. The server decides what by role. */
export interface WristbandCard {
  /**
   * Whether NXP's signature was checked, so the band was really held to a phone. Without it a
   * UID could be guessed: no chat, and for security and first aid no Hof, Quartier or AVP.
   */
  verified: boolean;
  wearer: WristbandWearerCard;
  /** for security and first aid only */
  safety: {
    /** without Hof and Quartier while the band is not verified */
    identity: WristbandIdentity;
    /** the AVP of the band's Hof with the app; null for a band without a Hof or not verified */
    avps: HofContact[] | null;
  } | null;
}
