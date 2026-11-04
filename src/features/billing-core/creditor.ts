import type { BillSetting } from '@/features/payload-cms/payload-types';

/** The creditor printed on a bill and encoded in its QR code. */
export interface BillCreditor {
  name: string;
  street: string;
  buildingNumber?: string | undefined;
  zip: string;
  city: string;
  account: string;
  country: string;
  uid?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
}

/** Reads an optional settings text, treating an empty one as not configured. */
export const optionalSetting = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * The creditor printed on every bill, built from the camp bill settings. Camp bills, their
 * preview and the Besuchstag bills all go through here: both are paid into the same account.
 * The MWST-Nr. is not optional in practice: adult bills charge VAT, which requires it.
 */
export function buildCreditorFromSettings(
  settings: Pick<
    BillSetting,
    | 'creditorName'
    | 'creditorIban'
    | 'creditorStreet'
    | 'creditorBuildingNumber'
    | 'creditorZip'
    | 'creditorCity'
    | 'creditorUid'
    | 'creditorEmail'
    | 'creditorWebsite'
  >,
): BillCreditor {
  const buildingNumber = optionalSetting(settings.creditorBuildingNumber);
  const uid = optionalSetting(settings.creditorUid);
  const email = optionalSetting(settings.creditorEmail);
  const website = optionalSetting(settings.creditorWebsite);
  return {
    name: settings.creditorName,
    street: settings.creditorStreet,
    ...(buildingNumber === undefined ? {} : { buildingNumber }),
    zip: settings.creditorZip ?? '',
    city: settings.creditorCity ?? '',
    account: settings.creditorIban,
    country: 'CH',
    ...(uid === undefined ? {} : { uid }),
    ...(email === undefined ? {} : { email }),
    ...(website === undefined ? {} : { website }),
  };
}
