import { z } from 'zod';

/**
 * Schema for a single event_participation resource from the Hitobito JSON:API.
 *
 * Endpoint: GET /api/event_participations
 * Docs: https://cevi.puzzle.ch/api-docs
 */
export const EventParticipationAttributesSchema = z.object({
  event_id: z.number(),
  participant_id: z.number(),
  participant_type: z.string().optional(),
  application_id: z.number().nullable().optional(),
  active: z.boolean().optional(),
  qualified: z.boolean().nullable().optional(),
  additional_information: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const EventParticipationResourceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.literal('event_participations'),
  attributes: EventParticipationAttributesSchema,
  relationships: z
    .object({
      event: z
        .object({
          data: z
            .object({
              id: z.union([z.string(), z.number()]).transform(String),
              type: z.string(),
            })
            .nullable()
            .optional(),
        })
        .optional(),
      participant: z
        .object({
          data: z
            .object({
              id: z.union([z.string(), z.number()]).transform(String),
              type: z.string(),
            })
            .nullable()
            .optional(),
        })
        .optional(),
      roles: z
        .object({
          data: z
            .array(
              z.object({
                id: z.union([z.string(), z.number()]).transform(String),
                type: z.string(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Schema for included person (people) resource sideloaded via ?include=participant
 */
export const IncludedPersonSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.literal('people'),
  attributes: z.object({
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    housenumber: z.string().nullable().optional(),
    zip_code: z.string().nullable().optional(),
    town: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    birthday: z.string().nullable().optional(),
  }),
});

/**
 * Schema for included event_roles resource sideloaded via ?include=roles
 */
export const IncludedEventRoleSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.literal('event_roles'),
  attributes: z.object({
    participation_id: z.number().optional(),
    type: z.string().optional(),
    label: z.string().nullable().optional(),
  }),
});

/**
 * A union of all possible included resources.
 */
export const IncludedResourceSchema = z.discriminatedUnion('type', [
  IncludedPersonSchema,
  IncludedEventRoleSchema,
]);

/**
 * Full response from GET /api/event_participations?include=participant,roles
 */
export const EventParticipationListResponseSchema = z.object({
  data: z.array(EventParticipationResourceSchema),
  included: z.array(IncludedResourceSchema).optional(),
  links: z
    .object({
      first: z.string().nullable().optional(),
      last: z.string().nullable().optional(),
      prev: z.string().nullable().optional(),
      next: z.string().nullable().optional(),
    })
    .optional(),
});

/**
 * Convenience type combining a participation with its resolved person info.
 */
export const EventParticipationWithPersonSchema = z.object({
  participationId: z.string(),
  participantId: z.string(),
  eventId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string(),
  fullName: z.string(),
  roleType: z.string(),
  enrollmentDate: z.string(),
  active: z.boolean(),
});
