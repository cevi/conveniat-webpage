'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import type { HofDashboardOrder } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { SectionHeading } from '@/features/hof-dashboard/components/dashboard-ui';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/components/texts';
import { HOF_ORDER_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
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
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [item.id, item.quantity > 0 ? String(item.quantity) : '']),
    ),
  );
  const [powerConnection, setPowerConnection] = useState(order.powerConnection);
  const save = trpc.hofDashboard.updateMaterialOrder.useMutation({
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
      toast.error(
        translate(error.message === 'order_closed' ? 'orderClosed' : 'saveFailed', locale),
      );
    },
  });

  const daysLeft = order.deadline === undefined ? undefined : daysUntil(order.deadline, new Date());
  const closed = daysLeft !== undefined && daysLeft < 0 && !canPassDeadline;

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    save.mutate({
      hofId,
      orderType: order.type,
      quantities: order.items.map((item) => ({
        itemId: item.id,
        quantity: Math.max(0, Number.parseInt(quantities[item.id] ?? '', 10) || 0),
      })),
      powerConnection,
    });
  };

  return (
    <Card className="border border-gray-100" contentClassName="space-y-4 p-5 @xl:p-6">
      <div className="space-y-1">
        <SectionHeading area={order.type === 'infrastructure' ? 'infrastructure' : 'program'}>
          {HOF_ORDER_TYPE_LABELS[order.type][locale]}
        </SectionHeading>
        {order.deadline !== undefined && daysLeft !== undefined && (
          <p className="text-sm text-gray-500">
            {translate('orderableUntil', locale, { date: formatDate(order.deadline, locale) })}
            {daysLeft >= 0 && ` · ${formatCountdown(daysLeft, locale)}`}
          </p>
        )}
      </div>

      {closed && (
        <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {translate('orderClosed', locale)}
        </p>
      )}

      {order.items.length === 0 ? (
        <p className="text-sm text-gray-500">{translate('orderEmpty', locale)}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
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
                        className="focus:border-conveniat-green focus:ring-conveniat-green/20 w-24 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-right tabular-nums focus:ring-2 focus:outline-hidden disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>

          {order.retiredItems.length > 0 && (
            <div className="space-y-1 text-sm text-gray-500">
              <p className="text-xs font-semibold tracking-wider uppercase">
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
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={powerConnection}
                disabled={closed}
                onChange={(event) => setPowerConnection(event.target.checked)}
                className="accent-conveniat-green h-4 w-4"
              />
              {translate('powerConnection', locale)}
            </label>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {order.updatedAt !== undefined &&
                translate('lastSaved', locale, { date: formatDate(order.updatedAt, locale) })}
            </p>
            {!closed && (
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {translate(save.isPending ? 'saving' : 'save', locale)}
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
};
