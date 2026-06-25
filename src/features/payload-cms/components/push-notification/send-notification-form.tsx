import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface SendNotificationFormProperties {
  content: string;
  setContent: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  error: string | undefined;
  setError: (value: string | undefined) => void;
  translations: {
    contentLabel: string;
    contentPlaceholder: string;
    urlLabel: string;
    urlPlaceholder: string;
  };
}

export const SendNotificationForm: React.FC<SendNotificationFormProperties> = ({
  content,
  setContent,
  url,
  setUrl,
  error,
  setError,
  translations,
}) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm leading-none font-medium text-gray-700 dark:text-gray-300">
          {translations.contentLabel}
        </label>
        <Input
          placeholder={translations.contentPlaceholder}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (error !== undefined && error !== '') setError(undefined);
          }}
          className="bg-white dark:bg-gray-950"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm leading-none font-medium text-gray-700 dark:text-gray-300">
          {translations.urlLabel}
        </label>
        <Input
          placeholder={translations.urlPlaceholder}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="bg-white dark:bg-gray-950"
        />
      </div>

      {error !== undefined && error !== '' && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
