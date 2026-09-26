const mockPayload = {
  find: jest.fn<Promise<unknown>, [unknown]>(),
  create: jest.fn<Promise<unknown>, [unknown]>(),
  update: jest.fn<Promise<unknown>, [unknown]>(),
};
const mockSend = jest.fn();
const mockSettings = jest.fn();

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<typeof mockPayload> => Promise.resolve(mockPayload),
  ValidationError: class extends Error {
    public data: { errors: { path: string; message: string }[] };
    public constructor(data: { errors: { path: string; message: string }[] }) {
      super('The following field is invalid');
      this.data = data;
    }
  },
}));
jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
  s3Client: { send: (...parameters: unknown[]): unknown => mockSend(...parameters) },
  s3ClientPublic: {},
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));
jest.mock('@/features/hof-dashboard/api/hof-dashboard-data', () => ({
  getHofDashboardSettings: (...parameters: unknown[]): unknown => mockSettings(...parameters),
}));

import {
  completeHofUpload,
  updateHofMaterialOrder,
} from '@/features/hof-dashboard/api/hof-dashboard-mutations';
import { ValidationError } from 'payload';

const PDF_BYTES = new TextEncoder().encode('%PDF-1.4');

const upload = (key: string): Promise<void> =>
  completeHofUpload({
    hofId: 'hof-nord',
    submissionType: 'hofBuildings',
    kind: 'plan',
    key,
    filename: 'Plan.pdf',
    userId: 'user-8',
  });

const order = (
  overrides: Partial<Parameters<typeof updateHofMaterialOrder>[0]> = {},
): Promise<void> =>
  updateHofMaterialOrder({
    hofId: 'hof-nord',
    orderType: 'infrastructure',
    quantities: [{ itemId: 'rope', quantity: 3 }],
    powerConnection: false,
    userId: 'user-8',
    mayPassDeadline: false,
    ...overrides,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockPayload.find.mockResolvedValue({ docs: [] });
  mockPayload.create.mockResolvedValue({ id: 'created' });
  mockSend.mockResolvedValue({
    ContentLength: PDF_BYTES.length,
    Body: { transformToByteArray: (): Promise<Uint8Array> => Promise.resolve(PDF_BYTES) },
  });
  mockSettings.mockResolvedValue({
    infrastructureOrder: {
      deadline: '2999-01-31T12:00:00.000Z',
      items: [{ id: 'rope', name: 'Bindestrick' }],
    },
  });
});

describe('completeHofUpload', () => {
  it('refuses a file uploaded for another Hof', async () => {
    await expect(upload('temp/hof-dashboard/hof-sued/abc-Plan.pdf')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("files an upload under the Hof's submission and marks it handed in", async () => {
    await upload('temp/hof-dashboard/hof-nord/abc-Plan.pdf');
    const fileCreate = mockPayload.create.mock.calls
      .map(([options]) => options)
      .find((options) => (options as { collection?: string }).collection === 'hof-files');
    expect(fileCreate).toMatchObject({
      data: { hof: 'hof-nord', originalFilename: 'Plan.pdf' },
    });
    expect(mockPayload.update.mock.calls[0]?.[0]).toMatchObject({
      collection: 'hof-submissions',
      data: { status: 'submitted' },
    });
  });

  it('answers a file whose content does not match its ending as an unsupported type', async () => {
    mockPayload.create
      .mockResolvedValueOnce({ id: 'submission' })
      .mockRejectedValueOnce(
        new ValidationError({ errors: [{ path: 'file', message: 'invalid' }] }),
      );
    await expect(upload('temp/hof-dashboard/hof-nord/abc-Plan.pdf')).rejects.toMatchObject({
      message: 'unsupported_file_type',
    });
  });
});

describe('updateHofMaterialOrder', () => {
  it('stores the order with the German name of each material', async () => {
    await order();
    expect(mockSettings).toHaveBeenCalledWith(mockPayload, 'de');
    expect(mockPayload.create.mock.calls[0]?.[0]).toMatchObject({
      data: { items: [{ itemId: 'rope', name: 'Bindestrick', quantity: 3 }] },
    });
  });

  it('is closed after the deadline, except for the reviewers', async () => {
    mockSettings.mockResolvedValue({
      infrastructureOrder: {
        deadline: '2000-01-31T12:00:00.000Z',
        items: [{ id: 'rope', name: 'Bindestrick' }],
      },
    });
    await expect(order()).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'order_closed' });
    await expect(order({ mayPassDeadline: true })).resolves.toBeUndefined();
  });

  it('refuses material the list no longer has, instead of dropping it', async () => {
    await expect(order({ quantities: [{ itemId: 'spade', quantity: 1 }] })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'order_list_changed',
    });
    expect(mockPayload.create).not.toHaveBeenCalled();
  });
});
