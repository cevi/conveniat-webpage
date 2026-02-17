import { z } from 'zod';

export const HitobitoNextAuthUserSchema = z.object({
  uuid: z.string().min(1),
  group_ids: z.array(z.number()),
  email: z.string().email(),
  name: z.string().min(1),
  nickname: z.string().nullish(),
  hof: z.number().optional(),
  quartier: z.number().optional(),
});

export type HitobitoNextAuthUser = z.infer<typeof HitobitoNextAuthUserSchema>;
