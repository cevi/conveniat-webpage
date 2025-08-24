'use client';
import { Button } from '@/components/ui/buttons/button';
import { trpc } from '@/trpc/client';
import React from 'react';

export const EnrollButton: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const enrollInCourse = trpc.schedule.enrollInCourse.useMutation();

  return (
    <Button
      className="bg-conveniat-green hover:bg-conveniat-green-dark text-white"
      onClick={() => enrollInCourse.mutate({ courseId })}
    >
      Einschreiben
    </Button>
  );
};
