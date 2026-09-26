'use client';

import { IncidentPhotoField } from '@/features/material/components/incident-photo-field';
import {
  AssigneeToggle,
  DepartmentSelect,
  PersonPicker,
  type Assignee,
  type PickedPerson,
} from '@/features/material/components/loan-assignee-fields';
import { loanQuantity } from '@/features/material/components/loan-card';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import {
  conditionLabel,
  format,
  formatDateTime,
  formatDay,
  labels,
} from '@/features/material/components/material-labels';
import { MaterialQrCode } from '@/features/material/components/material-qr-code';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import {
  Field,
  inputClass,
  MaterialButton,
  MaterialSheet,
  NumberInput,
} from '@/features/material/components/material-ui';
import { useIncidentPhotoUpload } from '@/features/material/hooks/use-incident-photo-upload';
import {
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { fromDateInput, toDateInput } from '@/features/material/utils/dates';
import { isReturnValid } from '@/features/material/utils/returns';
import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import type { MaterialCondition } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  Check,
  CornerDownLeft,
  PackageCheck,
  PackageOpen,
  Pencil,
  QrCode,
  X,
} from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

const text = {
  confirm: { de: 'Bestätigen', en: 'Confirm', fr: 'Confirmer' },
  issue: { de: 'Ausgeben', en: 'Hand out', fr: 'Remettre' },
  recordReturn: labels.recordReturn,
  announceReturn: {
    de: 'Rückgabe melden',
    en: 'Announce return',
    fr: 'Annoncer le retour',
  },
  edit: {
    de: 'Reservation bearbeiten',
    en: 'Edit reservation',
    fr: 'Modifier la réservation',
  },
  returnInvalid: {
    de: '«Fehlt» braucht fehlende Stücke, ein Schaden zurückgegebene; beschädigt höchstens so viele wie zurück sind.',
    en: '“Missing” needs pieces that did not come back, a damage needs returned ones; no more damaged than returned.',
    fr: '« Manquant » demande des pièces non rendues, un dégât des pièces rendues ; pas plus d’endommagées que de rendues.',
  },
  extend: {
    de: 'Rückgabedatum ändern',
    en: 'Change return date',
    fr: 'Modifier la date de retour',
  },
  cancelLoan: { de: 'Stornieren', en: 'Cancel booking', fr: 'Annuler la réservation' },
  cancelConfirm: {
    de: 'Diese Reservation wirklich stornieren?',
    en: 'Really cancel this reservation?',
    fr: 'Vraiment annuler cette réservation ?',
  },
  reportDamage: { de: 'Schaden melden', en: 'Report damage', fr: 'Signaler un dégât' },
  showQr: { de: 'QR-Code', en: 'QR code', fr: 'Code QR' },
  issuedQuantity: {
    de: 'Ausgegebene Menge',
    en: 'Quantity handed out',
    fr: 'Quantité remise',
  },
  issueCheck: {
    de: 'Menge und Zustand beim Ausgeben kontrollieren.',
    en: 'Check quantity and condition when handing out.',
    fr: 'Contrôler quantité et état à la remise.',
  },
  plannedQuantity: { de: 'Geplante Menge', en: 'Planned quantity', fr: 'Quantité prévue' },
  returnedQuantity: {
    de: 'Tatsächlich zurückgegeben',
    en: 'Actually returned',
    fr: 'Effectivement rendu',
  },
  condition: { de: 'Zustand', en: 'Condition', fr: 'État' },
  damagedQuantity: {
    de: 'Davon beschädigt',
    en: 'Of which damaged',
    fr: 'Dont endommagés',
  },
  note: { de: 'Bemerkung', en: 'Note', fr: 'Remarque' },
  missingHint: {
    de: '{n} fehlen und werden aus dem Bestand ausgebucht.',
    en: '{n} missing, they will be written off.',
    fr: '{n} manquent et seront sortis du stock.',
  },
  consumedHint: {
    de: '{n} wurden verbraucht.',
    en: '{n} were used up.',
    fr: '{n} ont été consommés.',
  },
  announced: {
    de: 'Rückgabe gemeldet am {at}',
    en: 'Return announced on {at}',
    fr: 'Retour annoncé le {at}',
  },
  issuedAt: { de: 'Ausgegeben am {at}', en: 'Handed out on {at}', fr: 'Remis le {at}' },
  returnedAt: { de: 'Zurück am {at}', en: 'Returned on {at}', fr: 'Rendu le {at}' },
  consumption: {
    de: 'Verbrauch, keine Rückgabe',
    en: 'Used up, no return',
    fr: 'Consommation, pas de retour',
  },
  incidents: { de: 'Meldungen', en: 'Reports', fr: 'Signalements' },
  whatHappened: {
    de: 'Was ist passiert?',
    en: 'What happened?',
    fr: 'Que s’est-il passé ?',
  },
  reported: {
    de: 'Meldung an das Materialteam gesendet.',
    en: 'Report sent to the material team.',
    fr: 'Signalement envoyé à l’équipe matériel.',
  },
  createdBy: { de: 'Erfasst von {name}', en: 'Booked by {name}', fr: 'Saisi par {name}' },
} satisfies Record<string, StaticTranslationString>;

