'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Loader2, Zap } from 'lucide-react';
import React, { useState } from 'react';

export interface TriggerFormData {
  mode: 'id' | 'details';
  peopleId?: string | undefined;
  details?:
    | {
        firstName: string;
        lastName: string;
        nickname: string;
        email: string;
        birthDate: string;
      }
    | undefined;
}

export interface TriggerRegistrationFormProperties {
  onSubmit: (data: TriggerFormData) => Promise<void>;
  isPending: boolean;
}

export const TriggerRegistrationForm: React.FC<TriggerRegistrationFormProperties> = ({
  onSubmit,
  isPending,
}) => {
  const [peopleId, setPeopleId] = useState('');
  const [details, setDetails] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    birthDate: '',
  });
  const [mode, setMode] = useState<'id' | 'details'>('id');

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    let submitPeopleId: string | undefined = undefined;
    if (mode === 'id' && peopleId !== '') {
      submitPeopleId = peopleId;
    }

    try {
      await onSubmit({
        mode,
        peopleId: submitPeopleId,
        details: mode === 'details' ? details : undefined,
      });

      // Clear the form upon success
      if (mode === 'id') {
        setPeopleId('');
      } else {
        setDetails({
          firstName: '',
          lastName: '',
          nickname: '',
          email: '',
          birthDate: '',
        });
      }
    } catch {
      // Handled upstream, nothing to do here
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-zinc-900 uppercase transition-colors dark:text-white">
          Manual Trigger
        </h3>

        {/* Inset Tile Toggler (Linear Style) */}
        <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 shadow-inner transition-all dark:border-zinc-800 dark:bg-white/3">
          <button
            type="button"
            onClick={() => setMode('id')}
            className={cn(
              'cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-black tracking-wider uppercase transition-all',
              mode === 'id'
                ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-white dark:text-zinc-900 dark:ring-white/10'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            By ID
          </button>
          <button
            type="button"
            onClick={() => setMode('details')}
            className={cn(
              'cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-black tracking-wider uppercase transition-all',
              mode === 'details'
                ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-white dark:text-zinc-900 dark:ring-white/10'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            By Data
          </button>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="grid grid-cols-1 gap-6">
        {mode === 'id' ? (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            <input
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-sm font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white"
              value={peopleId}
              onChange={(event) => setPeopleId(event.target.value)}
              required
              placeholder="Enter People ID (e.g. 12345678)"
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-x-8 gap-y-6 duration-300 md:grid-cols-2">
            <input
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-sm font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white"
              value={details.firstName}
              onChange={(event) => setDetails({ ...details, firstName: event.target.value })}
              required
              placeholder="First Name *"
            />
            <input
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-sm font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white"
              value={details.lastName}
              onChange={(event) => setDetails({ ...details, lastName: event.target.value })}
              placeholder="Last Name"
            />
            <input
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-sm font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white"
              value={details.nickname}
              onChange={(event) => setDetails({ ...details, nickname: event.target.value })}
              placeholder="Nickname"
            />
            <input
              type="email"
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-sm font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white"
              value={details.email}
              onChange={(event) => setDetails({ ...details, email: event.target.value })}
              required
              placeholder="Email Address *"
            />
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="group relative inline-flex cursor-pointer items-center gap-2.5 rounded-xl bg-zinc-900 px-6 py-2.5 text-[11px] font-black tracking-widest text-white uppercase shadow-lg transition-all hover:bg-zinc-800 disabled:bg-zinc-200 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
            )}
            <span>Initialize Workflow</span>
          </button>
        </div>
      </form>
    </div>
  );
};
