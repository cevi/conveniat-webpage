import type { Metadata } from 'next';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { ParagraphText } from '@/components/typography/paragraph-text';

export const metadata: Metadata = {
  title: "You're Offline",
  description: 'No internet connection detected.',
};

export default function OfflinePage() {
  return (
    <div className="from-slate-900 to-slate-800 bg-gradient-to-b">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-16">
            <svg
              className="text-slate-400 mx-auto h-24 w-24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                color="#47564C"
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>

          <HeadlineH1>You&#39;re Offline</HeadlineH1>

          <div className="mb-8 mt-4">
            <ParagraphText className="text-center">
              It looks like you&#39;ve lost your internet connection. <br />
              Please check your network settings or try again later.
            </ParagraphText>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-static';
