const mockAuth = jest.fn<Promise<unknown>, []>();
const mockIsReviewer = jest.fn<boolean, [unknown]>();
const mockGetMaterialOrders = jest.fn<Promise<{ id: string }[]>, [unknown, unknown]>();
const mockRecordExport = jest.fn<Promise<void>, [string[], Date]>();
const mockBuildWorkbook = jest.fn<Promise<Buffer>, [unknown[], Set<string>, string]>();

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve({}) }));
jest.mock('@/utils/auth', () => ({ auth: (): Promise<unknown> => mockAuth() }));
jest.mock('@/utils/auth-helpers', () => ({
  isValidNextAuthUser: (user: unknown): boolean => user !== undefined,
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: (): Promise<string> => Promise.resolve('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ info: jest.fn(), warn: jest.fn() }),
}));
jest.mock('@/features/hof-dashboard/api/accessible-hoefe', () => ({
  isHofDashboardReviewer: (user: unknown): boolean => mockIsReviewer(user),
  listAccessibleHoefe: (): Promise<unknown[]> => Promise.resolve([{ id: 'hof-uster' }]),
}));
jest.mock('@/features/hof-dashboard/api/material-orders', () => ({
  getMaterialOrders: (hoefe: unknown, locale: unknown): Promise<{ id: string }[]> =>
    mockGetMaterialOrders(hoefe, locale),
  recordMaterialOrderExport: (formIds: string[], at: Date): Promise<void> =>
    mockRecordExport(formIds, at),
}));
jest.mock('@/features/hof-dashboard/api/material-orders-export', () => ({
  MATERIAL_EXPORT_SHEETS: ['total', 'perHof', 'remarks', 'versions'],
  buildMaterialOrderWorkbook: (
    forms: unknown[],
    sheets: Set<string>,
    locale: string,
  ): Promise<Buffer> => mockBuildWorkbook(forms, sheets, locale),
}));

import { GET } from '@/app/api/hof-dashboard/material-orders/route';

const request = (query: string): Request =>
  new Request(`http://localhost/api/hof-dashboard/material-orders?${query}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { uuid: 'user-1' } });
  mockIsReviewer.mockReturnValue(true);
  mockGetMaterialOrders.mockResolvedValue([{ id: 'form-infra' }, { id: 'form-stadtleben' }]);
  mockBuildWorkbook.mockResolvedValue(Buffer.from('xlsx'));
  mockRecordExport.mockResolvedValue();
});

describe('GET /api/hof-dashboard/material-orders', () => {
  it('answers a signed-out visitor with 401', async () => {
    mockAuth.mockResolvedValue({});
    const response = await GET(request('sheet=total'));
    expect(response.status).toBe(401);
  });

  it("refuses a Hof's own people, who see no other Hof's orders", async () => {
    mockIsReviewer.mockReturnValue(false);
    const response = await GET(request('sheet=total'));
    expect(response.status).toBe(403);
    expect(mockGetMaterialOrders).not.toHaveBeenCalled();
  });

  it('needs at least one known sheet', async () => {
    const response = await GET(request('sheet=everything'));
    expect(response.status).toBe(400);
  });

  it('exports the chosen form and sheets, and records the export of that form only', async () => {
    const response = await GET(request('form=form-stadtleben&sheet=perHof&sheet=remarks'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('spreadsheetml');
    expect(mockBuildWorkbook).toHaveBeenCalledWith(
      [{ id: 'form-stadtleben' }],
      new Set(['perHof', 'remarks']),
      'de',
    );
    expect(mockRecordExport.mock.calls[0]?.[0]).toEqual(['form-stadtleben']);
  });

  it('exports every material form when none is named', async () => {
    await GET(request('sheet=total'));
    expect(mockRecordExport.mock.calls[0]?.[0]).toEqual(['form-infra', 'form-stadtleben']);
  });
});
