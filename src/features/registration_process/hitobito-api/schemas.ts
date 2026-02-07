import { z } from 'zod';

// --- Base Schemas ---
export const PersonAttributesSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  town: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
});

export type PersonAttributes = z.infer<typeof PersonAttributesSchema>;

// Search candidate schema
export const SearchCandidateSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  label: z.string().optional(),
  text: z.string().optional(),
});

// Search response can be an array or an object with results/people
export const SearchResponseSchema = z.union([
  z.array(SearchCandidateSchema),
  z.object({
    results: z.array(SearchCandidateSchema).optional(),
    people: z.array(SearchCandidateSchema).optional(),
  }),
]);

export const ResolveUserByDetailsSchema = z.object({
  peopleId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().optional(),
  email: z.string().email(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

export const ResolveUserByIdSchema = z.object({
  peopleId: z.union([z.string(), z.number()]).transform(String),
});

export const ResolveUserInputSchema = z.union([ResolveUserByIdSchema, ResolveUserByDetailsSchema]);

export const RegistrationWorkflowInputSchema = z.object({
  input: ResolveUserInputSchema.and(
    z.object({
      resolvedUserId: z.string().optional(),
      forceCreateUser: z.boolean().optional(),
    }),
  ),
});

// --- Output Schemas ---
export const ResolveUserOutputSchema = z.object({
  peopleId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string(),
  birthDate: z.string(),
  address: z.string(),
  status: z.enum(['found', 'created', 'ambiguous']),
  reason: z.string(),
  candidates: z.array(z.any()).optional(),
});

/**
 * Person resource from API
 */
export const PersonResourceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),
  attributes: PersonAttributesSchema,
});

export type PersonResource = z.infer<typeof PersonResourceSchema>;

// --- Types ---
export type ResolveUserByDetails = z.infer<typeof ResolveUserByDetailsSchema>;
export type ResolveUserById = z.infer<typeof ResolveUserByIdSchema>;
export type ResolveUserInput = z.infer<typeof ResolveUserInputSchema>;
export type RegistrationWorkflowInput = z.infer<typeof RegistrationWorkflowInputSchema>;
export type ResolveUserOutput = z.infer<typeof ResolveUserOutputSchema>;
