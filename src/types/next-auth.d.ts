import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      uuid?: string | undefined;
      cevi_db_uuid?: number | undefined;
      group_ids?: number[] | undefined;
      /** Unix seconds of the last time the groups were read from Cevi.DB. */
      groups_synced_at?: number | undefined;
      nickname?: string | null | undefined;
      firstName?: string | undefined;
      lastName?: string | undefined;
    } & DefaultSession['user'];
  }

  interface User {
    uuid?: string | undefined;
    cevi_db_uuid?: number | undefined;
    group_ids?: number[] | undefined;
    groups_synced_at?: number | undefined;
    nickname?: string | null | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    expires_at?: number | undefined;
    uuid?: string | undefined;
    cevi_db_uuid?: number | undefined;
    group_ids?: number[] | undefined;
    groups_synced_at?: number | undefined;
    nickname?: string | null | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
  }
}
