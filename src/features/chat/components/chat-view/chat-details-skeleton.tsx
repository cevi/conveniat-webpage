'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import React from 'react';

export const ChatDetailsPageSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <AppFooterController hideAppFooter />
    {/* Header */}
    <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
      {/* Back Button */}
      <div className="mr-2 h-10 w-10 animate-pulse rounded-md bg-gray-100" />
      {/* Title Area */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      </div>
      {/* Right Action Area */}
      <div className="ml-auto flex gap-2">
        {/* Optional Edit/Save buttons placeholder if needed, usually empty in view mode but keeping safe space */}
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Chat Name Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            {/* Label */}
            <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
            {/* Action Icon */}
            <div className="h-8 w-8 animate-pulse rounded bg-gray-100" />
          </div>
          {/* Chat Name Content */}
          <div className="h-7 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Participants Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            {/* Label */}
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            {/* Action Icon */}
            <div className="h-8 w-16 animate-pulse rounded bg-gray-100" />
          </div>

          {/* Participants List */}
          <div className="max-h-60 space-y-3 overflow-y-auto">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200" />
                  <div>
                    {/* Name */}
                    <div className="mb-1 h-5 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Archive/Delete Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="h-10 w-full animate-pulse rounded bg-red-50" />
        </div>
      </div>
    </div>
  </div>
);
