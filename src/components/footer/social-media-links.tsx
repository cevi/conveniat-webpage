import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { SiInstagram, SiYoutube } from '@icons-pack/react-simple-icons';
import config from '@payload-config';
import Link from 'next/link';
import { getPayload } from 'payload';
import React from 'react';

export const SocialMediaLinks: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();
  const { socialLinks } = await payload.findGlobal({ slug: 'footer', locale });

  const instagramLink = socialLinks?.instagram;
  const youTubeLink = socialLinks?.youtube;

  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      {instagramLink !== null && instagramLink !== undefined && (
        <Link
          href={instagramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full transition-colors duration-200"
          aria-label="Follow us on Instagram"
        >
          <SiInstagram className="w-5 h-5" />
        </Link>
      )}

      {youTubeLink !== null && youTubeLink !== undefined && (
        <Link
          href={youTubeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full transition-colors duration-200"
          aria-label="Subscribe to our YouTube channel"
        >
          <SiYoutube className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
};
