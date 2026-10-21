import { cn } from '@/utils/tailwindcss-override';
import { Info, TriangleAlert } from 'lucide-react';
import type React from 'react';

/**
 * One onboarding step: a picture, the question as the page heading, one sentence on why it is
 * asked, any status below, and the answers at the bottom of the screen.
 */
export const OnboardingStepScreen: React.FC<{
  visual: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ visual, title, description, children, actions }) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      {visual}
      <h1 className="font-heading text-heading mt-5 text-[28px] leading-tight font-extrabold text-balance">
        {title}
      </h1>
      {description !== undefined && (
        <div className="mt-2 max-w-xs text-[15px] leading-normal text-balance text-green-700">
          {description}
        </div>
      )}
      {children !== undefined && <div className="mt-6 w-full">{children}</div>}
    </div>
    {actions !== undefined && <div className="flex flex-col gap-3">{actions}</div>}
  </div>
);

/**
 * A short status line inside a step. `warning` is for something the user has to fix (blocked
 * notifications), in the orange of the app; everything else stays neutral, red is for Notfall.
 */
export const OnboardingNotice: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'warning';
  role?: 'alert' | 'status';
}> = ({ children, tone = 'neutral', role }) => {
  const Icon = tone === 'warning' ? TriangleAlert : Info;
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-[14px] p-3 text-left text-[15px] leading-normal',
        tone === 'warning'
          ? 'bg-live-soft text-live-text border-live-line border'
          : 'bg-quiet text-green-900',
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-balance">{children}</span>
    </div>
  );
};
