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
  z
    .object({
      fullName: z.string(),
      email: z.string(),
    })
    .passthrough(), // Allow additional properties from User
]);

/**
 * Schema for category (can be string ID/enum or populated CampCategory object)
 */
const categorySchema = z.union([
  z.string(),
  z
    .object({
      id: z.string(),
    })
    .passthrough(), // Allow title, colorTheme, and additional properties from CampCategory
]);

/**
 * Define the schema for a schedule entry.
 * This matches CampScheduleEntryFrontendType.
 *
 * Every relationship field has to admit `null` and `undefined`: Payload returns `null` for a
 * dangling relation (the related document was deleted) and omits the field entirely when it is
 * not set. The schema is enforced on `insert()`/`update()` and a violation throws a
 * `SchemaValidationError` out of the calling effect, which takes down the whole schedule page -
 * so it must never be stricter than what the API can actually return.
 */
const scheduleEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.any(), // SerializedEditorState from Lexical - complex nested structure
  timeslot: timeslotSchema,
  location: locationSchema.nullable().optional(),
  participants_min: z.number().nullable().optional(),
  participants_max: z.number().nullable().optional(),
  enable_enrolment: z.boolean().nullable().optional(),
  category: categorySchema.nullable().optional(),
  target_group: z.any().nullable().optional(),
  // Drop dangling entries before validating: Payload leaves a `null` in the array when an
  // organiser account was deleted, and the detail view dereferences every element.
  organiser: z
    .preprocess(
      (value) => (Array.isArray(value) ? value.filter((entry) => entry != undefined) : value),
      z.array(organiserSchema),
    )
    .nullable()
    .optional(),
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

/**
 * Schema for user preferences
 */
const userPreferenceSchema = z.object({
  key: z.string(),
  value: z.any(),
});

/**
 * Initialize the local TanStack DB collection for user preferences.
 */
export const userPreferencesCollection = createCollection(
  localStorageCollectionOptions({
    id: 'user-preferences',
    storageKey: 'tanstack-db-user-preferences',
    getKey: (item) => item.key,
    schema: userPreferenceSchema,
  }),
);

export type UserPreferenceRecord = z.infer<typeof userPreferenceSchema>;
