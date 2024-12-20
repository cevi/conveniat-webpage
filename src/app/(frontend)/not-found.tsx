import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import Link from 'next/link';

/**
 * This file is responsible for converters a general 404 error page.
 */
const NotFoundPage: React.FC = () => {
  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>404 - Page Not Found</HeadlineH1>
      <TeaserText>
        The page you are looking for does not exist. Please check the URL or go back to the{' '}
        <Link href="/" className="font-bold text-red-600">
          home page
        </Link>
        .
      </TeaserText>
    </article>
  );
};

export default NotFoundPage;
