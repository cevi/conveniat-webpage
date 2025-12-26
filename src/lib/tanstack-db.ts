import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { z } from 'zod';

/**
 * Define the schema for a starred event.
 */
const starSchema = z.object({
  id: z.string(),
  starredAt: z.number(),
});

/**
 * Initialize the local TanStack DB collection for stars.
 * Uses localStorage for persistence across sessions.
 */
export const starsCollection = createCollection(
  localStorageCollectionOptions({
    id: 'stars',
    storageKey: 'tanstack-db-stars',
    getKey: (item) => item.id,
    schema: starSchema,
  }),
);

// Type helper for the stars table
export type StarRecord = z.infer<typeof starSchema>;

/**
 * Schema for schedule entry timeslot
 */
const timeslotSchema = z.object({
  date: z.string(),
  time: z.string(),
});

/**
 * Schema for location (can be string ID or full annotation object)
 */
const locationSchema = z.union([
  z.string(),
  z
    .object({
      id: z.string(),
      title: z.string(),
      coordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
    })
    .passthrough(), // Allow additional properties from CampMapAnnotation
]);

/**
 * Schema for organiser
 */
const organiserSchema = z.union([
  z.string(),
  z.object({
    fullName: z.string(),
    email: z.string(),
  }),
]);

/**
 * Define the schema for a schedule entry.
 * This matches CampScheduleEntryFrontendType.
 */
const scheduleEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.any(), // SerializedEditorState from Lexical - complex nested structure
  timeslot: timeslotSchema,
  location: locationSchema,
  participants_min: z.number().nullable().optional(),
  participants_max: z.number().nullable().optional(),
  category: z.enum(['workshop', 'general', 'food', 'activity', 'other']).nullable().optional(),
  organiser: z.array(organiserSchema).nullable().optional(),
  // Metadata for cache management
  _syncedAt: z.number().optional(),
});

/**
 * Initialize the local TanStack DB collection for schedule entries.
 * Uses localStorage for persistence and offline support.
 */
export const scheduleEntriesCollection = createCollection(
  localStorageCollectionOptions({
    id: 'schedule-entries',
    storageKey: 'tanstack-db-schedule-entries',
    getKey: (item) => item.id,
    schema: scheduleEntrySchema,
  }),
);

// Type helper for schedule entries
export type ScheduleEntryRecord = z.infer<typeof scheduleEntrySchema>;
