'use client';

import {
  AssigneeToggle,
  DepartmentSelect,
  PersonPicker,
  type Assignee,
  type PickedPerson,
} from '@/features/material/components/loan-assignee-fields';
import { format, labels } from '@/features/material/components/material-labels';
import {
  Field,
  inputClass,
  MaterialButton,
  MaterialSheet,
  NumberInput,
} from '@/features/material/components/material-ui';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  type MaterialItem,
} from '@/features/material/hooks/use-material';
import { defaultPeriod, fromDateInput, toDateInput } from '@/features/material/utils/dates';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Minus, Plus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  titleRequest: {
    de: '{name} reservieren',
    en: 'Reserve {name}',
    fr: 'Réserver {name}',
  },
  descriptionRequest: {
    de: 'Das Materialteam bestätigt deine Anfrage.',
    en: 'The material team will confirm your request.',
    fr: 'L’équipe matériel confirmera ta demande.',
  },
  descriptionTeam: {
    de: 'Als Materialteam wird die Reservation direkt bestätigt.',
    en: 'As material team, the reservation is confirmed right away.',
    fr: 'En tant qu’équipe matériel, la réservation est confirmée directement.',
  },
  availableForPeriod: {
    de: '{n} {unit} für diesen Zeitraum verfügbar, höchstens {max} pro Ausleihe.',
    en: '{n} {unit} available for this period, at most {max} per loan.',
    fr: '{n} {unit} disponibles pour cette période, au maximum {max} par prêt.',
  },
  consumption: {
    de: 'Wird verbraucht, keine Rückgabe',
    en: 'Used up, no return',
    fr: 'Consommé, pas de retour',
  },
  issueNow: {
    de: 'Sofort ausgeben (Material ist am Schalter)',
    en: 'Hand out now (material is at the counter)',
    fr: 'Remettre tout de suite (au guichet)',
  },
  submitRequest: { de: 'Anfrage senden', en: 'Send request', fr: 'Envoyer la demande' },
  submitTeam: { de: 'Reservation erfassen', en: 'Book reservation', fr: 'Enregistrer' },
  submitIssue: { de: 'Ausgeben', en: 'Hand out', fr: 'Remettre' },
  success: {
    de: 'Ausleihe #{n} erfasst.',
    en: 'Loan #{n} booked.',
    fr: 'Prêt n° {n} enregistré.',
  },
  fillIn: {
    de: 'Bitte Abteilung, Zeitraum und Menge angeben.',
    en: 'Please fill in department, period and quantity.',
    fr: 'Merci d’indiquer groupe, période et quantité.',
  },
} satisfies Record<string, StaticTranslationString>;

/**
 * The request form: how many, when, and for whom. It asks the server what is free for the
 * chosen days and never lets the quantity go past it; the server checks again on submit.
 */
