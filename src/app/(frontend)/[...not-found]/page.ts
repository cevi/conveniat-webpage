import React from 'react';
import { notFound } from 'next/navigation';

/**
 * This page is rendered when no other page is found.
 *
 * This is needed in addition to the /[locale]/[...slug] page, because
 * of limitations with the locale detection.
 *
 */
const NotFoundFallbackPage: React.FC = () => {
  notFound();
};

export default NotFoundFallbackPage;
