import type {
  PersonAttributesSchema,
  PersonResourceSchema,
  SearchCandidateSchema,
} from '@/features/registration_process/hitobito-api/schemas';
import type { z } from 'zod';

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type PersonAttributes = z.infer<typeof PersonAttributesSchema>;
export type PersonResource = z.infer<typeof PersonResourceSchema>;
export type SearchCandidate = z.infer<typeof SearchCandidateSchema>;

export interface RoleAttributes {
  group_id: number | string;
  event_id?: number | string | null;
  type: string;
  label?: string | null;
  end_on?: string | null;
  [key: string]: unknown;
}

export interface RoleResource {
  id: string | number;
  type: string;
  attributes: RoleAttributes;
}

export interface HitobitoConfig {
  baseUrl: string;
  apiToken: string;
  browserCookie: string;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}
