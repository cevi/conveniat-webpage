import { AlertTriangle, Calendar, Circle, Clock, Mail, User, Users, X } from 'lucide-react';
import type React from 'react';

// --- Types ---
export interface RegistrationJob {
  id: string;
  createdAt: string | Date;
  completedAt?: string | Date;
  processing?: boolean;
  hasError?: boolean;
  taskStatus?: Record<string, { status: string; completedAt?: string | Date }>;
  log?: {
    taskSlug: string;
    state?: string;
    executedAt?: string | Date;
    completedAt?: string | Date;
    error?: unknown;
    output?: unknown;
    input?: unknown;
    id?: string;
  }[];
  input?: unknown;
  totalTried?: number;
  blockedJobId?: string | number;
  blockedReason?: string;
}

export type JobStatusFilter =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'awaiting_approval';

// --- Constants ---
export const STATUS_CONFIG: Record<
  JobStatusFilter,
  { label: string; icon: React.ElementType; color: string }
> = {
  queued: { label: 'Queued', icon: Clock, color: 'text-zinc-400 dark:text-zinc-500' },
  processing: { label: 'In Progress', icon: Circle, color: 'text-blue-500' },
  completed: { label: 'Completed', icon: Circle, color: 'text-emerald-500 fill-emerald-500' },
  failed: { label: 'Failed', icon: X, color: 'text-red-500' },
  awaiting_approval: { label: 'Await Approval', icon: AlertTriangle, color: 'text-orange-500' },
};

export const STEP_MAPPING: Record<string, { label: string; icon: React.ElementType }> = {
  resolveUser: { label: 'Resolving User', icon: User },
  blockJob: { label: 'Needs Review', icon: AlertTriangle },
  ensureGroupMembership: { label: 'Group Access', icon: Users },
  ensureEventMembership: { label: 'Event Access', icon: Calendar },
  confirmationMessage: { label: 'Sent Confirmation', icon: Mail },
};

// Define the ORDER needed for the step indicator
export const WORKFLOW_STEPS = [
  'resolveUser',
  'blockJob',
  'ensureGroupMembership',
  'ensureEventMembership',
  'confirmationMessage',
];
// --- Candidate Types ---
export interface MismatchDetail {
  field: string;
  expected: string | null;
  actual: string | null;
}

export interface Candidate {
  personId: string;
  personLabel: string;
  reason?: string;
  mismatches?: string[];
  structuredMismatches?: MismatchDetail[];
  score?: number;
  details?: {
    first_name?: string | null;
    last_name?: string | null;
    nickname?: string | null;
    email?: string | null;
    birthday?: string | null;
  };
}
