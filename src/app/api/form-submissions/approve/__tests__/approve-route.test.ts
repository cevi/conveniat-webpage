import { GET } from '@/app/api/form-submissions/approve/route';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

describe('GET /api/form-submissions/approve', () => {
  const mockPayload = {
    findByID: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
  });

  it('returns 400 HTML response if token is missing', async () => {
    const request = new Request('http://localhost:3000/api/form-submissions/approve');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('Freigabe fehlgeschlagen');
    expect(html).toContain('Es wurde kein gültiger Freigabe-Token in der Anfrage übermittelt.');
  });

  it('returns 400 HTML response if token is not found in DB', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] });

    const request = new Request(
      'http://localhost:3000/api/form-submissions/approve?token=invalid-token',
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('Ungültiger Freigabe-Link');
  });

  it('approves submission and returns 200 HTML response on valid token', async () => {
    const mockSubmission = {
      id: 'sub-123',
      approved: false,
      approvalToken: 'valid-token-123',
      form: { title: 'Kontaktformular' },
    };
    mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });
    mockPayload.update.mockResolvedValue({ ...mockSubmission, approved: true });

    const request = new Request(
      'http://localhost:3000/api/form-submissions/approve?token=valid-token-123',
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: 'form-submissions',
      id: 'sub-123',
      data: { approved: true },
      overrideAccess: true,
    });
    const html = await response.text();
    expect(html).toContain('Formular-Antwort freigegeben');
    expect(html).toContain('Vielen Dank! Die Formular-Antwort wurde erfolgreich freigegeben.');
    expect(html).toContain('Formular: Kontaktformular');
  });

  it('returns 200 HTML response if submission was already approved', async () => {
    const mockSubmission = {
      id: 'sub-456',
      approved: true,
      approvalToken: 'already-approved-token',
      form: { title: 'Anmeldeformular' },
    };
    mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });

    const request = new Request(
      'http://localhost:3000/api/form-submissions/approve?token=already-approved-token',
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPayload.update).not.toHaveBeenCalled();
    const html = await response.text();
    expect(html).toContain('Diese Formular-Antwort wurde bereits freigegeben.');
  });
});
