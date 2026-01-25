'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { Button } from '@/components/ui/buttons/button';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

export const CreateChatSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <AppFooterController hideAppFooter />

    <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-gray-700" />
        <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="ml-auto">
        <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="relative">
          <div className="h-10 w-full animate-pulse rounded border border-gray-300 bg-white" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b-2 border-gray-200 p-4">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="min-h-[400px] p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
