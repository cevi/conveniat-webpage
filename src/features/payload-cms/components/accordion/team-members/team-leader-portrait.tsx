import { AvatarPlaceholder } from '@/features/payload-cms/components/accordion/avatar-placeholder';
import type { Image as ImageType } from '@/features/payload-cms/payload-types';
import { cn } from '@/utils/tailwindcss-override';
import Image from 'next/image';
import type React from 'react';

export const TeamLeaderPortrait: React.FC<{
  name: string;
  portrait: string | ImageType | null | undefined;
  hoverEffect: boolean;
}> = ({ name, portrait, hoverEffect }) => {
  if (portrait === null || portrait === undefined) return <AvatarPlaceholder />;
  const portraitSource =
    typeof portrait === 'string' ? portrait : (portrait.sizes?.large?.url ?? '');
  if (portraitSource === '') return <AvatarPlaceholder />;

  return (
    <Image
      src={portraitSource}
      alt={`Portrait of ${name}`}
      width={200}
      height={200}
      className={cn(
        'h-full object-cover transition-transform',
        hoverEffect && 'group-hover:scale-105',
      )}
    />
  );
};
