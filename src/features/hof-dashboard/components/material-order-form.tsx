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
  type OrderValues,
  parseQuantity,
  sameOrder,
} from '@/features/hof-dashboard/utils/order-form-state';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { Fragment, useId, useState } from 'react';
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
  // Only what the Hof typed is kept here, over the stored order: a field it has not touched
  // shows what is stored, so a reviewer's correction arrives by itself, and nothing typed is
  // lost to one.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [powerEdit, setPowerEdit] = useState<boolean>();
  const save = trpc.hofDashboard.updateMaterialOrder.useMutation({
    // fail right away without signal instead of waiting paused for it
    networkMode: 'always',
    onSuccess: async () => {
      toast.success(translate('saved', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
      // Typed values give way once the reloaded order holds them; if the reload did not get
      // through, they stay, rather than the order from before the save showing as if unsaved.
      const reloaded = utils.hofDashboard.getHofDashboard.getData({ hofId })?.orders[order.type];
      if (reloaded === undefined) return;
      const stored = storedValues(reloaded);
      setEdits((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([itemId, typed]) => parseQuantity(typed) !== (stored.quantities[itemId] ?? 0),
          ),
        ),
      );
      setPowerEdit((current) => (current === stored.powerConnection ? undefined : current));
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
  const quantityText = (item: HofDashboardOrder['items'][number]): string =>
    edits[item.id] ?? (item.quantity > 0 ? String(item.quantity) : '');
  const powerConnection = powerEdit ?? order.powerConnection;
  const shown: OrderValues = {
    quantities: Object.fromEntries(
      // an invalid quantity stands in as the stored one; `invalid` below holds the save back
      order.items.map((item) => [item.id, parseQuantity(quantityText(item)) ?? item.quantity]),
    ),
    powerConnection,
  };
  // what is typed stays as typed; a quantity that is not a whole number within the limit is
  // marked and holds the save back, rather than being read as some other number
  const invalid = new Set(
    order.items
      .filter((item) => {
        const typed = edits[item.id];
        return typed !== undefined && parseQuantity(typed) === undefined;
      })
      .map((item) => item.id),
  );
  // an invalid quantity is unsaved work too, so leaving warns about it
  const dirty = invalid.size > 0 || !sameOrder(shown, storedValues(order));
  const hint = translate('quantityHint', locale, {
    n: formatNumber(HOF_ORDER_MAX_QUANTITY, locale),
  });
  useWarnBeforeLeaving(dirty);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const firstInvalid = order.items.find((item) => invalid.has(item.id));
    if (firstInvalid !== undefined) {
      // the save waits for it; taking the Hof there says why
      document
        .querySelector<HTMLInputElement>(`#${CSS.escape(`${id}-${firstInvalid.id}`)}`)
        ?.focus();
      return;
    }
    if (save.isPending || !dirty) return;
    save.mutate({
      hofId,
      orderType: order.type,
      // only what the Hof changed, so a reviewer's correction saved meanwhile is not undone
      changes: order.items
        .filter((item) => shown.quantities[item.id] !== item.quantity)
        .map((item) => ({ itemId: item.id, quantity: shown.quantities[item.id] ?? 0 })),
      ...(powerEdit === undefined ? {} : { powerConnection: powerEdit }),
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
                    <Fragment key={item.id}>
                      {/* no divider under an invalid field: its rule follows right below */}
                      <tr className={cn(invalid.has(item.id) && 'border-b-0')}>
                        <td className="py-2 pr-3 text-gray-900">
                          <label htmlFor={`${id}-${item.id}`}>{item.name}</label>
                        </td>
                        <td className="py-1.5 text-right">
                          <input
                            id={`${id}-${item.id}`}
                            // text, not number: a number field reports "2." as empty and
                            // would read "2.5" as some other number without a word
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            aria-invalid={invalid.has(item.id)}
                            aria-describedby={
                              invalid.has(item.id) ? `${id}-${item.id}-hint` : `${id}-hint`
                            }
                            autoComplete="off"
                            placeholder="0"
                            disabled={closed}
                            value={quantityText(item)}
                            onChange={(event) => {
                              const typed = event.target.value.trim();
                              setEdits((previous) => ({ ...previous, [item.id]: typed }));
                            }}
                            // once the Hof moves on, "007" reads as 7, and a quantity back at
                            // what is stored is no edit any more, so a later correction shows
                            onBlur={() => {
                              const typed = edits[item.id];
                              if (typed === undefined || invalid.has(item.id)) return;
                              const quantity = parseQuantity(typed) ?? 0;
                              setEdits((previous) => {
                                const rest = Object.fromEntries(
                                  Object.entries(previous).filter(([other]) => other !== item.id),
                                );
                                return quantity === item.quantity
                                  ? rest
                                  : { ...rest, [item.id]: quantity > 0 ? String(quantity) : '' };
                              });
                            }}
                            className="focus:ring-conveniat-green h-11 w-24 rounded-md border-0 bg-green-100 px-3 text-right text-base text-gray-700 tabular-nums ring-1 ring-transparent transition ring-inset focus:bg-white focus:ring-2 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 aria-invalid:bg-white aria-invalid:ring-2 aria-invalid:ring-amber-700"
                          />
                        </td>
                      </tr>
                      {invalid.has(item.id) && (
                        <tr>
                          <td
                            id={`${id}-${item.id}-hint`}
                            colSpan={2}
                            className="pb-2 text-right text-xs font-semibold text-amber-800"
                          >
                            {hint}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              ))}
            </table>
          )}
          {/* while a field says it right below itself, not twice */}
          {order.items.length > 0 && invalid.size === 0 && (
            <p id={`${id}-hint`} className="text-xs text-gray-500">
              {hint}
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
                onChange={(event) => {
                  const checked = event.target.checked;
                  // back at what is stored is no edit, so a later correction shows
                  setPowerEdit(checked === order.powerConnection ? undefined : checked);
                }}
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
                aria-disabled={save.isPending || !dirty || invalid.size > 0}
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
