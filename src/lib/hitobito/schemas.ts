import { z } from 'zod';

// --- Base Schemas ---
export const PersonAttributesSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  town: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  housenumber: z.string().nullable().optional(),
  house_number: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
});

export type PersonAttributes = z.infer<typeof PersonAttributesSchema>;

/**
 * Person resource from API
 */
export const PersonResourceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),
  attributes: PersonAttributesSchema,
});

export type PersonResource = z.infer<typeof PersonResourceSchema>;
