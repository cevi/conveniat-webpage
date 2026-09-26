'use client';

import { labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { LoadingState } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { type MaterialRole, useRoleRoute } from '@/features/material/hooks/use-material-role';
import type React from 'react';

/**
 * Renders a screen only for its role and sends the other role to `elsewhere`. Without an answer
 * about the role, for example offline and nothing cached, it says why instead of loading forever.
 */
export const RoleGate: React.FC<{
  role: MaterialRole;
  elsewhere: string;
  children: React.ReactNode;
}> = ({ role, elsewhere, children }) => {
  const locale = useMaterialLocale();
  const { allowed, error } = useRoleRoute(role, elsewhere);
  if (error !== undefined) return <MaterialQueryError error={error} />;
  if (!allowed) return <LoadingState text={labels.loading[locale]} />;
  return children;
};
