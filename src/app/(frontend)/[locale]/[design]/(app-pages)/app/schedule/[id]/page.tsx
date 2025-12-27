import { ScheduleDetailPageContent } from '@/features/schedule/components/schedule-detail-page-content';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import type React from 'react';

const ScheduleDetailPage: React.FC<{
  params: Promise<{
    id: string;
  }>;
}> = async ({ params }) => {
  // Awaiting params is required in Next.js 15+ / 16
  const { id } = await params;

  return (
    <ForceDynamicOnBuild>
      <ScheduleDetailPageContent id={id} />
    </ForceDynamicOnBuild>
  );
};

export default ScheduleDetailPage;
