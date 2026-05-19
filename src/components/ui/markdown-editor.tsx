'use client';

import type React from 'react';
import { useCallback, useState } from 'react';

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
  placeholder = 'Enter text...',
  rows = 4,
  label,
}) => {
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header with label and preview toggle */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        {label && (
          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</span>
        )}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Content area */}
      <div className="p-3">
        {showPreview ? (
          <div
            className="prose prose-sm min-h-[100px] max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        ) : (
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none border-0 bg-transparent p-0 text-sm text-gray-700 placeholder-gray-400 focus:ring-0 focus:outline-none"
          />
        )}
      </div>

      {/* Formatting hint */}
      {!showPreview && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-400">
            Formatting: <code className="rounded bg-gray-100 px-1">**bold**</code>,{' '}
            <code className="rounded bg-gray-100 px-1">*italic*</code>,{' '}
            <code className="rounded bg-gray-100 px-1">- list item</code>
          </p>
        </div>
      )}
    </div>
  );
};
