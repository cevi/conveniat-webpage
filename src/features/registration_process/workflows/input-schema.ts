import { z } from 'zod';

export const registrationInputSchema = z.union([
  z.object({
    peopleId: z.string().min(1),
  }),
  z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    nickname: z.string().optional(),
    email: z.string().email(),
    birthDate: z.string().optional(), // Expected format YYYY-MM-DD
  }),
]);

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
