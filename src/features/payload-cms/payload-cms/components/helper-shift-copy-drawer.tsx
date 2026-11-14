'use client';

import {
  CAMP_PHASES,
  findCampPhase,
} from '@/features/payload-cms/components/form/utils/camp-phases';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type {
  HelperShiftCopyRequest,
  HelperShiftCopyResult,
} from '@/features/payload-cms/payload-cms/endpoints/helper-shift-copy';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  Button,
  CheckboxInput,
  Drawer,
  PopupList,
  TextInput,
  toast,
  useDocumentInfo,
  useFormFields,
  useModal,
  useTranslation,
} from '@payloadcms/ui';
import { CopyPlus, Plus, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const DRAWER_SLUG = 'helper-shift-copy-to-days';
const TIME_SLOT = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;

const texts = {
  menuItem: {
    de: 'Auf weitere Tage kopieren',
    en: 'Copy to more days',
    fr: 'Copier sur d’autres jours',
  },
  description: {
    de: 'Jede Kopie wird ein eigener Schichteinsatz mit denselben Texten, derselben Schichtleitung, Grösse und Einstellungen. Angemeldete Helfende werden nicht kopiert. Ein Zeitfenster, das es am selben Tag mit demselben Titel schon gibt, wird übersprungen.',
    en: 'Each copy becomes a shift of its own with the same texts, Schichtleitung, size and settings. Enrolled helpers are not copied. A time slot that already exists on that day with the same title is skipped.',
    fr: 'Chaque copie devient un service à part entière avec les mêmes textes, la même Schichtleitung, la même taille et les mêmes réglages. Les helpers inscrits ne sont pas copiés. Un créneau qui existe déjà ce jour-là avec le même titre est ignoré.',
  },
  days: { de: 'Tage', en: 'Days', fr: 'Jours' },
  timeSlots: { de: 'Zeitfenster', en: 'Time slots', fr: 'Créneaux' },
  addTimeSlot: { de: 'Zeitfenster', en: 'Time slot', fr: 'Créneau' },
  removeTimeSlot: {
    de: 'Zeitfenster entfernen',
    en: 'Remove time slot',
    fr: 'Retirer le créneau',
  },
  invalidTime: {
    de: 'Format HH:mm - HH:mm, z.B. 07:00 - 10:00',
    en: 'Format HH:mm - HH:mm, e.g. 07:00 - 10:00',
    fr: 'Format HH:mm - HH:mm, p. ex. 07:00 - 10:00',
  },
  saveFirst: {
    de: 'Speichere den Schichteinsatz, bevor du ihn kopierst.',
    en: 'Save the shift before copying it.',
    fr: 'Enregistre le service avant de le copier.',
  },
  failed: {
    de: 'Die Kopien konnten nicht erstellt werden.',
    en: 'The copies could not be created.',
    fr: 'Les copies n’ont pas pu être créées.',
  },
} satisfies Record<string, StaticTranslationString>;

const submitLabel = (locale: Locale, count: number): string =>
  ({
    de: count === 1 ? '1 Kopie erstellen' : `${String(count)} Kopien erstellen`,
    en: count === 1 ? 'Create 1 copy' : `Create ${String(count)} copies`,
    fr: count === 1 ? 'Créer 1 copie' : `Créer ${String(count)} copies`,
  })[locale];

const resultMessage = (locale: Locale, { created, skipped }: HelperShiftCopyResult): string => {
  const skippedPart = {
    de: skipped > 0 ? `, ${String(skipped)} übersprungen` : '',
    en: skipped > 0 ? `, ${String(skipped)} skipped` : '',
    fr: skipped > 0 ? `, ${String(skipped)} ignorée(s)` : '',
  }[locale];
  return {
    de: `${String(created)} Schichteinsätze erstellt${skippedPart}.`,
    en: `${String(created)} shifts created${skippedPart}.`,
    fr: `${String(created)} services créés${skippedPart}.`,
  }[locale];
};

/** The Zurich calendar day of a stored date, as `YYYY-MM-DD`. */
const zurichDay = (value: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date(value));

/** Every day from the first to the last, inclusive, as `YYYY-MM-DD`. */
const daysBetween = (first: string, last: string): string[] => {
  const days: string[] = [];
  for (let t = Date.parse(first); t <= Date.parse(last); t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
};

const dayLabel = (locale: Locale, day: string): string =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));

