'use client';

import { SectionTitle, Stepper } from '@/features/material/components/counter-ui';
import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import { LoanStatusBadge } from '@/features/material/components/material-status-badge';
import {
  DateInput,
  EmptyState,
  Field,
  focusRing,
  inputClass,
  LoadingState,
  MaterialButton,
  MaterialSheet,
  Panel,
  SheetFooter,
} from '@/features/material/components/material-ui';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useInvalidateMaterial,
  useMaterialLocale,
  useNow,
} from '@/features/material/hooks/use-material';
import { useSearchHistory } from '@/features/material/hooks/use-search-history';
import { basketLineCap } from '@/features/material/utils/basket';
import { fromDateInput, toDateInput } from '@/features/material/utils/dates';
import { dayKey } from '@/features/material/utils/holders';
import { getLoanDisplayStatus } from '@/features/material/utils/stock';
import { trpc, type RouterOutputs } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, CornerDownLeft, Pencil, Plus, User, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

type MyLoan = RouterOutputs['material']['getMyHofLoans']['mine'][number];

const text = {
  requestMaterial: { de: 'Material anfragen', en: 'Request material', fr: 'Demander du matériel' },
  intro: {
    de: 'Frag Material an, das Materialteam bestätigt es und gibt es am Depot aus. Hier siehst du, was dein Hof hat und bis wann es zurück muss.',
    en: 'Request material; the material team confirms it and hands it out at the depot. Here you see what your Hof has and when it is due back.',
    fr: 'Demande du matériel ; l’équipe matériel le confirme et le remet au dépôt. Ici, tu vois ce que ton Hof a et quand le rendre.',
  },
  myRequests: { de: 'Meine Anfragen', en: 'My requests', fr: 'Mes demandes' },
  ourHof: { de: 'Was unser Hof hat', en: 'What our Hof has', fr: 'Ce que notre Hof a' },
  withMe: { de: 'Bei mir', en: 'With me', fr: 'Chez moi' },
  forMe: { de: 'Für mich', en: 'For me', fr: 'Pour moi' },
  nothingOut: {
    de: 'Gerade nichts ausgeliehen.',
    en: 'Nothing borrowed right now.',
    fr: 'Rien d’emprunté pour le moment.',
  },
  noHof: {
    de: 'Du bist keinem Hof zugeordnet. Du kannst Material für dich selbst anfragen.',
    en: 'You belong to no Hof. You can request material for yourself.',
    fr: 'Tu n’es rattaché·e à aucun Hof. Tu peux demander du matériel pour toi.',
  },
  pickupReturn: {
    de: 'Abholung {start} · Rückgabe {end}',
    en: 'Pickup {start} · return {end}',
    fr: 'Retrait {start} · retour {end}',
  },
  until: { de: 'bis {day}', en: 'until {day}', fr: 'jusqu’au {day}' },
  announce: { de: 'Rückgabe melden', en: 'Announce return', fr: 'Annoncer le retour' },
  announceAll: {
    de: 'Alles zurückmelden',
    en: 'Announce everything',
    fr: 'Tout annoncer',
  },
  announced: {
    de: 'Gemeldet. Bring das Material ans Depot.',
    en: 'Announced. Bring the material to the depot.',
    fr: 'Annoncé. Apporte le matériel au dépôt.',
  },
  edit: { de: 'Anfrage bearbeiten', en: 'Edit request', fr: 'Modifier la demande' },
  cancel: { de: 'Stornieren', en: 'Cancel', fr: 'Annuler' },
  cancelAsk: {
    de: 'Wirklich stornieren?',
    en: 'Really cancel?',
    fr: 'Vraiment annuler ?',
  },
  cancelYes: { de: 'Ja, stornieren', en: 'Yes, cancel', fr: 'Oui, annuler' },
  cancelled: { de: 'Storniert.', en: 'Cancelled.', fr: 'Annulé.' },
  rejectedBecause: {
    de: 'Abgelehnt: {reason}',
    en: 'Turned down: {reason}',
    fr: 'Refusé : {reason}',
  },
  rejectedNoReason: {
    de: 'Das Materialteam hat die Anfrage abgelehnt.',
    en: 'The material team turned the request down.',
    fr: 'L’équipe matériel a refusé la demande.',
  },
  freeForDays: {
    de: 'frei für diese Tage: {n} · max {max}',
    en: 'free for these days: {n} · max {max}',
    fr: 'libres pour ces jours : {n} · max {max}',
  },
  pickup: { de: 'Abholung am', en: 'Pickup on', fr: 'Retrait le' },
  returnBy: { de: 'Rückgabe bis', en: 'Return by', fr: 'Retour jusqu’au' },
  comment: { de: 'Bemerkung (optional)', en: 'Note (optional)', fr: 'Remarque (facultatif)' },
  loanNotVisible: {
    de: 'Diese Ausleihe gehört nicht zu dir oder deinem Hof.',
    en: 'This loan belongs neither to you nor to your Hof.',
    fr: 'Ce prêt n’est ni à toi ni à ton Hof.',
  },
} satisfies Record<string, StaticTranslationString>;

