import type { BillParticipant } from '@/features/payload-cms/payload-types';

export interface ParticipantRepositoryPort {
  findById(id: string): Promise<BillParticipant | null>;
  findByParticipationUuid(uuid: string): Promise<BillParticipant | null>;
  findRemovedParticipant(userId: string, eventId: string): Promise<BillParticipant | null>;
  findActiveForEvent(eventId: string): Promise<BillParticipant[]>;
  findForRegenerateAll(): Promise<BillParticipant[]>;
  create(
    data: Omit<BillParticipant, 'id' | 'createdAt' | 'updatedAt' | 'relatedEmails'>,
  ): Promise<BillParticipant>;
  update(
    id: string,
    data: Partial<Omit<BillParticipant, 'id' | 'createdAt' | 'updatedAt' | 'relatedEmails'>>,
  ): Promise<BillParticipant>;
  findPdfFilenameById(id: string): Promise<string | null>;
  findPendingBilling(participantId?: string): Promise<BillParticipant[]>;
  uploadPdf(filename: string, buffer: Buffer): Promise<{ id: string }>;
}
