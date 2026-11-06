'use client';
import { toast } from '@/components/ui/toast';
import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { useCallback, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

const labels = {
  saveSuccess: {
    de: 'Erfolgreich gespeichert',
    en: 'Saved successfully',
    fr: 'Enregistré avec succès',
  },
  saveFailed: {
    de: 'Die Änderungen konnten nicht gespeichert werden.',
    en: 'The changes could not be saved.',
    fr: 'Les modifications n’ont pas pu être enregistrées.',
  },
  maxParticipantsError: {
    de: 'Max. Teilnehmer darf nicht unter der aktuellen Anzahl liegen.',
    en: 'Max participants cannot be less than current enrolled count.',
    fr: 'Le nombre maximum de participants ne peut pas être inférieur au nombre actuel.',
  },
} satisfies Record<string, StaticTranslationString>;

export interface EditData {
  description: string;
  targetGroup: string;
  maxParticipants: number;
}

interface CourseStatus {
  enrolledCount: number;
  maxParticipants: number | undefined;
  isEnrolled: boolean;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  participants: { uuid: string; name: string }[];
  descriptionMarkdown: string | undefined;
  targetGroupMarkdown: string | undefined;
}

interface UseScheduleEditOptions {
  courseId: string;
  locale: Locale;
  courseStatus: CourseStatus | undefined;
}

export interface UseScheduleEditReturn {
  isEditing: boolean;
  editError: string | undefined;
  editData: EditData;
  isAdmin: boolean;
  isSaving: boolean;
  handleStartEdit: () => void;
  handleCancelEdit: () => void;
  handleSave: () => void;
  setEditData: React.Dispatch<React.SetStateAction<EditData>>;
}

/**
 * Shared hook for schedule entry edit functionality.
 * Used by both standalone and modal schedule detail views.
 */
export function useScheduleEdit({
  courseId,
  locale,
  courseStatus,
}: UseScheduleEditOptions): UseScheduleEditReturn {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [editData, setEditData] = useState<EditData>({
    description: '',
    targetGroup: '',
    maxParticipants: 0,
  });

  const updateCourse = useMutation(
    trpc.schedule.updateCourseDetails.mutationOptions({
      onSuccess: async () => {
        setIsEditing(false);
        setEditError(undefined);
        // Invalidate all related queries to trigger refetch
        await Promise.all([
          queryClient.invalidateQueries(trpc.schedule.getCourseStatus.queryFilter({ courseId })),
          queryClient.invalidateQueries(trpc.schedule.getById.queryFilter({ id: courseId })),
          queryClient.invalidateQueries(trpc.schedule.getScheduleEntries.pathFilter()),
        ]);
        toast.success(labels.saveSuccess[locale]);
      },
      // shown in the form, beside what failed to save
      onError: (error_) =>
        setEditError(userErrorMessage(error_, locale, scheduleErrorTexts, labels.saveFailed)),
    }),
  );

  const isAdmin = courseStatus?.isAdmin ?? false;

  const handleStartEdit = useCallback(() => {
    setEditData({
      description: courseStatus?.descriptionMarkdown ?? '',
      targetGroup: courseStatus?.targetGroupMarkdown ?? '',
      maxParticipants: courseStatus?.maxParticipants ?? 0,
    });
    setEditError(undefined);
    setIsEditing(true);
  }, [courseStatus]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditError(undefined);
  }, []);

  const handleSave = useCallback(() => {
    setEditError(undefined);
    if (
      editData.maxParticipants > 0 &&
      courseStatus &&
      editData.maxParticipants < courseStatus.enrolledCount
    ) {
      setEditError(labels.maxParticipantsError[locale]);
      return;
    }
    updateCourse.mutate({
      courseId,
      description: editData.description,
      targetGroup: editData.targetGroup,
      maxParticipants: editData.maxParticipants > 0 ? editData.maxParticipants : undefined,
    });
  }, [editData, courseStatus, courseId, updateCourse, locale]);

  return {
    isEditing,
    editError,
    editData,
    isAdmin,
    isSaving: updateCourse.isPending,
    handleStartEdit,
    handleCancelEdit,
    handleSave,
    setEditData,
  };
}
