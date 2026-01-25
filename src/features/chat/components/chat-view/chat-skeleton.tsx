'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { Button } from '@/components/ui/buttons/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const ChatSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <AppFooterController hideAppFooter />
    <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
      </Link>
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="ml-auto">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {Array.from({ length: 5 })
        .fill(0)
        .map((_, index) => (
          <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`h-16 ${index % 2 === 0 ? 'w-64' : 'w-48'} animate-pulse rounded-2xl bg-gray-200`}
            />
          </div>
        ))}
    </div>
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="h-12 w-full animate-pulse rounded-full bg-gray-200" />
    </div>
  </div>
);
