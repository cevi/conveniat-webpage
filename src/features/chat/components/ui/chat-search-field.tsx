'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import type React from 'react';

/** The search over a list of chats or contacts: the app's search field, cleared with its ✕. */
export const ChatSearchField: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ placeholder, value, onChange }) => (
  <AppSearchBar
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onClear={() => onChange('')}
  />
);
