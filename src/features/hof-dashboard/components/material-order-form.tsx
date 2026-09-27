'use client';

import type { HofDashboardOrder } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  Panel,
  PRIMARY_BUTTON_CLASS,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { HOF_ORDER_MAX_QUANTITY, HOF_ORDER_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import {
  formatDate,
  formatNumber,
  formatTimeLeft,
  translate,
} from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import {
  followsStoredOrder,
  type OrderValues,
  sameOrder,
  toQuantity,
} from '@/features/hof-dashboard/utils/order-form-state';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';
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

const initialQuantities = (order: HofDashboardOrder): Record<string, string> =>
  Object.fromEntries(
    order.items.map((item) => [item.id, item.quantity > 0 ? String(item.quantity) : '']),
  );

const storedValues = (order: HofDashboardOrder): OrderValues => ({
  quantities: Object.fromEntries(order.items.map((item) => [item.id, item.quantity])),
  powerConnection: order.powerConnection,
});

/**
 * One material order: a quantity per material, and for Stadtleben whether power is needed.
 * Editable until the order's deadline; the reviewers can still change it after.
 */
export const MaterialOrderForm: React.FC<{
  hofId: string;
  order: HofDashboardOrder;
  /** The reviewers may still change an order after its deadline. */
  isReviewer: boolean;
  locale: Locale;
}> = ({ hofId, order, isReviewer, locale }) => {
  const utils = trpc.useUtils();
  // unique per form, since both orders of a Hof are on the page
  const id = useId();
  const [quantities, setQuantities] = useState(() => initialQuantities(order));
  const [powerConnection, setPowerConnection] = useState(order.powerConnection);
  const [refused, setRefused] = useState(false);
  const shown: OrderValues = {
    quantities: Object.fromEntries(
      order.items.map((item) => [item.id, toQuantity(quantities[item.id])]),
    ),
    powerConnection,
  };
  // A newly stored order, e.g. a reviewer's correction, replaces what the form shows unless
  // the Hof typed something since. Adjusted while rendering, so the form is never remounted
  // and nothing flashes as unsaved in between.
  const [taken, setTaken] = useState(() => ({
    savedAt: order.savedAt,
    values: storedValues(order),
  }));
  if (order.savedAt !== taken.savedAt) {
    const stored = storedValues(order);
    if (followsStoredOrder(shown, taken.values, stored)) {
      setQuantities(initialQuantities(order));
      setPowerConnection(order.powerConnection);
    }
    setTaken({ savedAt: order.savedAt, values: stored });
  }
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
  const closed = daysLeft !== undefined && daysLeft < 0 && !isReviewer;
  const dirty = !sameOrder(shown, storedValues(order));
  useWarnBeforeLeaving(dirty);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (save.isPending || !dirty) return;
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
            {formatTimeLeft(daysLeft, locale)}
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
                        <label htmlFor={`${id}-${item.id}`}>{item.name}</label>
                      </td>
                      <td className="py-1.5 text-right">
                        <input
                          id={`${id}-${item.id}`}
                          // text, not number: a number field reports "2." as empty and takes
                          // "2.5" or "-4", which would then be corrected without a word
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-describedby={`${id}-hint`}
                          autoComplete="off"
                          placeholder="0"
                          disabled={closed}
                          value={quantities[item.id] ?? ''}
                          onChange={(event) => {
                            const typed = event.target.value;
                            // only whole numbers up to the most that can be ordered get in
                            if (!/^\d*$/.test(typed) || Number(typed) > HOF_ORDER_MAX_QUANTITY) {
                              // the key does nothing, so the rule below says why
                              setRefused(true);
                              return;
                            }
                            setRefused(false);
                            setQuantities((previous) => ({ ...previous, [item.id]: typed }));
                          }}
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
          {order.items.length > 0 && (
            <p
              id={`${id}-hint`}
              className={cn('text-xs', refused ? 'font-semibold text-amber-800' : 'text-gray-500')}
            >
              {translate('quantityHint', locale, {
                n: formatNumber(HOF_ORDER_MAX_QUANTITY, locale),
              })}
            </p>
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
                {dirty && translate('unsavedChanges', locale)}
                {!dirty &&
                  order.savedAt !== undefined &&
                  translate('lastSaved', locale, { date: formatDate(order.savedAt, locale) })}
              </p>
              <button
                type="submit"
                // aria-disabled, not disabled: a disabled button drops the focus to the page
                aria-disabled={save.isPending || !dirty}
                className={cn(
                  PRIMARY_BUTTON_CLASS,
                  'w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50 @lg:w-auto',
                )}
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
