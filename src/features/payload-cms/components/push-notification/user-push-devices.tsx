'use client';
import { describePushDevice } from '@/features/payload-cms/components/push-notification/push-device-label';
import {
  NotificationHistory,
  SectionHeading,
} from '@/features/payload-cms/components/push-notification/push-notification-history';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { isPushDeviceStale } from '@/lib/push/push-device-staleness';
import type { RouterOutputs } from '@/trpc/client';
import { trpc, TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Button,
  ConfirmationModal,
  Pill,
  ShimmerEffect,
  toast,
  useConfig,
  useDocumentDrawer,
  useDocumentInfo,
  useModal,
  useTranslation,
} from '@payloadcms/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { de, enUS, fr } from 'date-fns/locale';
import { Laptop, Smartphone } from 'lucide-react';
import type React from 'react';
import type { JSX } from 'react';
import { isValidElement } from 'react';

type PushDevice = RouterOutputs['pushTracking']['getPushDeviceList'][number];

const SUBSCRIPTIONS_SLUG = 'push-notification-subscriptions';
const DATE_LOCALES = { de, fr, en: enUS } as const;
const CELL = 'px-4 py-3 align-middle';
const COLUMN_COUNT = 5;

const devicesTitle: StaticTranslationString = { de: 'Geräte', fr: 'Appareils', en: 'Devices' };
const devicesDescription: StaticTranslationString = {
  de: 'Jedes Gerät, auf dem diese Person Push-Benachrichtigungen erhält. Ein Gerät, das sich 30 Tage nicht mehr gemeldet hat, ist inaktiv: Es wird vermutlich nicht mehr verwendet und verschwindet, sobald ein Versand daran scheitert.',
  fr: "Chaque appareil sur lequel cette personne reçoit des notifications push. Un appareil qui ne s'est pas manifesté depuis 30 jours est inactif : il n'est probablement plus utilisé et disparaît dès qu'un envoi échoue.",
  en: 'Every device on which this person receives push notifications. A device that has not checked in for 30 days is inactive: it is probably no longer used, and it disappears once a send to it fails.',
};
const noDevicesLabel: StaticTranslationString = {
  de: 'Diese Person erhält auf keinem Gerät Push-Benachrichtigungen.',
  fr: 'Cette personne ne reçoit de notifications push sur aucun appareil.',
  en: 'This person receives push notifications on no device.',
};
const columnLabels: Record<'device' | 'channel' | 'source' | 'lastUsed', StaticTranslationString> =
  {
    device: { de: 'Gerät', fr: 'Appareil', en: 'Device' },
    channel: { de: 'Kanal', fr: 'Canal', en: 'Channel' },
    source: { de: 'Registriert über', fr: 'Enregistré depuis', en: 'Registered from' },
    lastUsed: { de: 'Zuletzt gemeldet', fr: 'Dernier signe de vie', en: 'Last checked in' },
  };
const webPushLabel: StaticTranslationString = { de: 'Web-Push', fr: 'Web push', en: 'Web push' };
const nativeAppLabel: StaticTranslationString = { de: 'App', fr: 'App', en: 'App' };
const inactiveLabel: StaticTranslationString = { de: 'inaktiv', fr: 'inactif', en: 'inactive' };
const detailsLabel: StaticTranslationString = { de: 'Details', fr: 'Détails', en: 'Details' };
const removeLabel: StaticTranslationString = {
  de: 'Gerät abmelden',
  fr: "Désinscrire l'appareil",
  en: 'Remove device',
};
const removingLabel: StaticTranslationString = {
  de: 'Wird abgemeldet …',
  fr: 'Désinscription …',
  en: 'Removing …',
};
const removeHeading = (name: string): StaticTranslationString => ({
  de: `«${name}» abmelden?`,
  fr: `Désinscrire « ${name} » ?`,
  en: `Remove “${name}”?`,
});
const removeBody: StaticTranslationString = {
  de: 'Das Gerät erhält keine Push-Benachrichtigungen mehr. Gedacht für Geräte, die nicht mehr verwendet werden: Öffnet die Person die App darauf wieder, meldet es sich von selbst wieder an. Ihre anderen Geräte bleiben angemeldet.',
  fr: "L'appareil ne reçoit plus de notifications push. Prévu pour les appareils qui ne sont plus utilisés : si la personne y rouvre l'app, il se réinscrit de lui-même. Ses autres appareils restent inscrits.",
  en: 'The device gets no more push notifications. Meant for devices that are no longer used: if the person opens the app on it again, it signs up again by itself. Their other devices stay subscribed.',
};
const removedLabel: StaticTranslationString = {
  de: 'Gerät abgemeldet.',
  fr: 'Appareil désinscrit.',
  en: 'Device removed.',
};
const removeFailedLabel: StaticTranslationString = {
  de: 'Das Gerät konnte nicht abgemeldet werden.',
  fr: "L'appareil n'a pas pu être désinscrit.",
  en: 'The device could not be removed.',
};

