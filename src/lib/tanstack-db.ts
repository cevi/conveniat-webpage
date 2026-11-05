import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { z } from 'zod';

/**
 * Define the schema for a starred event.
 *
 * A row is what this device knows about one star, see `@/lib/star-sync`. `starred: false` is a
 * removal the database has not heard of yet, kept so the next sync can tell it. `synced` marks a
 * row the database confirmed; rows stored before either field existed have neither, and read as
 * a star that still has to be sent.
 */
const starSchema = z.object({
  id: z.string(),
  /** When the star was last changed on this device, also how a sync recognises its own rows. */
  starredAt: z.number(),
  starred: z.boolean().optional(),
  synced: z.boolean().optional(),
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
 * Stars or unstars an entry on this device and marks the row for the next sync, which tells the
 * database. An unstarred row stays as a removal until then, so it cannot come back from there.
 *
 * @param id - The id of the starred entry.
 * @param starred - Whether the entry is starred now.
 */
export const setLocalStar = (id: string, starred: boolean): void => {
  const starredAt = Date.now();
  if (starsCollection.has(id)) {
    starsCollection.update(id, (draft) => {
      draft.starred = starred;
      draft.starredAt = starredAt;
      draft.synced = false;
    });
    return;
  }
  starsCollection.insert({ id, starredAt, starred, synced: false });
};

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
      title: z.string().optional(),
    })
    .loose(), // Allow additional properties from CampMapAnnotation
]);

/**
 * Schema for organiser. A populated user carries only `id`, `fullName` and `nickname` (see
 * `defaultPopulate` on the users collection), never the email.
 */
const organiserSchema = z.union([
  z.string(),
  z
    .object({
      fullName: z.string(),
    })
    .loose(), // Allow additional properties from User
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
    .loose(), // Allow title, colorTheme, and additional properties from CampCategory
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
  // Zod drops what the schema does not name, so the fields of the programme redesign have to be
  // listed for the offline copy to keep them. All optional: older copies have none.
  kind: z.string().nullable().optional(),
  form: z.string().nullable().optional(),
  quartiere: z.array(z.any()).nullable().optional(),
  bring: z.array(z.any()).nullable().optional(),
  steps: z.array(z.any()).nullable().optional(),
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
 * Initialize the local TanStack DB collection for user preferences. Read and write it through
 * `@/lib/preferences`, which knows what each key holds.
 *
 * Loaded eagerly and never collected. A collection only reads localStorage once something
 * subscribes, and preferences are read with `get()`, which does not subscribe: after an app
 * restart every preference read as unset, and the first write replaced all stored ones with
 * itself.
 */
export const userPreferencesCollection = createCollection({
  ...localStorageCollectionOptions({
    id: 'user-preferences',
    storageKey: 'tanstack-db-user-preferences',
    getKey: (item) => item.key,
    schema: userPreferenceSchema,
  }),
  startSync: true,
  gcTime: 0,
});

export type UserPreferenceRecord = z.infer<typeof userPreferenceSchema>;
