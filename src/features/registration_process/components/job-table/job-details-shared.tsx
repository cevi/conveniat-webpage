import { Badge } from '@/components/ui/badge';
import { JsonBlock } from '@/components/ui/json-block';
import { environmentVariables } from '@/config/environment-variables';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

/**
 * Helper to display key-value pairs cleanly
 */
export const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
    <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
      {Icon !== undefined && React.createElement(Icon, { className: 'h-3.5 w-3.5' })}
      <span>{label}</span>
    </div>
    <div className="text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">{value}</div>
  </div>
);

interface Candidate {
  personLabel?: string;
  personId?: string;
  addedToSupportGroup?: boolean;
  [key: string]: unknown;
}

export const renderValue = (value: unknown): React.ReactNode => {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined || value === '') {
    return <span className="text-zinc-400 dark:text-zinc-600">N/A</span>;
  }
  return String(value as string | number | boolean);
};

/**
 * Component to flatten and display simple input objects
 */
export const ExpandableSection: React.FC<{
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}> = ({ title, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800',
        !isExpanded && 'h-[38px]',
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between border-transparent bg-zinc-50/50 px-6 py-3 ring-0 transition-colors outline-none hover:bg-zinc-100/50 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50"
      >
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">{title}</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-zinc-400 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">{children}</div>
      )}
    </div>
  );
};

export const InputViewer: React.FC<{ data: unknown }> = ({ data }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="text-zinc-500">{String(data)}</span>;
  }

  // If complex nested object, fallback to JSON block
  const isComplex = Object.values(data).some(
    (val) => typeof val === 'object' && val !== null && !Array.isArray(val),
  );

  if (isComplex) {
    return <JsonBlock data={data} className="mt-2 text-[10px]" />;
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {Object.entries(data as Record<string, unknown>).map(([key, val]) => {
        if (key === 'candidates' && Array.isArray(val)) {
          return (
            <div
              key={key}
              className="flex flex-col gap-2 border-b border-zinc-100 py-2 first:pt-0 last:border-0 last:pb-0 dark:border-zinc-800"
            >
              <span className="text-xs font-medium text-zinc-500 capitalize">
                {key.replaceAll(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(val as Candidate[]).map((candidate, index) => {
                  const label = candidate.personLabel ?? 'Unknown';

                  if (
                    candidate.addedToSupportGroup === true &&
                    typeof candidate.personId === 'string' &&
                    candidate.personId !== ''
                  ) {
                    const link = `${environmentVariables.NEXT_PUBLIC_HITOBITO_API_URL}/groups/${environmentVariables.NEXT_PUBLIC_SUPPORT_GROUP_ID}/people/${candidate.personId}`;
                    return (
                      <Link
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline"
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer font-normal text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {label}
                        </Badge>
                      </Link>
                    );
                  }

                  return (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="font-normal text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div
            key={key}
            className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 text-xs first:pt-0 last:border-0 last:pb-0 dark:border-zinc-800"
          >
            <span className="font-medium text-zinc-500 capitalize">
              {key.replaceAll(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-right font-mono wrap-break-word text-zinc-900 dark:text-zinc-200">
              {renderValue(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const flattenObject = (
  object: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> => {
  return Object.keys(object).reduce((accumulator: Record<string, unknown>, key: string) => {
    const pre = prefix.length > 0 ? `${prefix}.` : '';
    const value = object[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(accumulator, flattenObject(value as Record<string, unknown>, pre + key));
    } else {
      accumulator[pre + key] = value;
    }
    return accumulator;
  }, {});
};
