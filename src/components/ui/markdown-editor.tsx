'use client';

import { fieldFocusRingClassName } from '@/components/ui/field';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useCallback, useState } from 'react';

const labels = {
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  preview: { de: 'Vorschau', en: 'Preview', fr: 'Aperçu' },
  formatting: { de: 'Formatierung:', en: 'Formatting:', fr: 'Mise en forme :' },
  bold: { de: '**fett**', en: '**bold**', fr: '**gras**' },
  italic: { de: '*kursiv*', en: '*italic*', fr: '*italique*' },
  listItem: { de: '- Listenpunkt', en: '- list item', fr: '- élément' },
} satisfies Record<string, StaticTranslationString>;

interface MarkdownEditorProperties {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

/**
 * A simple Markdown editor with live preview toggle.
 * Supports basic formatting: **bold**, *italic*, and bullet lists (- item).
 */
export const MarkdownEditor: React.FC<MarkdownEditorProperties> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  label,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const renderPreview = useCallback(() => {
    // Convert markdown to simple HTML for preview
    let html = value;

    // Escape HTML entities first
    html = html.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    // Bold: **text** or __text__
    html = html.replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replaceAll(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (but not inside **)
    html = html.replaceAll(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replaceAll(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

    // Bullet lists: lines starting with "- " or "* "
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;

    for (const line of lines) {
      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          processedLines.push('<ul class="list-disc pl-5">');
          inList = true;
        }
        processedLines.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line.trim()) {
          processedLines.push(`<p>${line}</p>`);
        } else {
          processedLines.push('<br/>');
        }
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }

    return processedLines.join('');
  }, [value]);

  const code = 'bg-quiet rounded px-1 text-green-700';

  // the frame of a form field from field.ts, with a head for the label and the preview switch
  return (
    <div className={cn('border-line rounded-[12px] border bg-white', fieldFocusRingClassName)}>
      <div className="border-line flex items-center justify-between border-b pl-3.5">
        {label !== undefined && label !== '' && (
          <span className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
            {label}
          </span>
        )}
        <button
          type="button"
          aria-pressed={showPreview}
          onClick={() => setShowPreview(!showPreview)}
          className="ml-auto flex min-h-[44px] cursor-pointer items-center px-3.5 text-[13px] font-semibold text-green-700 transition-colors hover:text-green-900"
        >
          {showPreview ? labels.edit[locale] : labels.preview[locale]}
        </button>
      </div>

      <div className="px-3.5 py-2.5">
        {showPreview ? (
          <div
            className="prose prose-sm min-h-[100px] max-w-none text-[15px] text-green-900"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        ) : (
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-[22px] text-green-900 outline-hidden placeholder:text-green-500"
          />
        )}
      </div>

      {!showPreview && (
        <div className="border-line border-t px-3.5 py-2">
          <p className="text-xs text-green-500">
            {labels.formatting[locale]} <code className={code}>{labels.bold[locale]}</code>,{' '}
            <code className={code}>{labels.italic[locale]}</code>,{' '}
            <code className={code}>{labels.listItem[locale]}</code>
          </p>
        </div>
      )}
    </div>
  );
};
