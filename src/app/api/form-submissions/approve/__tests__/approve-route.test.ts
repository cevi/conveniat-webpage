import { GET, POST } from '@/app/api/form-submissions/approve/route';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

describe('/api/form-submissions/approve route', () => {
  const mockPayload = {
    findByID: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
  });

  describe('GET /api/form-submissions/approve', () => {
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

    it('returns confirmation page on GET without mutating state', async () => {
      const mockSubmission = {
        id: 'sub-123',
        approved: false,
        approvalToken: 'valid-token-123',
        form: { title: 'Kontaktformular' },
      };
      mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });

      const request = new Request(
        'http://localhost:3000/api/form-submissions/approve?token=valid-token-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPayload.update).not.toHaveBeenCalled();
      const html = await response.text();
      expect(html).toContain('Formular-Antwort freigeben');
      expect(html).toContain('Möchtest du diese Formular-Antwort freigeben?');
      expect(html).toContain('Formular: Kontaktformular');
      expect(html).toContain('<form method="POST"');
      expect(html).toContain('Jetzt freigeben');
    });

    it('escapes HTML in form title to prevent XSS', async () => {
      const mockSubmission = {
        id: 'sub-xss',
        approved: false,
        approvalToken: 'valid-token-xss',
        form: { title: '<script>alert("xss")</script>' },
      };
      mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });

      const request = new Request(
        'http://localhost:3000/api/form-submissions/approve?token=valid-token-xss',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
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

  describe('POST /api/form-submissions/approve', () => {
    it('approves submission and returns 200 HTML response on valid POST', async () => {
      const mockSubmission = {
        id: 'sub-123',
        approved: false,
        approvalToken: 'valid-token-123',
        form: { title: 'Kontaktformular' },
      };
      mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });
      mockPayload.update.mockResolvedValue({ ...mockSubmission, approved: true });

      const formData = new FormData();
      formData.append('token', 'valid-token-123');
      formData.append('id', 'sub-123');

      const request = new Request('http://localhost:3000/api/form-submissions/approve', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

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

    it('escapes HTML in form title on POST response as well', async () => {
      const mockSubmission = {
        id: 'sub-xss-post',
        approved: false,
        approvalToken: 'token-xss-post',
        form: { title: '<img src=x onerror=alert(1)>' },
      };
      mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });
      mockPayload.update.mockResolvedValue({ ...mockSubmission, approved: true });

      const request = new Request('http://localhost:3000/api/form-submissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token-xss-post', id: 'sub-xss-post' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('returns 200 HTML response on POST if submission was already approved', async () => {
      const mockSubmission = {
        id: 'sub-456',
        approved: true,
        approvalToken: 'already-approved-token',
        form: { title: 'Anmeldeformular' },
      };
      mockPayload.find.mockResolvedValue({ docs: [mockSubmission] });

      const request = new Request(
        'http://localhost:3000/api/form-submissions/approve?token=already-approved-token&id=sub-456',
        { method: 'POST' },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPayload.update).not.toHaveBeenCalled();
      const html = await response.text();
      expect(html).toContain('Diese Formular-Antwort wurde bereits freigegeben.');
    });
  });
});
