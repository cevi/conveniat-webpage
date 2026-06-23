import type { z } from 'zod';

import type {
  EventParticipationResourceSchema,
  EventParticipationWithPersonSchema,
} from '@/features/registration_process/hitobito-api/event-participation-schemas';

export type EventParticipationResource = z.infer<typeof EventParticipationResourceSchema>;
export type EventParticipationWithPerson = z.infer<typeof EventParticipationWithPersonSchema>;

/**
 * Represents a participant synced from the Cevi.DB into our local billing database.
 */
export interface SyncedParticipant {
  participationUuid: string;
  userId: string;
  eventId: string;
  groupId: string;
  eventName: string;
  firstName: string;
  lastName: string;
  nickname: string;
  fullName: string;
  roleType: string;
  enrollmentDate: string;
  street?: string | null;
  zip?: string | null;
  zipCode?: string | null;
  town?: string | null;
  email?: string | null;
  birthday?: string | null;
  gender?: string | null;
  active?: boolean;
}

/**
 * Summary returned after a sync operation.
 */
export interface SyncSummary {
  newCount: number;
  removedCount: number;
  reAddedCount: number;
  changedCount: number;
  unchangedCount: number;
  syncDate: string;
  errors: string[];
}

/**
 * Summary returned after bill generation.
 */
export interface GenerationSummary {
  generatedCount: number;
  skippedCount: number;
  skippedAlreadyExistingCount: number;
  errors: string[];
}

/**
 * Summary returned after sending bills.
 */
export interface SendSummary {
  sentCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Role-based pricing configuration (stored in bill-settings global).
 */
export interface RolePricing {
  roleTypePattern: string;
  label: string;
  amount: number;
}

/**
 * CSV row matching the provisorisches Format for the finance team.
 */
export interface FinanceCsvRow {
  Date: string;
  DocInvoice: string;
  ExternalReference: string;
  AccountDebit: string;
  AccountCredit: string;
  Amount: number;
  VatCode: string;
  DateExpiration: string;
  Description: string;
}

/**
 * Task slug enum representing billing background operations.
 */
export enum BillingTaskSlug {
  SyncParticipants = 'syncParticipants',
  GenerateBills = 'generateBills',
  SendBills = 'sendBills',
}

/**
 * Status enum representing the status of background job runs.
 */
export enum BillingJobStatus {
  Pending = 'pending',
  Failed = 'failed',
  Success = 'success',
}