export type LoanDialogMode = 'view' | 'issue' | 'return' | 'edit' | 'incident' | 'qr';
type Mode = LoanDialogMode;

const showError = (error: { message: string }): void => {
  toast.error(error.message);
};

const CONDITIONS: MaterialCondition[] = ['OK', 'LIGHT_DAMAGE', 'DAMAGED', 'MISSING'];
const INCIDENT_CONDITIONS = ['LIGHT_DAMAGE', 'DAMAGED', 'MISSING'] as const;

const conditionClass: Record<MaterialCondition, string> = {
  OK: 'peer-checked:border-green-600 peer-checked:bg-green-50',
  LIGHT_DAMAGE: 'peer-checked:border-amber-500 peer-checked:bg-amber-50',
  DAMAGED: 'peer-checked:border-red-600 peer-checked:bg-red-50',
  MISSING: 'peer-checked:border-gray-700 peer-checked:bg-gray-100',
};

const ConditionPicker: React.FC<{
  value: MaterialCondition;
  options: readonly MaterialCondition[];
  onChange: (value: MaterialCondition) => void;
  locale: Locale;
}> = ({ value, options, onChange, locale }) => {
  // one name, so the browser and screen readers treat the options as one choice
  const name = useId();
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {options.map((option) => (
        <label key={option} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            className="peer sr-only"
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span
            className={cn(
              'flex min-h-11 items-center rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 peer-focus-visible:ring-2 peer-focus-visible:ring-gray-400',
              conditionClass[option],
            )}
          >
            {conditionLabel[option][locale]}
          </span>
        </label>
      ))}
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  hint?: string;
}> = ({ label, value, max, min = 0, onChange, hint }) => (
  <Field label={label} {...(hint === undefined ? {} : { hint })}>
    <NumberInput
      min={min}
      max={max}
      className="text-lg font-bold tabular-nums"
      value={value}
      onChange={onChange}
    />
  </Field>
);

/** Hand-out at the counter: the material team confirms how many actually leave. */
const IssueForm: React.FC<{ loan: MaterialLoan; onDone: () => void; locale: Locale }> = ({
  loan,
  onDone,
  locale,
}) => {
  const [quantity, setQuantity] = useState(loan.quantity);
  const issue = trpc.material.issueLoan.useMutation();
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{text.issueCheck[locale]}</p>
      <NumberField
        label={text.issuedQuantity[locale]}
        value={quantity}
        min={1}
        max={loan.quantity}
        onChange={setQuantity}
      />
      <MaterialButton
        className="w-full"
        loading={issue.isPending}
        onClick={() =>
          issue.mutate(
            { id: loan.id, issuedQuantity: quantity },
            { onSuccess: onDone, onError: showError },
          )
        }
      >
        <PackageOpen aria-hidden />
        {text.issue[locale]} · {quantity} {loan.item.unit}
      </MaterialButton>
    </div>
  );
};

