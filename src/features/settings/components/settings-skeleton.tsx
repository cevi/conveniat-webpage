import { SettingsCard } from '@/features/settings/components/settings-row';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const pulse = 'animate-pulse bg-quiet';

const LabelSkeleton: React.FC<{ width: string }> = ({ width }) => (
  <div className="mb-2 flex h-4 items-center px-1">
    <div className={cn('h-3 rounded', width, pulse)} />
  </div>
);

/** a fact of "Mein Lager": its name on the left, the value on the right */
const FactRowSkeleton: React.FC<{ value: string }> = ({ value }) => (
  <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-2.5">
    <div className={cn('h-4 w-16 rounded', pulse)} />
    <div className={cn('h-4 rounded', value, pulse)} />
  </div>
);

/** a setting: its name, the line below and its switch; a link row has only its name */
const SettingRowSkeleton: React.FC<{ title: string; withSwitch?: boolean }> = ({
  title,
  withSwitch = true,
}) => (
  <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className={cn('h-4 rounded', title, pulse)} />
      {withSwitch && <div className={cn('h-3 w-40 rounded', pulse)} />}
    </div>
    {withSwitch && <div className={cn('h-6 w-11 shrink-0 rounded-full', pulse)} />}
  </div>
);

/**
 * The settings while they load, in the layout they load into: the profile, "Mein Lager", the
 * app's settings, help, "Abmelden" and the version.
 */
export const SettingsSkeleton: React.FC = () => (
  <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-5 pb-12" aria-hidden="true">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className={cn('h-16 w-16 shrink-0 rounded-full', pulse)} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={cn('h-5 w-32 rounded', pulse)} />
          <div className={cn('h-4 w-40 rounded', pulse)} />
          <div className={cn('h-3 w-48 rounded', pulse)} />
        </div>
      </div>
      <section>
        <LabelSkeleton width="w-24" />
        <SettingsCard>
          <FactRowSkeleton value="w-24" />
          <FactRowSkeleton value="w-32" />
          <FactRowSkeleton value="w-40" />
          <div className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-1.5">
            <div className={cn('h-4 w-48 rounded', pulse)} />
            <div className={cn('h-11 w-28 rounded-xl', pulse)} />
          </div>
          <SettingRowSkeleton title="w-36" />
        </SettingsCard>
      </section>
    </div>

    <section>
      <LabelSkeleton width="w-10" />
      <SettingsCard>
        <SettingRowSkeleton title="w-48" />
        <div className="px-4 py-2.5">
          <div className={cn('h-4 w-20 rounded', pulse)} />
          <div className={cn('mt-1.5 h-3 w-16 rounded', pulse)} />
          <div className={cn('mt-3 h-11 rounded-xl', pulse)} />
        </div>
        <SettingRowSkeleton title="w-32" />
      </SettingsCard>
    </section>

    <section>
      <LabelSkeleton width="w-12" />
      <SettingsCard>
        <SettingRowSkeleton title="w-44" withSwitch={false} />
        <SettingRowSkeleton title="w-36" withSwitch={false} />
      </SettingsCard>
    </section>

    <div className="border-line h-11 rounded-xl border bg-white" />
    <div className={cn('mx-auto h-3 w-64 rounded', pulse)} />
  </div>
);