export const LoanRequestDialog: React.FC<{
  item: MaterialItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMaterialTeam: boolean;
}> = ({ item, open, onOpenChange, isMaterialTeam }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const me = trpc.material.getMe.useQuery(undefined, { ...materialQueryOptions, enabled: open });

  const [quantity, setQuantity] = useState(1);
  const [period, setPeriod] = useState(defaultPeriod);
  const [assignee, setAssignee] = useState<Assignee>('DEPARTMENT');
  // `undefined` until the reader picks something, so their own department and name can fill in
  const [pickedDepartmentId, setPickedDepartmentId] = useState<string | undefined>();
  const [person, setPerson] = useState<PickedPerson | undefined>();
  const [typedResponsibleName, setTypedResponsibleName] = useState<string | undefined>();
  const [comment, setComment] = useState('');
  const [isConsumption, setIsConsumption] = useState(item.isConsumable);
  const [issueNow, setIssueNow] = useState(false);

  const departmentId = pickedDepartmentId ?? me.data?.departments[0]?.id ?? '';
  const responsibleName = typedResponsibleName ?? me.data?.name ?? '';

  const startDate = fromDateInput(period.start, 'start');
  const endDate = fromDateInput(period.end, 'end');
  const periodReversed = startDate !== undefined && endDate !== undefined && endDate < startDate;
  const periodValid = startDate !== undefined && endDate !== undefined && !periodReversed;

  const availability = trpc.material.getAvailability.useQuery(
    { itemId: item.id, startDate: startDate ?? new Date(), endDate: endDate ?? new Date() },
    { ...materialQueryOptions, refetchOnMount: 'always', enabled: open && periodValid },
  );

  const limit = Math.min(availability.data?.available ?? 0, item.maxLoanQuantity);
  // until the server answered, typing is only held to the per-loan maximum
  const inputMax = availability.data === undefined ? item.maxLoanQuantity : Math.max(limit, 1);
  const createLoan = trpc.material.createLoan.useMutation();

  const submit = (): void => {
    if (!periodValid || departmentId === '' || quantity < 1) {
      toast.error(text.fillIn[locale]);
      return;
    }
    createLoan.mutate(
      {
        itemId: item.id,
        quantity,
        startDate,
        endDate,
        departmentId,
        // eslint-disable-next-line unicorn/no-null
        personId: assignee === 'PERSON' ? (person?.uuid ?? null) : null,
        responsibleName:
          assignee === 'PERSON' && person !== undefined ? person.name : responsibleName,
        ...(comment.trim() === '' ? {} : { comment }),
        isConsumption: item.isConsumable && isConsumption,
        issueNow: isMaterialTeam && issueNow,
      },
      {
        onSuccess: (loan) => {
          toast.success(format(text.success, locale, { n: loan.number }));
          // closed first, so the button is gone before it could be tapped a second time
          onOpenChange(false);
          void invalidate();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  let quantityHint = labels.loading[locale];
  if (periodReversed) quantityHint = labels.periodInvalid[locale];
  else if (availability.data !== undefined) {
    quantityHint = format(text.availableForPeriod, locale, {
      n: availability.data.available,
      unit: item.unit,
      max: item.maxLoanQuantity,
    });
  }

  let submitLabel = text.submitRequest[locale];
  if (isMaterialTeam) submitLabel = issueNow ? text.submitIssue[locale] : text.submitTeam[locale];

  return (
    <MaterialSheet
      open={open}
      onOpenChange={onOpenChange}
      title={format(text.titleRequest, locale, { name: item.name })}
      description={isMaterialTeam ? text.descriptionTeam[locale] : text.descriptionRequest[locale]}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={labels.startDate[locale]}>
          <input
            type="date"
            className={inputClass}
            value={period.start}
            min={toDateInput(new Date())}
            onChange={(event) => setPeriod((p) => ({ ...p, start: event.target.value }))}
          />
        </Field>
        <Field label={labels.endDate[locale]}>
          <input
            type="date"
            className={inputClass}
            value={period.end}
            min={period.start}
            onChange={(event) => setPeriod((p) => ({ ...p, end: event.target.value }))}
          />
        </Field>
      </div>

      <Field as="group" label={labels.quantity[locale]} hint={quantityHint}>
        <div className="flex items-center gap-2">
          <MaterialButton
            variant="secondary"
            aria-label="-1"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus aria-hidden />
          </MaterialButton>
          <NumberInput
            aria-label={labels.quantity[locale]}
            min={1}
            max={inputMax}
            className="text-center text-lg font-bold tabular-nums"
            value={quantity}
            onChange={setQuantity}
          />
          <MaterialButton
            variant="secondary"
            aria-label="+1"
            onClick={() => setQuantity((q) => Math.min(inputMax, q + 1))}
          >
            <Plus aria-hidden />
          </MaterialButton>
        </div>
      </Field>

      <AssigneeToggle value={assignee} onChange={setAssignee} />

      <DepartmentSelect value={departmentId} onChange={setPickedDepartmentId} />

      {assignee === 'PERSON' ? (
        <PersonPicker value={person} onChange={setPerson} />
      ) : (
        <Field label={labels.responsible[locale]}>
          <input
            className={inputClass}
            value={responsibleName}
            onChange={(event) => setTypedResponsibleName(event.target.value)}
          />
        </Field>
      )}

      <Field label={`${labels.comment[locale]} (${labels.optional[locale]})`}>
        <textarea
          className={cn(inputClass, 'h-20 py-2')}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </Field>

      {item.isConsumable && (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[#47564c]"
            checked={isConsumption}
            onChange={(event) => setIsConsumption(event.target.checked)}
          />
          {text.consumption[locale]}
        </label>
      )}
      {isMaterialTeam && (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[#47564c]"
            checked={issueNow}
            onChange={(event) => setIssueNow(event.target.checked)}
          />
          {text.issueNow[locale]}
        </label>
      )}

      <MaterialButton
        className="w-full"
        loading={createLoan.isPending}
        disabled={
          !periodValid ||
          departmentId === '' ||
          quantity > limit ||
          (assignee === 'PERSON' && person === undefined)
        }
        onClick={submit}
      >
        {submitLabel} · {quantity} {item.unit}
      </MaterialButton>
    </MaterialSheet>
  );
};
