/* eslint-disable unicorn/no-null */
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

export class PayloadParticipantRepositoryAdapter implements ParticipantRepositoryPort {
  constructor(private readonly payload: Payload) {}

  async findById(id: string): Promise<BillParticipant | null> {
    const result = await this.payload.findByID({
      collection: 'bill-participants',
      context: { internal: true },
      id,
    });
    return result;
  }

  async findByParticipationUuid(uuid: string): Promise<BillParticipant | null> {
    const result = await this.payload.find({
      collection: 'bill-participants',
      context: { internal: true },
      where: {
        participationUuid: { equals: uuid },
      },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  async findRemovedParticipant(userId: string, eventId: string): Promise<BillParticipant | null> {
    const result = await this.payload.find({
      collection: 'bill-participants',
      context: { internal: true },
      where: {
        and: [
          { userId: { equals: userId } },
          { eventId: { equals: eventId } },
          { status: { equals: 'removed' } },
        ],
      },
      limit: 1,
    });
    return result.docs[0] ?? null;
  }

  async findActiveForEvent(eventId: string): Promise<BillParticipant[]> {
    const result = await this.payload.find({
      collection: 'bill-participants',
      context: { internal: true },
      where: {
        and: [{ eventId: { equals: eventId } }, { status: { not_equals: 'removed' } }],
      },
      limit: 10_000,
    });
    return result.docs;
  }

  async findForRegenerateAll(): Promise<BillParticipant[]> {
    const result = await this.payload.find({
      collection: 'bill-participants',
      where: {
        or: [{ status: { equals: 'bill_created' } }, { status: { equals: 'bill_sent' } }],
      },
      limit: 10_000,
      context: { internal: true },
    });
    return result.docs;
  }

  async create(
    data: Omit<BillParticipant, 'id' | 'createdAt' | 'updatedAt' | 'relatedEmails'>,
  ): Promise<BillParticipant> {
    const created = await this.payload.create({
      collection: 'bill-participants',
      context: { internal: true },
      data,
      draft: false,
    });
    return created;
  }

  async update(
    id: string,
    data: Partial<Omit<BillParticipant, 'id' | 'createdAt' | 'updatedAt' | 'relatedEmails'>>,
  ): Promise<BillParticipant> {
    const updated = await this.payload.update({
      collection: 'bill-participants',
      context: { internal: true },
      id,
      data,
    });
    return updated;
  }

  async findPdfFilenameById(id: string): Promise<string | null> {
    const pdfDocument = await this.payload.findByID({
      collection: 'bill-pdfs',
      id,
      context: { internal: true },
    });
    return pdfDocument.filename ?? null;
  }
}
