import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import { recordVisitDayBillEvent } from '@/features/visit-day/billing/visit-day-bill-events';
import type { SendVisitDayBillInput } from '@/features/visit-day/billing/visit-day-bill-mail';
import { SEND_VISIT_DAY_BILL_TASK } from '@/features/visit-day/billing/visit-day-bill-mail';
import {
  visitDayBillReference,
  visitDayInvoiceNumber,
} from '@/features/visit-day/billing/visit-day-bill-reference';
import { toDatabaseDate } from '@/features/visit-day/visit-day-settings';
import type { Locale } from '@/types/types';
import type { Payload, PayloadRequest } from 'payload';

/** Which answers of the form hold the payer, as the Besuchstag field names them. */
export interface BillAnswerFields {
  issuesBill?: boolean | null;
  billFirstNameField?: string | null;
  billLastNameField?: string | null;
  billEmailField?: string | null;
  billStreetField?: string | null;
  billPostalCodeField?: string | null;
  billCityField?: string | null;
  /** read per person, `oev_abo_1`, `oev_abo_2`, for the rail tickets */
  travelPassField?: string | null;
}

/** What a saved registration tells its bill. */
export interface NewVisitDayBill {
  submissionId: string;
  registrationId: string;
  registrationNumber: string;
  billNumber: number;
  /** `YYYY-MM-DD` */
  date: string;
  hofId: string | undefined;
  persons: number;
  withLunch: boolean;
  locale: Locale;
  answers: { field: string; value: unknown }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const answerOf = (
  answers: NewVisitDayBill['answers'],
  field: string | null | undefined,
): string | undefined => {
  if (typeof field !== 'string' || field === '') return undefined;
  const value = answers.find((answer) => answer.field === field)?.value;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

/**
 * Issues the bill of a registration just saved: one ticket per person at the price of their
 * lunch choice, the payer and address from the answers the Besuchstag field names, and the
 * language of the form. The PDF and the mail follow in a job, so a slow PDF never holds up the
 * registration, and a mail that fails can be sent again.
 *
 * Runs inside the registration's save, with its `req`: a bill that cannot be written fails the
 * registration, which then gives its places back, rather than leaving a visitor nobody bills.
 *
 * @returns the bill's id, or undefined when the field sends no bill
 */
export async function createVisitDayBill(
  payload: Payload,
  registration: NewVisitDayBill,
  fields: BillAnswerFields,
  request: PayloadRequest,
): Promise<string | undefined> {
  if (fields.issuesBill === false) return undefined;

  const settings = await payload.findGlobal({
    slug: 'visit-day-bill-settings',
    depth: 0,
    overrideAccess: true,
    req: request,
  });
  const amount = calculateVisitDayBill(
    registration,
    {
      withLunch: settings.priceWithLunch,
      withoutLunch: settings.priceWithoutLunch,
      vatRate: settings.vatRate,
    },
    registration.locale,
  );
  const issuedAt = new Date();
  const dueDate = new Date(issuedAt.getTime() + settings.paymentDeadlineDays * DAY_MS);
  const invoiceNumber = visitDayInvoiceNumber(
    settings.invoiceNumberPrefix,
    registration.billNumber,
    1,
    issuedAt,
  );
  const referenceNumber = visitDayBillReference(registration.billNumber, 1);
  const firstName = answerOf(registration.answers, fields.billFirstNameField);
  const lastName = answerOf(registration.answers, fields.billLastNameField);
  const fullName = [firstName, lastName].filter((part) => part !== undefined).join(' ');
  const street = answerOf(registration.answers, fields.billStreetField);
  const postalCode = answerOf(registration.answers, fields.billPostalCodeField);
  const city = answerOf(registration.answers, fields.billCityField);
  const email = answerOf(registration.answers, fields.billEmailField);
  const travelPasses = Array.from({ length: registration.persons }, (_, index) => ({
    personNumber: index + 1,
    pass:
      typeof fields.travelPassField === 'string' && fields.travelPassField !== ''
        ? (answerOf(registration.answers, `${fields.travelPassField}_${String(index + 1)}`) ?? '')
        : '',
  }));

  const bill = await payload.create({
    collection: 'visit-day-bills',
    overrideAccess: true,
    req: request,
    data: {
      // a ticket nobody pays for is paid from the start
      status: amount.total > 0 ? 'open' : 'paid',
      mailStatus: 'pending',
      registrationNumber: registration.registrationNumber,
      submission: registration.submissionId,
      registrationId: registration.registrationId,
      billNumber: registration.billNumber,
      visitDate: toDatabaseDate(registration.date).toISOString(),
      ...(registration.hofId === undefined ? {} : { hof: registration.hofId }),
      persons: registration.persons,
      withLunch: registration.withLunch,
      locale: registration.locale,
      ...(firstName === undefined ? {} : { firstName }),
      ...(lastName === undefined ? {} : { lastName }),
      fullName,
      ...(email === undefined ? {} : { email }),
      ...(street === undefined ? {} : { street }),
      ...(postalCode === undefined ? {} : { postalCode }),
      ...(city === undefined ? {} : { city }),
      invoiceNumber,
      referenceNumber,
      issue: 1,
      invoiceAmount: amount.total,
      vatAmount: amount.vatAmount,
      vatRate: amount.vatRate,
      issuedAt: issuedAt.toISOString(),
      dueDate: dueDate.toISOString(),
      lines: amount.lines,
      travelPasses,
      issuedBills: [
        {
          invoiceNumber,
          referenceNumber,
          amount: amount.total,
          persons: registration.persons,
          issuedAt: issuedAt.toISOString(),
        },
      ],
    },
  });

  await recordVisitDayBillEvent(
    payload,
    {
      bill: bill.id,
      action: 'created',
      actor: 'Anmeldeformular',
      details:
        `${String(registration.persons)} × ${registration.withLunch ? 'mit' : 'ohne'} Mittagessen, ` +
        `CHF ${amount.total.toFixed(2)}, ${invoiceNumber}, Referenz ${referenceNumber}, ${registration.locale}`,
    },
    request,
  );
  await payload.jobs.queue({
    task: SEND_VISIT_DAY_BILL_TASK,
    input: { billId: bill.id, actor: 'Anmeldeformular' } satisfies SendVisitDayBillInput,
    req: request,
  });
  return bill.id;
}
