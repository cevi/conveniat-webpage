'use client';

import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { useCallback, useState } from 'react';

const labels = {
  saveSuccess: {
    de: 'Erfolgreich gespeichert',
    en: 'Saved successfully',
    fr: 'Enregistré avec succès',
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
  const trpcUtils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [editData, setEditData] = useState<EditData>({
    description: '',
    targetGroup: '',
    maxParticipants: 0,
  });

  const updateCourse = trpc.schedule.updateCourseDetails.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      setEditError(undefined);
      // Invalidate all related queries to trigger refetch
      await Promise.all([
        trpcUtils.schedule.getCourseStatus.invalidate({ courseId }),
        trpcUtils.schedule.getById.invalidate({ id: courseId }),
        trpcUtils.schedule.getScheduleEntries.invalidate(),
      ]);
      toast.success(labels.saveSuccess[locale]);
    },
    onError: (error_) => {
      setEditError(error_.message);
      toast.error(error_.message);
    },
  });

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
