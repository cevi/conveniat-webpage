'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Flag, MessageCircleQuestion, MessageSquare } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const viewForumPostsText: StaticTranslationString = {
  en: 'View Forum Posts',
  de: 'Forum-Beiträge anzeigen',
  fr: 'Voir les publications du forum',
};

const viewForumPostDescription: StaticTranslationString = {
  en: 'See what others are saying',
  de: 'Sehen Sie, was andere sagen',
  fr: 'Voir ce que les autres disent',
};

const reportIssueText: StaticTranslationString = {
  en: 'Report an Issue',
  de: 'Problem melden',
  fr: 'Signaler un problème',
};

const reportIssueDescription: StaticTranslationString = {
  en: 'Broken toilet, maintenance needed, etc.',
  de: 'Defekte Toilette, Wartung erforderlich usw.',
  fr: 'Toilettes cassées, maintenance nécessaire, etc.',
};

export const AnnotationForumAndReportSection: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={18} className="text-conveniat-green" />
        <h3 className="text-conveniat-green font-semibold">conveniat27 Forum</h3>
      </div>
      <div className="space-y-2">
        <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
          <MessageSquare size={16} className="text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">{viewForumPostsText[locale]}</div>
            <div className="text-sm text-gray-600">{viewForumPostDescription[locale]}</div>
          </div>
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
          <Flag size={16} className="text-orange-600" />
          <div>
            <div className="font-medium text-gray-900"> {reportIssueText[locale]}</div>
            <div className="text-sm text-gray-600">{reportIssueDescription[locale]}</div>
          </div>
        </button>
      </div>
    </div>
  );
};
