'use client';

/* eslint-disable @next/next/no-img-element -- already a small webp, and private to logged-in users, which the image optimiser cannot fetch */
import type React from 'react';
import { useState } from 'react';

/**
 * A profile picture laid over the initials below it. When it cannot be loaded, e.g. offline or
 * after the picture was removed, it steps aside and the initials show.
 */
export const AvatarPicture: React.FC<{ src: string }> = ({ src }) => {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  if (failedSource === src) return <></>;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full rounded-full object-cover"
      onError={() => setFailedSource(src)}
    />
  );
};