/** The label an editor sees for a `registrationSource` value, as the collection declares it. */
const useRegistrationSourceLabel = (): ((value: string | null) => string) => {
  const { getEntityConfig } = useConfig();
  const { i18n } = useTranslation();
  const field = getEntityConfig({ collectionSlug: SUBSCRIPTIONS_SLUG }).fields.find(
    (candidate) => 'name' in candidate && candidate.name === 'registrationSource',
  );
  const options = field !== undefined && 'options' in field ? field.options : [];

  return (value) => {
    if (value === null) return '–';
    for (const option of options) {
      if (typeof option === 'string') {
        if (option === value) return option;
      } else if (option.value === value) {
        // A label is a string or one per language here; JSX or a function says nothing in a
        // table cell, so those show the stored value.
        const { label } = option;
        if (typeof label === 'string') return label;
        if (typeof label === 'object' && !isValidElement(label)) {
          const perLanguage = label as Record<string, string | undefined>;
          return perLanguage[i18n.language] ?? perLanguage['de'] ?? value;
        }
        return value;
      }
    }
    return value;
  };
};

const PushDeviceRow: React.FC<{
  device: PushDevice;
  locale: Locale;
  sourceLabel: string;
  onChanged: () => void;
}> = ({ device, locale, sourceLabel, onChanged }) => {
  const [DocumentDrawer, , { openDrawer }] = useDocumentDrawer({
    collectionSlug: SUBSCRIPTIONS_SLUG,
    id: device.id,
    // the collection is hidden from the sidebar, its documents still open here
    overrideEntityVisibility: true,
  });
  const { openModal } = useModal();
  const deleteDevice = trpc.pushTracking.deletePushDevice.useMutation();
  const label = describePushDevice(device, locale);
  const isStale = isPushDeviceStale(device.lastUsedAt);
  const confirmSlug = `remove-push-device-${device.id}`;
  const Icon = /Windows|macOS|Linux|ChromeOS/.test(label.name) ? Laptop : Smartphone;

  const remove = async (): Promise<void> => {
    try {
      await deleteDevice.mutateAsync({ id: device.id });
      toast.success(removedLabel[locale]);
    } catch {
      toast.error(removeFailedLabel[locale]);
    }
    onChanged();
  };

  return (
    <tr
      className={cn('odd:bg-(--theme-elevation-50)', { 'text-(--theme-elevation-500)': isStale })}
    >
      <td className={CELL}>
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-(--theme-elevation-100)">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <div>{label.name}</div>
            {label.detail !== undefined && (
              <div className="text-sm text-(--theme-elevation-500)">{label.detail}</div>
            )}
          </div>
        </div>
      </td>
      <td className={cn(CELL, 'whitespace-nowrap')}>
        <Pill pillStyle="light-gray" size="small">
          {device.platform === 'web' ? webPushLabel[locale] : nativeAppLabel[locale]}
        </Pill>
      </td>
      <td className={CELL}>{sourceLabel}</td>
      <td className={cn(CELL, 'whitespace-nowrap')}>
        {device.lastUsedAt === null
          ? '–'
          : formatDistanceToNowStrict(new Date(device.lastUsedAt), {
              addSuffix: true,
              locale: DATE_LOCALES[locale],
            })}
        {isStale && (
          <Pill className="ml-2" pillStyle="warning" size="small">
            {inactiveLabel[locale]}
          </Pill>
        )}
      </td>
      <td className={cn(CELL, 'text-right whitespace-nowrap')}>
        <div className="flex justify-end gap-2">
          <Button buttonStyle="pill" className="m-0" onClick={openDrawer} size="small">
            {detailsLabel[locale]}
          </Button>
          {/* outlined in red: it removes something, and asks first */}
          <Button
            buttonStyle="secondary"
            className="m-0 text-(--theme-error-500) shadow-[inset_0_0_0_1px_var(--theme-error-400)]"
            disabled={deleteDevice.isPending}
            onClick={() => openModal(confirmSlug)}
            size="small"
          >
            {deleteDevice.isPending ? removingLabel[locale] : removeLabel[locale]}
          </Button>
        </div>
        <DocumentDrawer onDelete={onChanged} onSave={onChanged} />
        <ConfirmationModal
          body={removeBody[locale]}
          confirmLabel={removeLabel[locale]}
          confirmingLabel={removingLabel[locale]}
          heading={removeHeading(label.name)[locale]}
          modalSlug={confirmSlug}
          onConfirm={remove}
        />
      </td>
    </tr>
  );
};

