import { notFound } from 'next/navigation';
import type React from 'react';

/**
 * This page is rendered when no other page is found.
 *
 * Although, `/src/app/(frontend)/[locale]/[[...slugs]]/blog-posts.tsx` is the fallback page for
 * all pages that aren't statically rendered, this page is still necessary to handle
 * the case where the locale is set incorrectly.
 *
 */
const NotFoundFallbackPage: React.FC = () => {
  notFound();
};

export default NotFoundFallbackPage;
