'use client';

import type { HofDashboardOrder } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  Panel,
  PRIMARY_BUTTON_CLASS,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { HOF_ORDER_MAX_QUANTITY, HOF_ORDER_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

/** The material list, split under its section headings in the order the settings give them. */
const groupBySection = (
  items: HofDashboardOrder['items'],
): { section: string | undefined; items: HofDashboardOrder['items'] }[] =>
  items.reduce<{ section: string | undefined; items: HofDashboardOrder['items'] }[]>(
    (groups, item) => {
      const last = groups.at(-1);
      if (last !== undefined && last.section === item.section) last.items.push(item);
      else groups.push({ section: item.section, items: [item] });
      return groups;
    },
    [],
  );

/** A typed quantity as a whole number within what can be ordered; anything else counts as none. */
const toQuantity = (value: string | undefined): number => {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, HOF_ORDER_MAX_QUANTITY) : 0;
};

const initialQuantities = (order: HofDashboardOrder): Record<string, string> =>
  Object.fromEntries(
    order.items.map((item) => [item.id, item.quantity > 0 ? String(item.quantity) : '']),
  );

/**
 * One material order: a quantity per material, and for Stadtleben whether power is needed.
 * Editable until the order's deadline; the reviewers can still change it after.
 */
export const MaterialOrderForm: React.FC<{
  hofId: string;
  order: HofDashboardOrder;
  /** The reviewers may still change an order after its deadline. */
  canPassDeadline: boolean;
  locale: Locale;
}> = ({ hofId, order, canPassDeadline, locale }) => {
  const utils = trpc.useUtils();
  const [quantities, setQuantities] = useState(() => initialQuantities(order));
  const [powerConnection, setPowerConnection] = useState(order.powerConnection);
  const save = trpc.hofDashboard.updateMaterialOrder.useMutation({
    // fail right away without signal instead of waiting paused for it
    networkMode: 'always',
    onSuccess: async () => {
      toast.success(translate('saved', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
    },
    onError: (error) => {
      if (error.message === 'order_list_changed') {
        toast.error(translate('orderListChanged', locale));
        void utils.hofDashboard.getHofDashboard.invalidate({ hofId });
        return;
      }
      notifyFailure(locale, error.message === 'order_closed' ? 'orderClosed' : 'saveFailed');
    },
  });

  const daysLeft = order.deadline === undefined ? undefined : daysUntil(order.deadline, new Date());
  const closed = daysLeft !== undefined && daysLeft < 0 && !canPassDeadline;
  const dirty =
    powerConnection !== order.powerConnection ||
    order.items.some((item) => toQuantity(quantities[item.id]) !== item.quantity);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    save.mutate({
      hofId,
      orderType: order.type,
      quantities: order.items.map((item) => ({
        itemId: item.id,
        quantity: toQuantity(quantities[item.id]),
      })),
      powerConnection,
    });
  };

  return (
    <Panel className="space-y-4">
      <div className="space-y-1">
        <SectionHeading area={order.type === 'infrastructure' ? 'infrastructure' : 'program'}>
          {HOF_ORDER_TYPE_LABELS[order.type][locale]}
        </SectionHeading>
        {order.deadline !== undefined && daysLeft !== undefined && (
          <p className="text-sm text-gray-600">
            {translate('orderableUntil', locale, { date: formatDate(order.deadline, locale) })}
            {' · '}
            {daysLeft >= 0
              ? formatCountdown(daysLeft, locale)
              : translate('deadlinePassed', locale)}
          </p>
        )}
      </div>

      {closed && (
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {translate('orderClosed', locale)}
        </p>
      )}

      {/* a Stadtleben order still asks for power when the list has no material yet */}
      {order.items.length === 0 && order.type !== 'stadtleben' ? (
        <p className="text-sm text-gray-500">{translate('orderEmpty', locale)}</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {order.items.length === 0 && (
            <p className="text-sm text-gray-500">{translate('orderEmpty', locale)}</p>
          )}
          {order.items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  <th className="py-2 font-semibold">{translate('material', locale)}</th>
                  <th className="w-28 py-2 text-right font-semibold">
                    {translate('quantity', locale)}
                  </th>
                </tr>
              </thead>
              {groupBySection(order.items).map((group, index) => (
                <tbody key={group.section ?? `group-${index}`} className="divide-y divide-gray-100">
                  {group.section !== undefined && (
                    <tr>
                      <th
                        colSpan={2}
                        className="pt-4 pb-1 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                      >
                        {group.section}
                      </th>
                    </tr>
                  )}
                  {group.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 text-gray-900">
                        <label htmlFor={`order-${order.type}-${item.id}`}>{item.name}</label>
                      </td>
                      <td className="py-1.5 text-right">
                        <input
                          id={`order-${order.type}-${item.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={HOF_ORDER_MAX_QUANTITY}
                          step={1}
                          placeholder="0"
                          disabled={closed}
                          value={quantities[item.id] ?? ''}
                          onChange={(event) =>
                            setQuantities((previous) => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }))
                          }
                          onBlur={(event) =>
                            setQuantities((previous) => {
                              const quantity = toQuantity(event.target.value);
                              return {
                                ...previous,
                                [item.id]: quantity > 0 ? String(quantity) : '',
                              };
                            })
                          }
                          className="focus:ring-conveniat-green h-11 w-24 rounded-md border-0 bg-green-100 px-3 text-right text-base text-gray-700 tabular-nums ring-1 ring-transparent transition ring-inset focus:bg-white focus:ring-2 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}

          {order.retiredItems.length > 0 && (
            <div className="space-y-1 text-sm text-gray-600">
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {translate('retiredItems', locale)}
              </p>
              <ul>
                {order.retiredItems.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.type === 'stadtleben' && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={powerConnection}
                disabled={closed}
                onChange={(event) => setPowerConnection(event.target.checked)}
                className="accent-conveniat-green h-5 w-5"
              />
              {translate('powerConnection', locale)}
            </label>
          )}

          {!closed && (
            <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
              <p
                className={cn('text-xs', dirty ? 'font-semibold text-amber-700' : 'text-gray-500')}
              >
                {dirty
                  ? translate('unsavedChanges', locale)
                  : order.updatedAt !== undefined &&
                    translate('lastSaved', locale, { date: formatDate(order.updatedAt, locale) })}
              </p>
              <button
                type="submit"
                className={cn(PRIMARY_BUTTON_CLASS, 'w-full @lg:w-auto')}
                disabled={save.isPending || !dirty}
              >
                {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {translate(save.isPending ? 'saving' : 'save', locale)}
              </button>
            </div>
          )}
        </form>
      )}
    </Panel>
  );
};
