import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      uuid?: string | undefined;
      group_ids?: number[] | undefined;
      nickname?: string | null | undefined;
    } & DefaultSession['user'];
  }

  interface User {
    uuid?: string | undefined;
    group_ids?: number[] | undefined;
    nickname?: string | null | undefined;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    expires_at?: number | undefined;
    uuid?: string | undefined;
    group_ids?: number[] | undefined;
    nickname?: string | null | undefined;
    error?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
  }
}
