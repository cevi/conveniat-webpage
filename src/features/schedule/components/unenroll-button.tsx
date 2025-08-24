'use client';
import { Button } from '@/components/ui/buttons/button';
import { trpc } from '@/trpc/client';
import React from 'react';

export const UnenrollButton: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const unenrollInCourse = trpc.schedule.unenrollFromCourse.useMutation();

  return (
    <Button
      className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
      onClick={() => unenrollInCourse.mutate({ courseId })}
    >
      Einschreibung löschen
    </Button>
  );
};