/** Check-in: what came back, in which state, and a photo when something is wrong. */
const ReturnForm: React.FC<{ loan: MaterialLoan; onDone: () => void; locale: Locale }> = ({
  loan,
  onDone,
  locale,
}) => {
  const issued = loanQuantity(loan);
  const [returned, setReturned] = useState(issued);
  const [condition, setCondition] = useState<MaterialCondition>('OK');
  const [damaged, setDamaged] = useState(1);
  const [note, setNote] = useState('');
  const photo = useIncidentPhotoUpload();
  const returnLoan = trpc.material.returnLoan.useMutation();
  const missing = issued - returned;
  const valid = isReturnValid({ issued, returned, condition, damaged });

  const pickCondition = (next: MaterialCondition): void => {
    setCondition(next);
    // "missing" with everything back would record nothing at all
    if (next === 'MISSING') setReturned(0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field as="group" label={text.plannedQuantity[locale]}>
          <div className={cn(inputClass, 'flex items-center bg-gray-50 text-lg font-bold')}>
            {issued}
          </div>
        </Field>
        <NumberField
          label={text.returnedQuantity[locale]}
          value={returned}
          max={issued}
          onChange={setReturned}
        />
      </div>
      {missing > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {format(loan.item.isConsumable ? text.consumedHint : text.missingHint, locale, {
            n: missing,
          })}
        </p>
      )}
      <Field as="group" label={text.condition[locale]}>
        <ConditionPicker
          value={condition}
          options={CONDITIONS}
          onChange={pickCondition}
          locale={locale}
        />
      </Field>
      {condition === 'DAMAGED' && (
        <NumberField
          label={text.damagedQuantity[locale]}
          value={damaged}
          min={1}
          max={Math.max(returned, 1)}
          onChange={setDamaged}
        />
      )}
      {!valid && <p className="text-sm font-semibold text-red-700">{text.returnInvalid[locale]}</p>}
      <Field label={`${text.note[locale]} (${labels.optional[locale]})`}>
        <textarea
          className={cn(inputClass, 'h-20 py-2')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {condition !== 'OK' && <IncidentPhotoField upload={photo} />}
      <MaterialButton
        className="w-full"
        loading={returnLoan.isPending || photo.isUploading}
        disabled={!valid}
        onClick={() =>
          returnLoan.mutate(
            {
              id: loan.id,
              returnedQuantity: returned,
              condition,
              damagedQuantity: condition === 'DAMAGED' ? damaged : 0,
              ...(note.trim() === '' ? {} : { note }),
              ...(photo.photoKey === undefined ? {} : { photoKey: photo.photoKey }),
            },
            { onSuccess: onDone, onError: showError },
          )
        }
      >
        <PackageCheck aria-hidden />
        {text.recordReturn[locale]}
      </MaterialButton>
    </div>
  );
};

/**
 * Changes a booking: quantity, dates, whom it is booked on and the comment. Once the
 * material is out, only the return date can move.
 */
const EditForm: React.FC<{
  loan: MaterialLoan;
  onDone: () => void;
  locale: Locale;
  onlyEndDate: boolean;
}> = ({ loan, onDone, locale, onlyEndDate }) => {
  const [quantity, setQuantity] = useState(loan.quantity);
  const [start, setStart] = useState(toDateInput(loan.startDate));
  const [end, setEnd] = useState(toDateInput(loan.endDate));
  const [departmentId, setDepartmentId] = useState(loan.department.id);
  // a restored cache entry may lack the person field altogether
  const [assignee, setAssignee] = useState<Assignee>(loan.person ? 'PERSON' : 'DEPARTMENT');
  const [person, setPerson] = useState<PickedPerson | undefined>(loan.person ?? undefined);
  const [responsibleName, setResponsibleName] = useState(loan.responsibleName);
  const [comment, setComment] = useState(loan.comment ?? '');
  const update = trpc.material.updateLoan.useMutation();
  const startDate = fromDateInput(start, 'start');
  const endDate = fromDateInput(end, 'end');
  const periodReversed = startDate !== undefined && endDate !== undefined && endDate < startDate;
  const availability = trpc.material.getAvailability.useQuery(
    {
      itemId: loan.item.id,
      startDate: startDate ?? loan.startDate,
      endDate: endDate ?? loan.endDate,
      excludeLoanId: loan.id,
    },
    {
      ...materialQueryOptions,
      refetchOnMount: 'always',
      enabled: !onlyEndDate && startDate !== undefined && !periodReversed,
    },
  );
  const max = Math.min(availability.data?.available ?? loan.quantity, loan.item.maxLoanQuantity);
  const byPerson = assignee === 'PERSON';
  const assigneeMissing = byPerson ? person === undefined : responsibleName.trim() === '';

  const save = (): void => {
    if (onlyEndDate) {
      update.mutate({ id: loan.id, endDate }, { onSuccess: onDone, onError: showError });
      return;
    }
    update.mutate(
      {
        id: loan.id,
        quantity,
        startDate,
        endDate,
        departmentId,
        // eslint-disable-next-line unicorn/no-null -- null takes the person off the loan
        personId: byPerson ? (person?.uuid ?? null) : null,
        responsibleName: byPerson && person !== undefined ? person.name : responsibleName,
        // eslint-disable-next-line unicorn/no-null -- null clears the comment
        comment: comment.trim() === '' ? null : comment,
      },
      { onSuccess: onDone, onError: showError },
    );
  };

  return (
    <div className="space-y-4">
      {!onlyEndDate && (
        <NumberField
          label={labels.quantity[locale]}
          value={quantity}
          min={1}
          max={Math.max(max, 1)}
          onChange={setQuantity}
          hint={`${labels.available[locale]}: ${availability.data?.available ?? '…'}`}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={labels.startDate[locale]}>
          <input
            type="date"
            className={inputClass}
            value={start}
            disabled={onlyEndDate}
            onChange={(event) => setStart(event.target.value)}
          />
        </Field>
        <Field label={labels.endDate[locale]}>
          <input
            type="date"
            className={inputClass}
            value={end}
            min={start}
            onChange={(event) => setEnd(event.target.value)}
          />
        </Field>
      </div>
      {periodReversed && (
        <p className="text-sm font-semibold text-red-700">{labels.periodInvalid[locale]}</p>
      )}
      {!onlyEndDate && (
        <>
          <AssigneeToggle value={assignee} onChange={setAssignee} />
          <DepartmentSelect value={departmentId} onChange={setDepartmentId} />
          {byPerson ? (
            <PersonPicker value={person} onChange={setPerson} />
          ) : (
            <Field label={labels.responsible[locale]}>
              <input
                className={inputClass}
                value={responsibleName}
                onChange={(event) => setResponsibleName(event.target.value)}
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
        </>
      )}
      <MaterialButton
        className="w-full"
        loading={update.isPending}
        disabled={
          startDate === undefined ||
          endDate === undefined ||
          periodReversed ||
          (!onlyEndDate && (departmentId === '' || assigneeMissing))
        }
        onClick={save}
      >
        {labels.save[locale]}
      </MaterialButton>
    </div>
  );
};

/** Damage or loss noticed while the material is out; the stock is settled at the return. */
export const IncidentForm: React.FC<{
  itemId: string;
  loanId?: string;
  maxQuantity: number;
  onDone: () => void;
  locale: Locale;
}> = ({ itemId, loanId, maxQuantity, onDone, locale }) => {
  const [condition, setCondition] = useState<MaterialCondition>('DAMAGED');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const photo = useIncidentPhotoUpload();
  const report = trpc.material.reportIncident.useMutation();

  return (
    <div className="space-y-4">
      <Field label={text.condition[locale]}>
        <ConditionPicker
          value={condition}
          options={INCIDENT_CONDITIONS}
          onChange={setCondition}
          locale={locale}
        />
      </Field>
      <NumberField
        label={labels.quantity[locale]}
        value={quantity}
        min={1}
        max={Math.max(maxQuantity, 1)}
        onChange={setQuantity}
      />
      <Field label={text.whatHappened[locale]}>
        <textarea
          className={cn(inputClass, 'h-24 py-2')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <IncidentPhotoField upload={photo} />
      <MaterialButton
        className="w-full"
        variant="danger"
        loading={report.isPending || photo.isUploading}
        disabled={note.trim() === ''}
        onClick={() =>
          report.mutate(
            {
              itemId,
              ...(loanId === undefined ? {} : { loanId }),
              condition: condition === 'OK' ? 'DAMAGED' : condition,
              quantity,
              note,
              ...(photo.photoKey === undefined ? {} : { photoKey: photo.photoKey }),
            },
            {
              onSuccess: () => {
                toast.success(text.reported[locale]);
                onDone();
              },
              onError: (error) => toast.error(error.message),
            },
          )
        }
      >
        <AlertTriangle aria-hidden />
        {text.reportDamage[locale]}
      </MaterialButton>
    </div>
  );
};

/**
 * Everything about one loan, and the next step for it. Which buttons show depends on the
 * status and on whether the reader runs the depot or borrowed the material.
 */
export const LoanDetailDialog: React.FC<{
  loan: MaterialLoan;
  isMaterialTeam: boolean;
  onClose: () => void;
  /** opens straight into a step, such as the check-in from the returns list */
  initialMode?: LoanDialogMode;
}> = ({ loan: listedLoan, isMaterialTeam, onClose, initialMode = 'view' }) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const [requestedMode, setRequestedMode] = useState<Mode>(initialMode);
  const confirm = trpc.material.confirmLoan.useMutation();
  const cancel = trpc.material.cancelLoan.useMutation();
  const announce = trpc.material.announceReturn.useMutation();
  const detail = trpc.material.getLoan.useQuery(
    { number: listedLoan.number },
    materialQueryOptions,
  );

  // the list the loan was opened from may be minutes old; the loan itself is asked for fresh
  const loan: MaterialLoan = detail.data ?? listedLoan;
  const incidents = detail.data?.incidents ?? [];
  const status = getLoanDisplayStatus(loan, now);
  const isPending = loan.status === 'REQUESTED' || loan.status === 'RESERVED';
  const isOut = loan.status === 'ISSUED';
  // a step the loan has moved past, handed out or returned by somebody else meanwhile
  const mode: Mode =
    (requestedMode === 'return' && !isOut) || (requestedMode === 'issue' && !isPending)
      ? 'view'
      : requestedMode;
  // a cache entry restored from before the field existed has no value at all
  const returnAnnouncedAt =
    loan.returnAnnouncedAt instanceof Date ? loan.returnAnnouncedAt : undefined;

  const done = (): void => {
    toast.success(labels.saved[locale]);
    // closed first, so no button of the finished step can be tapped a second time
    onClose();
    void invalidate();
  };

  const titles: Record<Mode, string> = {
    view: format(labels.loanNumber, locale, { n: loan.number }),
    issue: text.issue[locale],
    return: text.recordReturn[locale],
    edit: isOut ? text.extend[locale] : text.edit[locale],
    incident: text.reportDamage[locale],
    qr: text.showQr[locale],
  };

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={titles[mode]}
      description={`${loanQuantity(loan)} × ${loan.item.name}`}
    >
      {mode === 'view' && (
        <>
          <div className="flex items-start gap-3">
            <MaterialItemImage
              name={loan.item.name}
              imageUrl={loan.item.imageUrl}
              className="size-16"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <LoanStatusBadge status={status} locale={locale} />
              {loan.isConsumption && (
                <div className="text-xs text-gray-500">{text.consumption[locale]}</div>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">{labels.department[locale]}</dt>
            <dd className="font-medium text-gray-900">{loan.department.name}</dd>
            {loan.person?.name !== undefined && (
              <>
                <dt className="text-gray-500">{labels.person[locale]}</dt>
                <dd className="font-medium text-gray-900">{loan.person.name}</dd>
              </>
            )}
            <dt className="text-gray-500">{labels.responsible[locale]}</dt>
            <dd className="font-medium text-gray-900">{loan.responsibleName}</dd>
            <dt className="text-gray-500">{labels.startDate[locale]}</dt>
            <dd className="font-medium text-gray-900">{formatDay(loan.startDate, locale)}</dd>
            <dt className="text-gray-500">{labels.endDate[locale]}</dt>
            <dd
              className={cn('font-medium', status === 'OVERDUE' ? 'text-red-700' : 'text-gray-900')}
            >
              {formatDay(loan.endDate, locale)}
            </dd>
            <dt className="text-gray-500">{labels.quantity[locale]}</dt>
            <dd className="font-medium text-gray-900">
              {loan.quantity} {loan.item.unit}
              {loan.issuedQuantity !== null && loan.issuedQuantity !== loan.quantity && (
                <span className="text-gray-500"> ({loan.issuedQuantity})</span>
              )}
            </dd>
            {loan.comment !== null && (
              <>
                <dt className="text-gray-500">{labels.comment[locale]}</dt>
                <dd className="text-gray-900">{loan.comment}</dd>
              </>
            )}
          </dl>
          <ul className="space-y-0.5 text-xs text-gray-500">
            <li>{format(text.createdBy, locale, { name: loan.createdBy.name })}</li>
            {loan.issuedAt instanceof Date && (
              <li>
                {format(text.issuedAt, locale, { at: formatDateTime(loan.issuedAt, locale) })}
              </li>
            )}
            {returnAnnouncedAt !== undefined && isOut && (
              <li className="font-semibold text-blue-700">
                {format(text.announced, locale, {
                  at: formatDateTime(returnAnnouncedAt, locale),
                })}
              </li>
            )}
            {loan.returnedAt instanceof Date && (
              <li>
                {format(text.returnedAt, locale, { at: formatDateTime(loan.returnedAt, locale) })}
                {loan.returnCondition !== null &&
                  ` · ${conditionLabel[loan.returnCondition][locale]}`}
                {loan.returnedQuantity !== null &&
                  ` · ${loan.returnedQuantity}/${loanQuantity(loan)}`}
              </li>
            )}
          </ul>
          {isOut && loan.item.returnInstructions !== '' && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-semibold">{labels.returnInstructions[locale]}: </span>
              {loan.item.returnInstructions}
            </p>
          )}
          {incidents.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-gray-800">{text.incidents[locale]}</h3>
              <ul className="space-y-1 text-sm">
                {incidents.map((incident) => (
                  <li key={incident.id} className="rounded-lg bg-red-50 px-3 py-2 text-red-900">
                    {incident.quantity} × {conditionLabel[incident.condition][locale]}
                    {incident.note !== '' && ` – ${incident.note}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {isMaterialTeam && loan.status === 'REQUESTED' && (
              <MaterialButton
                loading={confirm.isPending}
                onClick={() =>
                  confirm.mutate({ id: loan.id }, { onSuccess: done, onError: showError })
                }
              >
                <Check aria-hidden />
                {text.confirm[locale]}
              </MaterialButton>
            )}
            {isMaterialTeam && isPending && (
              <MaterialButton onClick={() => setRequestedMode('issue')}>
                <PackageOpen aria-hidden />
                {text.issue[locale]}
              </MaterialButton>
            )}
            {isMaterialTeam && isOut && (
              <MaterialButton onClick={() => setRequestedMode('return')}>
                <PackageCheck aria-hidden />
                {text.recordReturn[locale]}
              </MaterialButton>
            )}
            {!isMaterialTeam && isOut && returnAnnouncedAt === undefined && (
              <MaterialButton
                loading={announce.isPending}
                onClick={() =>
                  announce.mutate({ id: loan.id }, { onSuccess: done, onError: showError })
                }
              >
                <CornerDownLeft aria-hidden />
                {text.announceReturn[locale]}
              </MaterialButton>
            )}
            {(isPending || (isMaterialTeam && isOut)) && (
              <MaterialButton variant="secondary" onClick={() => setRequestedMode('edit')}>
                <Pencil aria-hidden />
                {isOut ? text.extend[locale] : text.edit[locale]}
              </MaterialButton>
            )}
            {isOut && (
              <MaterialButton variant="danger" onClick={() => setRequestedMode('incident')}>
                <AlertTriangle aria-hidden />
                {text.reportDamage[locale]}
              </MaterialButton>
            )}
            {isPending && (
              <MaterialButton
                variant="danger"
                loading={cancel.isPending}
                onClick={() => {
                  if (!globalThis.confirm(text.cancelConfirm[locale])) return;
                  cancel.mutate({ id: loan.id }, { onSuccess: done, onError: showError });
                }}
              >
                <X aria-hidden />
                {text.cancelLoan[locale]}
              </MaterialButton>
            )}
            {isMaterialTeam && (
              <MaterialButton variant="ghost" onClick={() => setRequestedMode('qr')}>
                <QrCode aria-hidden />
                {text.showQr[locale]}
              </MaterialButton>
            )}
          </div>
        </>
      )}

      {mode === 'issue' && <IssueForm loan={loan} onDone={done} locale={locale} />}
      {mode === 'return' && <ReturnForm loan={loan} onDone={done} locale={locale} />}
      {mode === 'edit' && (
        <EditForm loan={loan} onDone={done} locale={locale} onlyEndDate={isOut} />
      )}
      {mode === 'incident' && (
        <IncidentForm
          itemId={loan.item.id}
          loanId={loan.id}
          maxQuantity={loanQuantity(loan)}
          onDone={done}
          locale={locale}
        />
      )}
      {mode === 'qr' && (
        <MaterialQrCode
          path={`/app/material/loans?loan=${loan.number}`}
          caption={`#${loan.number} · ${loanQuantity(loan)} × ${loan.item.name} · ${loan.department.shortName}`}
        />
      )}
      {mode !== 'view' && (
        <MaterialButton variant="ghost" onClick={() => setRequestedMode('view')}>
          {labels.cancel[locale]}
        </MaterialButton>
      )}
    </MaterialSheet>
  );
};