/** The entry in the document's ⋮ menu that opens the drawer. */
export const HelperShiftCopyMenuItem: React.FC = () => {
  const { openModal } = useModal();
  const { i18n } = useTranslation();
  return (
    <PopupList.Button onClick={() => openModal(DRAWER_SLUG)}>
      {texts.menuItem[resolveAdminLocale(i18n.language)]}
    </PopupList.Button>
  );
};

/**
 * The drawer itself, mounted by a `ui` field so it stays when the ⋮ menu closes. Copies the
 * saved shift onto the chosen days and time slots of the camp phase the shift lies in.
 */
export const HelperShiftCopyDrawer: React.FC = () => {
  const { id } = useDocumentInfo();
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);
  const { closeModal } = useModal();
  const storedDate = useFormFields(([fields]) => fields['timeslot.date']?.value);
  const storedTime = useFormFields(([fields]) => fields['timeslot.time']?.value);

  const sourceDay = typeof storedDate === 'string' ? zurichDay(storedDate) : undefined;
  const phase =
    (sourceDay === undefined ? undefined : findCampPhase(sourceDay)) ??
    CAMP_PHASES.find((campPhase) => campPhase.key === 'main');
  const days = phase === undefined ? [] : daysBetween(phase.startDate, phase.endDate);

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([typeof storedTime === 'string' ? storedTime : '']);
  const [submitting, setSubmitting] = useState(false);

  const validTimes = times.filter((time) => TIME_SLOT.test(time));
  const count = selectedDays.length * validTimes.length;
  const timesValid = validTimes.length === times.length;

  const toggleDay = (day: string): void =>
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day],
    );

  const submit = async (): Promise<void> => {
    if (id === undefined) return;
    setSubmitting(true);
    try {
      const body: HelperShiftCopyRequest = { days: selectedDays, times: validTimes };
      const response = await fetch(`/api/helper-shifts/${String(id)}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`copy failed with ${String(response.status)}`);
      toast.success(resultMessage(locale, (await response.json()) as HelperShiftCopyResult));
      setSelectedDays([]);
      closeModal(DRAWER_SLUG);
    } catch (error) {
      console.error('Copying the helper shift failed', error);
      toast.error(texts.failed[locale]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer slug={DRAWER_SLUG} title={texts.menuItem[locale]}>
      <p className="m-0 mb-6 max-w-2xl text-[13px] leading-relaxed text-(--theme-elevation-600)">
        {id === undefined ? texts.saveFirst[locale] : texts.description[locale]}
      </p>

      {id !== undefined && (
        <div className="flex max-w-xl flex-col gap-6">
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 font-semibold">
              {texts.days[locale]}
              {phase === undefined ? '' : ` · ${phase.label[locale]}`}
            </legend>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {days.map((day) => (
                <CheckboxInput
                  key={day}
                  id={`copy-day-${day}`}
                  label={dayLabel(locale, day)}
                  checked={selectedDays.includes(day)}
                  onToggle={() => toggleDay(day)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 font-semibold">{texts.timeSlots[locale]}</legend>
            <div className="flex flex-col gap-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-56">
                    <TextInput
                      path={`copy-time-${String(index)}`}
                      value={time}
                      placeholder="07:00 - 10:00"
                      showError={time !== '' && !TIME_SLOT.test(time)}
                      {...(time !== '' && !TIME_SLOT.test(time)
                        ? { Error: <span>{texts.invalidTime[locale]}</span> }
                        : {})}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        const { value } = event.target;
                        setTimes((current) =>
                          current.map((entry, position) => (position === index ? value : entry)),
                        );
                      }}
                    />
                  </div>
                  {times.length > 1 && (
                    <Button
                      buttonStyle="icon-label"
                      margin={false}
                      icon={<X className="h-4 w-4" />}
                      aria-label={texts.removeTimeSlot[locale]}
                      onClick={() =>
                        setTimes((current) => current.filter((_, position) => position !== index))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <Button
              buttonStyle="secondary"
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              iconPosition="left"
              onClick={() => setTimes((current) => [...current, ''])}
            >
              {texts.addTimeSlot[locale]}
            </Button>
          </fieldset>

          <div>
            <Button
              buttonStyle="primary"
              size="medium"
              margin={false}
              icon={<CopyPlus className="h-4 w-4" />}
              iconPosition="left"
              disabled={submitting || count === 0 || !timesValid}
              onClick={() => void submit()}
            >
              {submitLabel(locale, count)}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
