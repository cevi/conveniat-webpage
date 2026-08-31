import type { BillingAdminDocumentKey } from '@/features/billing/admin-documents';
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
  /** Set when an operator stopped the run early; the counters are then partial. */
  cancelled?: boolean;
  /** Admin documents an operator has to fix for this run to succeed. */
  relatedDocuments?: BillingAdminDocumentKey[];
  newCount: number;
  removedCount: number;
  reAddedCount: number;
  changedCount: number;
  unchangedCount: number;
  /** Already-billed participations the sync parked for an operator to judge. */
  needsReviewCount: number;
  syncDate: string;
  errors: string[];
}

/**
 * Summary returned after bill generation.
 */
export interface GenerationSummary {
  /**
   * Set when this execution did no work because another worker was already running the
   * same queued job. Its counters are meaningless and must not be shown as a result.
   */
  duplicate?: boolean;
  /** Set when an operator stopped the run early; the counters are then partial. */
  cancelled?: boolean;
  /** Admin documents an operator has to fix for this run to succeed. */
  relatedDocuments?: BillingAdminDocumentKey[];
  generatedCount: number;
  skippedCount: number;
  skippedAlreadyExistingCount: number;
  errors: string[];
}

/**
 * Summary returned after sending bills.
 */
export interface SendSummary {
  /**
   * Set when this execution did no work because another worker was already running the
   * same queued job. Its counters are meaningless and must not be shown as a result.
   */
  duplicate?: boolean;
  /** Set when an operator stopped the run early; the counters are then partial. */
  cancelled?: boolean;
  /** Admin documents an operator has to fix for this run to succeed. */
  relatedDocuments?: BillingAdminDocumentKey[];
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

/**
 * A subgroup event discovered on Cevi.DB and stored in the bill-settings event list.
 */
export interface PopulatedSubevent {
  eventId: string;
  eventName: string;
  groupId: string;
}

/**
 * Frames streamed (newline-delimited JSON) by
 * `POST /api/confidential/billing/populate-subevents`.
 *
 * The walk over all subgroups takes ~45s, so the handler reports progress as it goes
 * instead of leaving the admin UI with a spinner and no information. Once the last
 * `progress` frame has arrived the walk is done and the merged list is being written,
 * which is the phase the UI labels as "saving" until `done` arrives.
 */
export type PopulateSubeventsStreamMessage =
  | {
      type: 'progress';
      processedGroups: number;
      totalGroups: number;
      /** Events found since the previous frame — append, do not replace. */
      foundEvents: PopulatedSubevent[];
    }
  | {
      type: 'done';
      /** The subset of the discovered events that was not in the settings yet. */
      newEvents: PopulatedSubevent[];
      /**
       * The complete event list as it was just written to the settings, so the admin
       * form can adopt it without a page reload.
       */
      allEvents: PopulatedSubevent[];
    }
  | { type: 'error'; error: string };
