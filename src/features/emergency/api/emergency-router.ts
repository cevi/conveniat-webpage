import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

const GeolocationCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const EpochTimeStampSchema = z.number();

const GeolocationPositionSchema = z.object({
  coords: GeolocationCoordinatesSchema,
  timestamp: EpochTimeStampSchema,
});

const newAlertSchema = z.object({
  location: GeolocationPositionSchema.required(),
});

export const emergencyRouter = createTRPCRouter({
  newAlert: trpcBaseProcedure.input(newAlertSchema).mutation(async ({ input, ctx }) => {
    const { user } = ctx;
    const { location } = input;

    console.log(
      `New emergency alert from user ${user.nickname} at location: ${JSON.stringify(location)}`,
    );

    // TODO: create a new emergency chat with the user
    //   forward the user to that chat page

    return {
      success: true,
      redirectUrl: '/app/chat',
    };
  }),
});