const isPending = (loan: MyLoan): boolean =>
  loan.status === 'REQUESTED' || loan.status === 'RESERVED';

/** A cached blob from an older app version may lack the newer fields. */
const announcedAt = (loan: { returnAnnouncedAt?: Date | null }): Date | undefined =>
  loan.returnAnnouncedAt instanceof Date ? loan.returnAnnouncedAt : undefined;

const quantityOf = (loan: MyLoan): number => loan.issuedQuantity ?? loan.quantity;

/** Changes a request while the material team has not answered it: how many, when, a note. */
const EditRequestSheet: React.FC<{ loan: MyLoan; onClose: () => void }> = ({ loan, onClose }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const update = trpc.material.updateLoanRequest.useMutation();
  const [quantity, setQuantity] = useState(loan.quantity);
  const [start, setStart] = useState(toDateInput(loan.startDate));
  const [end, setEnd] = useState(toDateInput(loan.endDate));
  const [comment, setComment] = useState(loan.comment ?? '');
  const startDate = fromDateInput(start, 'start');
  const endDate = fromDateInput(end, 'end');
  const periodValid = startDate !== undefined && endDate !== undefined && endDate >= startDate;
  const availability = trpc.material.getAvailability.useQuery(
    {
      itemId: loan.item.id,
      startDate: startDate ?? loan.startDate,
      endDate: endDate ?? loan.endDate,
      excludeLoanId: loan.id,
    },
    { ...materialQueryOptions, enabled: periodValid },
  );
  const cap = basketLineCap({
    available: availability.data?.available ?? loan.quantity,
    maxLoanQuantity: loan.item.maxLoanQuantity,
  });

  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={text.edit[locale]}
      description={loan.item.name}
    >
      <Field as="group" label={labels.quantity[locale]}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {format(text.freeForDays, locale, {
              n: availability.data?.available ?? '…',
              max: loan.item.maxLoanQuantity,
            })}
          </span>
          <Stepper
            label={labels.quantity[locale]}
            value={quantity}
            min={1}
            max={Math.max(cap, 1)}
            onChange={setQuantity}
          />
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field as="group" label={text.pickup[locale]}>
          <DateInput value={start} onChange={setStart} label={text.pickup[locale]} />
        </Field>
        <Field as="group" label={text.returnBy[locale]}>
          <DateInput value={end} min={start} onChange={setEnd} label={text.returnBy[locale]} />
        </Field>
      </div>
      <Field label={text.comment[locale]}>
        <input
          className={inputClass}
          value={comment}
          autoComplete="off"
          onChange={(event) => setComment(event.target.value)}
        />
      </Field>
      <SheetFooter>
        <MaterialButton
          className="w-full"
          loading={update.isPending}
          disabled={!periodValid || quantity > cap}
          onClick={() =>
            update.mutate(
              { id: loan.id, quantity, startDate, endDate, comment },
              {
                onSuccess: () => {
                  toast.success(labels.saved[locale]);
                  onClose();
                  void invalidate();
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          {labels.save[locale]}
        </MaterialButton>
      </SheetFooter>
    </MaterialSheet>
  );
};

/** One loan of the participant's cards, with what they may still do about it. */
const MyLoanRow: React.FC<{ loan: MyLoan; onEdit: (loan: MyLoan) => void }> = ({
  loan,
  onEdit,
}) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const cancel = trpc.material.cancelLoanRequest.useMutation();
  const announce = trpc.material.announceReturn.useMutation();
  const [asking, setAsking] = useState(false);
  const status = getLoanDisplayStatus(loan, now);
  const announced = announcedAt(loan);
  const rejected = status === 'REJECTED';
  const out = loan.status === 'ISSUED';
  let when = format(text.until, locale, { day: formatDay(loan.endDate, locale) });
  if (status === 'OVERDUE') {
    when = format(labels.overdueSince, locale, { day: formatDay(loan.endDate, locale) });
  }

  return (
    <li className={cn('space-y-2 px-4 py-3', status === 'OVERDUE' && 'bg-red-50')}>
      <div className="flex items-center gap-3">
        <MaterialItemImage
          name={loan.item.name}
          imageUrl={loan.item.imageUrl}
          className="size-11"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-gray-900">
            <span className="tabular-nums">{quantityOf(loan)} ×</span> {loan.item.name}
          </div>
          <div
            className={cn(
              'truncate text-sm',
              status === 'OVERDUE' ? 'font-semibold text-red-700' : 'text-gray-500',
            )}
          >
            {out ? when : `#${loan.number}`}
          </div>
        </div>
        {announced === undefined ? (
          <LoanStatusBadge status={status} locale={locale} />
        ) : (
          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-600/30">
            {labels.returnAnnounced[locale]}
          </span>
        )}
      </div>
      {rejected && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
          {loan.rejectionReason === '' || loan.rejectionReason === null
            ? text.rejectedNoReason[locale]
            : format(text.rejectedBecause, locale, { reason: loan.rejectionReason })}
        </p>
      )}
      {asking && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-sm font-semibold text-gray-800">
            {text.cancelAsk[locale]}
          </span>
          <MaterialButton variant="ghost" onClick={() => setAsking(false)}>
            {labels.back[locale]}
          </MaterialButton>
          <MaterialButton
            variant="danger"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(
                { id: loan.id },
                {
                  onSuccess: () => {
                    toast.success(text.cancelled[locale]);
                    setAsking(false);
                    void invalidate();
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {text.cancelYes[locale]}
          </MaterialButton>
        </div>
      )}
      {!asking && (isPending(loan) || (out && announced === undefined)) && (
        <div className="flex flex-wrap justify-end gap-2">
          {loan.status === 'REQUESTED' && (
            <MaterialButton variant="secondary" onClick={() => onEdit(loan)}>
              <Pencil aria-hidden />
              {labels.edit[locale]}
            </MaterialButton>
          )}
          {isPending(loan) && (
            <MaterialButton variant="danger" onClick={() => setAsking(true)}>
              <X aria-hidden />
              {text.cancel[locale]}
            </MaterialButton>
          )}
          {out && announced === undefined && (
            <MaterialButton
              variant="secondary"
              loading={announce.isPending}
              onClick={() =>
                announce.mutate(
                  { ids: [loan.id] },
                  {
                    onSuccess: () => {
                      toast.success(text.announced[locale]);
                      void invalidate();
                    },
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            >
              <CornerDownLeft aria-hidden />
              {text.announce[locale]}
            </MaterialButton>
          )}
        </div>
      )}
    </li>
  );
};

/** What one holder has out, with one button to announce all of it at once. */
const OutCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  loans: MyLoan[];
  onEdit: (loan: MyLoan) => void;
}> = ({ title, icon, loans, onEdit }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const announce = trpc.material.announceReturn.useMutation();
  const open = loans.filter((loan) => announcedAt(loan) === undefined).map((loan) => loan.id);
  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        {icon}
        <h2 className="min-w-0 flex-1 truncate font-bold text-gray-900">{title}</h2>
      </div>
      {loans.length === 0 ? (
        <EmptyState text={text.nothingOut[locale]} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {loans.map((loan) => (
            <MyLoanRow key={loan.id} loan={loan} onEdit={onEdit} />
          ))}
        </ul>
      )}
      {open.length > 1 && (
        <div className="border-t border-gray-100 p-3">
          <MaterialButton
            variant="secondary"
            className="w-full"
            loading={announce.isPending}
            onClick={() =>
              announce.mutate(
                { ids: open },
                {
                  onSuccess: () => {
                    toast.success(text.announced[locale]);
                    void invalidate();
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            <CornerDownLeft aria-hidden />
            {text.announceAll[locale]}
          </MaterialButton>
        </div>
      )}
    </Panel>
  );
};

interface RequestGroup {
  key: string;
  title: string;
  loans: MyLoan[];
}

/** Requests and confirmed pickups by holder and pickup day, the way they were asked for. */
const groupRequests = (
  loans: { hofName: string; loan: MyLoan }[],
  locale: Locale,
): RequestGroup[] => {
  const groups = new Map<string, RequestGroup>();
  for (const { hofName, loan } of loans) {
    const holder = loan.personId === null ? hofName : text.forMe[locale];
    const key = `${holder}@${dayKey(loan.startDate)}`;
    const group = groups.get(key) ?? { key, title: holder, loans: [] };
    group.loans.push(loan);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** A scanned loan label: the loan, if it is theirs, and its return announced in a tap. */
const ScannedLoanSheet: React.FC<{ number: number; onClose: () => void }> = ({
  number,
  onClose,
}) => {
  const locale = useMaterialLocale();
  const now = useNow();
  const invalidate = useInvalidateMaterial();
  const loan = trpc.material.getLoan.useQuery({ number }, materialQueryOptions);
  const announce = trpc.material.announceReturn.useMutation();
  const data = loan.data;
  const canAnnounce = data?.status === 'ISSUED' && announcedAt(data) === undefined;
  return (
    <MaterialSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={format(labels.loanNumber, locale, { n: number })}
    >
      {loan.isLoading && <LoadingState text={labels.loading[locale]} />}
      {!loan.isLoading && data === undefined && <EmptyState text={text.loanNotVisible[locale]} />}
      {data !== undefined && (
        <>
          <div className="flex items-center gap-3">
            <MaterialItemImage
              name={data.item.name}
              imageUrl={data.item.imageUrl}
              className="size-14"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900">
                {data.issuedQuantity ?? data.quantity} × {data.item.name}
              </div>
              <div className="text-sm text-gray-500">
                {format(text.until, locale, { day: formatDay(data.endDate, locale) })}
              </div>
            </div>
            <LoanStatusBadge status={getLoanDisplayStatus(data, now)} locale={locale} />
          </div>
          {data.item.returnInstructions !== '' && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-semibold">{labels.returnInstructions[locale]}: </span>
              {data.item.returnInstructions}
            </p>
          )}
          {canAnnounce && (
            <SheetFooter>
              <MaterialButton
                className="w-full"
                loading={announce.isPending}
                onClick={() =>
                  announce.mutate(
                    { ids: [data.id] },
                    {
                      onSuccess: () => {
                        toast.success(text.announced[locale]);
                        onClose();
                        void invalidate();
                      },
                      onError: (error) => toast.error(error.message),
                    },
                  )
                }
              >
                <CornerDownLeft aria-hidden />
                {text.announce[locale]}
              </MaterialButton>
            </SheetFooter>
          )}
        </>
      )}
    </MaterialSheet>
  );
};

/**
 * A participant's overview: a big way to request material, their open requests with edit and
 * cancel, and what their Höfe and they have out, each with "announce return".
 */
export const MyLoansView: React.FC = () => {
  const locale = useMaterialLocale();
  const history = useSearchHistory();
  const loanParameter = Number(useSearchParams().get('loan') ?? '');
  const scannedNumber =
    Number.isSafeInteger(loanParameter) && loanParameter > 0 ? loanParameter : undefined;
  const loans = trpc.material.getMyHofLoans.useQuery(undefined, {
    ...materialQueryOptions,
    refetchInterval: MATERIAL_POLL_INTERVAL_MS,
  });
  const [editing, setEditing] = useState<MyLoan | undefined>();

  if (loans.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!loans.data) return <MaterialQueryError error={loans.error} />;
  const { hoefe, mine } = loans.data;
  const all = [
    ...hoefe.flatMap((hof) => hof.loans.map((loan) => ({ hofName: hof.name, loan }))),
    ...mine.map((loan) => ({ hofName: '', loan })),
  ];
  const requests = groupRequests(
    all.filter(({ loan }) => loan.status !== 'ISSUED'),
    locale,
  );
  const isOut = (loan: MyLoan): boolean => loan.status === 'ISSUED';

  return (
    <div className="space-y-5">
      <p className="px-1 text-sm text-gray-600">{text.intro[locale]}</p>
      <Link
        href="/app/material/katalog"
        className={cn(
          'bg-conveniat-green flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white [&_svg]:size-5',
          focusRing,
        )}
      >
        <Plus aria-hidden />
        {text.requestMaterial[locale]}
      </Link>

      {requests.length > 0 && (
        <section>
          <SectionTitle count={requests.length}>{text.myRequests[locale]}</SectionTitle>
          <div className="space-y-3">
            {requests.map((group) => {
              const first = group.loans[0];
              return (
                <Panel key={group.key}>
                  <div className="border-b border-gray-100 px-4 py-3">
                    <h3 className="truncate font-bold text-gray-900">{group.title}</h3>
                    {first !== undefined && (
                      <p className="text-xs text-gray-500">
                        {format(text.pickupReturn, locale, {
                          start: formatDay(first.startDate, locale),
                          end: formatDay(first.endDate, locale),
                        })}
                      </p>
                    )}
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {group.loans.map((loan) => (
                      <MyLoanRow key={loan.id} loan={loan} onEdit={setEditing} />
                    ))}
                  </ul>
                </Panel>
              );
            })}
          </div>
        </section>
      )}

      {hoefe.map((hof) => (
        <OutCard
          key={hof.id}
          title={`${text.ourHof[locale]} · ${hof.name}`}
          icon={<Building2 className="size-4 shrink-0 text-gray-500" aria-hidden />}
          loans={hof.loans.filter((loan) => isOut(loan))}
          onEdit={setEditing}
        />
      ))}
      {(hoefe.length === 0 || mine.some((loan) => isOut(loan))) && (
        <OutCard
          title={text.withMe[locale]}
          icon={<User className="size-4 shrink-0 text-gray-500" aria-hidden />}
          loans={mine.filter((loan) => isOut(loan))}
          onEdit={setEditing}
        />
      )}
      {hoefe.length === 0 && <p className="px-1 text-sm text-gray-500">{text.noHof[locale]}</p>}

      {editing !== undefined && (
        <EditRequestSheet loan={editing} onClose={() => setEditing(undefined)} />
      )}
      {scannedNumber !== undefined && (
        <ScannedLoanSheet key={scannedNumber} number={scannedNumber} onClose={history.close} />
      )}
    </div>
  );
};
