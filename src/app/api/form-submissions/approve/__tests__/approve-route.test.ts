import { GET, POST } from '@/app/api/form-submissions/approve/route';
import { summarizeHofSubmission } from '@/features/hof-dashboard/api/hof-submission-summary';
import type { Locale } from '@/types/types';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

// the Hof's dashboard, which names a Hof's submission, is tested on its own
jest.mock('@/features/hof-dashboard/api/hof-submission-summary', () => ({
  summarizeHofSubmission: jest.fn(),
}));

let mockLocale: Locale = 'de';
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: (): Promise<Locale> => Promise.resolve(mockLocale),
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ error: jest.fn(), warn: jest.fn() }),
}));

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
    mockLocale = 'de';
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
        // nobody is signed in: the review history of a Hof's submission names the link instead
        context: { hofReviewer: { id: '', name: 'Freigabe-Link (E-Mail)' } },
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

  describe("a Hof's submission", () => {
    /** A stand of Cevi Uster, handed in and not yet looked at. */
    const STAND = {
      id: 'sub-stand',
      approved: false,
      approvalToken: 'stand-token',
      hof: { id: 'hof-uster', name: 'Cevi Uster' },
      form: { title: 'Standanmeldung fürs Stadtleben' },
    };
    const summary = jest.mocked(summarizeHofSubmission);

    beforeEach(() => {
      mockPayload.find.mockResolvedValue({ docs: [STAND] });
      summary.mockResolvedValue({
        form: 'Stadtleben',
        hof: 'Cevi Uster',
        entry: 'Version 2',
        status: 'submitted',
      });
    });

    it('names it as the dashboard does, and says approving is its "Freigegeben"', async () => {
      const response = await GET(
        new Request('http://localhost:3000/api/form-submissions/approve?token=stand-token'),
      );

      expect(summary).toHaveBeenCalledWith('hof-uster', 'sub-stand', 'de');
      const html = await response.text();
      expect(html).toContain('Stadtleben · Cevi Uster · Version 2');
      expect(html).toContain('Status: Eingereicht');
      expect(html).toContain('dasselbe wie «Freigegeben» im Hof-Dashboard');
      expect(html).not.toContain('Formular: Standanmeldung');
    });

    it('shows the status it now has on the dashboard once approved', async () => {
      mockPayload.update.mockResolvedValue({ ...STAND, approved: true });

      const response = await POST(
        new Request('http://localhost:3000/api/form-submissions/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'stand-token', id: 'sub-stand' }),
        }),
      );

      const html = await response.text();
      expect(html).toContain('Stadtleben · Cevi Uster · Version 2');
      expect(html).toContain('Status: Freigegeben');
    });

    it('falls back to the form when the dashboard cannot name it', async () => {
      summary.mockRejectedValue(new Error('Hof gone'));

      const response = await GET(
        new Request('http://localhost:3000/api/form-submissions/approve?token=stand-token'),
      );

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('Formular: Standanmeldung fürs Stadtleben');
      expect(html).toContain('<form method="POST"');
    });

    it("speaks the reader's language, with the dashboard's words for it", async () => {
      mockLocale = 'fr';

      const response = await GET(
        new Request('http://localhost:3000/api/form-submissions/approve?token=stand-token'),
      );

      expect(summary).toHaveBeenCalledWith('hof-uster', 'sub-stand', 'fr');
      const html = await response.text();
      expect(html).toContain('<html lang="fr">');
      expect(html).toContain('Valider maintenant');
      expect(html).toContain('Statut : Déposé');
      expect(html).toContain('même chose que « Validé »');
    });
  });
});
