import { LinkComponent } from '@/components/ui/link-component';
import { getFooterCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale } from '@/types/types';
import { SiInstagram, SiYoutube } from '@icons-pack/react-simple-icons';
import { cacheLife, cacheTag } from 'next/cache';
import React from 'react';

export const SocialMediaLinks: React.FC<{ locale: Locale }> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  // use the cached getter to ensure we only fetch the footer once per request
  const { socialLinks } = await getFooterCached(locale);

  const instagramLink = socialLinks?.instagram;
  const youTubeLink = socialLinks?.youtube;

  return (
    <div className="mb-2 flex items-center justify-center gap-2">
      {instagramLink !== null && instagramLink !== undefined && (
        <LinkComponent
          href={instagramLink}
          hideExternalIcon
          openInNewTab
          rel="noopener noreferrer"
          className="rounded-full p-2 transition-colors duration-200"
          aria-label="Follow us on Instagram"
        >
          <SiInstagram className="h-5 w-5" />
        </LinkComponent>
      )}

      {youTubeLink !== null && youTubeLink !== undefined && (
        <LinkComponent
          href={youTubeLink}
          hideExternalIcon
          openInNewTab
          rel="noopener noreferrer"
          className="rounded-full p-2 transition-colors duration-200"
          aria-label="Subscribe to our YouTube channel"
        >
          <SiYoutube className="h-5 w-5" />
        </LinkComponent>
      )}
    </div>
  );
};
