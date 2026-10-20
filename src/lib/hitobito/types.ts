import type { PersonAttributesSchema, PersonResourceSchema } from '@/lib/hitobito/schemas';
import type { z } from 'zod';

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type PersonAttributes = z.infer<typeof PersonAttributesSchema>;
export type PersonResource = z.infer<typeof PersonResourceSchema>;

export interface HitobitoConfig {
  baseUrl: string;
  apiToken: string;
  browserCookie: string;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}
