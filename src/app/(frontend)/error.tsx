'use client';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import Link from 'next/link';

const Error: React.FC = () => {
  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>Something went wrong</HeadlineH1>
      <TeaserText>
        The page failed to load. Please check the URL or go back to the{' '}
        <Link href="/" className="font-bold text-red-600">
          home page
        </Link>
        .
      </TeaserText>
    </article>
  );
};

export default Error;