const PushDeviceTable: React.FC<{ userId: string; locale: Locale }> = ({ userId, locale }) => {
  const {
    data: devices,
    isLoading,
    refetch,
  } = trpc.pushTracking.getPushDeviceList.useQuery(
    { userId },
    // Someone else's devices have no place in the cache the browser keeps across visits, and a
    // restored copy would show devices that are long gone.
    { meta: { persist: false } },
  );
  const sourceLabelOf = useRegistrationSourceLabel();

  const renderRows = (): JSX.Element | JSX.Element[] => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className={CELL}>
            <ShimmerEffect height={120} />
          </td>
        </tr>
      );
    }
    if (devices === undefined || devices.length === 0) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className={cn(CELL, 'text-(--theme-elevation-500)')}>
            {noDevicesLabel[locale]}
          </td>
        </tr>
      );
    }
    return devices.map((device) => (
      <PushDeviceRow
        key={device.id}
        device={device}
        locale={locale}
        sourceLabel={sourceLabelOf(device.registrationSource)}
        onChanged={() => void refetch()}
      />
    ));
  };

  return (
    <section className="mb-12">
      <SectionHeading title={devicesTitle[locale]} description={devicesDescription[locale]} />
      {/* Styled after Payload's list table, see the notification history for why not `.table`. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="text-(--theme-elevation-400)">
            <tr>
              {(['device', 'channel', 'source', 'lastUsed'] as const).map((column) => (
                <th key={column} className={cn(CELL, 'text-left font-normal')}>
                  {columnLabels[column][locale]}
                </th>
              ))}
              <th className={CELL} />
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
    </section>
  );
};

const UserPushDevicesContent: React.FC = () => {
  const { id } = useDocumentInfo();
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);

  if (id === undefined) return <></>;
  const userId = String(id);

  return (
    <>
      <PushDeviceTable userId={userId} locale={locale} />
      <NotificationHistory userId={userId} locale={locale} />
    </>
  );
};

/**
 * The push devices of a person and every push sent to them, rendered as a `ui` field on the
 * user. It loads its data itself, through procedures only full admins may call, so nothing of
 * it rides along when other code reads a user.
 */
const UserPushDevices: React.FC = () => (
  <TRPCProvider>
    <UserPushDevicesContent />
  </TRPCProvider>
);

export default UserPushDevices;
