import { escapeHTML } from '@/features/payload-cms/payload-cms/utils/html-utils';
import config from '@payload-config';
import { revalidateTag } from 'next/cache';
import { getPayload } from 'payload';

interface RenderHtmlOptions {
  title: string;
  message: string;
  detail?: string;
  status?: number;
  variant?: 'success' | 'error' | 'confirm';
  formAction?: string;
  token?: string;
  id?: string;
}

function renderHtmlResponse({
  title,
  message,
  detail,
  status = 200,
  variant = 'success',
  formAction = '/api/form-submissions/approve',
  token,
  id,
}: RenderHtmlOptions): Response {
  const safeTitle = escapeHTML(title);
  const safeMessage = escapeHTML(message);
  const safeDetail =
    typeof detail === 'string' && detail.length > 0 ? escapeHTML(detail) : undefined;
  const safeFormAction = escapeHTML(formAction);
  const safeToken = typeof token === 'string' ? escapeHTML(token) : '';
  const safeId = typeof id === 'string' ? escapeHTML(id) : '';

  let iconSvg = '';
  if (variant === 'success') {
    iconSvg = `<svg class="icon success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (variant === 'error') {
    iconSvg = `<svg class="icon error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  } else {
    iconSvg = `<svg class="icon confirm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  let iconBg = 'rgba(37, 99, 235, 0.1)';
  if (variant === 'success') {
    iconBg = 'rgba(16, 185, 129, 0.1)';
  } else if (variant === 'error') {
    iconBg = 'rgba(239, 68, 68, 0.1)';
  }

  const actionFormHtml =
    variant === 'confirm'
      ? `<form method="POST" action="${safeFormAction}">
          <input type="hidden" name="token" value="${safeToken}" />
          <input type="hidden" name="id" value="${safeId}" />
          <button type="submit" class="button">Jetzt freigeben</button>
        </form>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - conveniat27</title>
  <style>
    :root {
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --success-green: #10b981;
      --error-red: #ef4444;
      --confirm-blue: #2563eb;
      --border-color: #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #0b0f19;
        --card-bg: #1e293b;
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --border-color: #334155;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 1rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      max-width: 480px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      margin-bottom: 1.25rem;
      background-color: ${iconBg};
    }
    .icon {
      width: 2.25rem;
      height: 2.25rem;
    }
    .icon.success { color: var(--success-green); }
    .icon.error { color: var(--error-red); }
    .icon.confirm { color: var(--confirm-blue); }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    p {
      font-size: 1rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    .detail {
      font-size: 0.875rem;
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      word-break: break-word;
    }
    .button {
      display: inline-block;
      width: 100%;
      padding: 0.875rem 1.5rem;
      margin-top: 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      background-color: var(--confirm-blue);
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.2s ease;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      ${iconSvg}
    </div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${typeof safeDetail === 'string' && safeDetail.length > 0 ? `<div class="detail">${safeDetail}</div>` : ''}
    ${actionFormHtml}
    <div class="footer">
      conveniat27 — Schweizer Pfadifeld- & Cevi-Lager
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline';",
    },
  });
}

async function findSubmissionByToken(
  token: string,
  id?: string,
): Promise<{
  payload: Awaited<ReturnType<typeof getPayload>>;
  submission: Record<string, unknown> | undefined;
}> {
  const payload = await getPayload({ config });
  const trimmedToken = token.trim();

  if (typeof id === 'string' && id.trim().length > 0) {
    try {
      const found = (await payload.findByID({
        collection: 'form-submissions',
        id: id.trim(),
        depth: 1,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>;
      if (found['approvalToken'] === trimmedToken) {
        return { payload, submission: found };
      }
    } catch {
      // Fallback to token lookup
    }
  }

  const results = await payload.find({
    collection: 'form-submissions',
    where: {
      approvalToken: { equals: trimmedToken },
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  return { payload, submission: results.docs[0] as unknown as Record<string, unknown> | undefined };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const id = searchParams.get('id');
    const trimmedToken = token === null ? '' : token.trim();

    if (trimmedToken.length === 0) {
      return renderHtmlResponse({
        title: 'Freigabe fehlgeschlagen',
        message: 'Es wurde kein gültiger Freigabe-Token in der Anfrage übermittelt.',
        status: 400,
        variant: 'error',
      });
    }

    const { submission } = await findSubmissionByToken(trimmedToken, id ?? undefined);

    if (submission === undefined) {
      return renderHtmlResponse({
        title: 'Ungültiger Freigabe-Link',
        message:
          'Der verwendete Link zur Freigabe der Formular-Antwort ist ungültig oder abgelaufen.',
        status: 400,
        variant: 'error',
      });
    }

    const formTitle =
      typeof submission['form'] === 'object' &&
      submission['form'] !== null &&
      'title' in submission['form']
        ? String((submission['form'] as Record<string, unknown>)['title'])
        : undefined;

    const submissionId = String(submission['id']);

    const detailMessage =
      typeof formTitle === 'string' && formTitle.length > 0
        ? `Formular: ${formTitle}`
        : `Antwort ID: ${submissionId}`;

    if (submission['approved'] === true) {
      return renderHtmlResponse({
        title: 'Formular-Antwort freigegeben',
        message: 'Diese Formular-Antwort wurde bereits freigegeben.',
        detail: detailMessage,
        status: 200,
        variant: 'success',
      });
    }

    return renderHtmlResponse({
      title: 'Formular-Antwort freigeben',
      message: 'Möchtest du diese Formular-Antwort freigeben?',
      detail: detailMessage,
      status: 200,
      variant: 'confirm',
      token: trimmedToken,
      id: submissionId,
    });
  } catch (error) {
    console.error('Error handling GET /api/form-submissions/approve:', error);
    return renderHtmlResponse({
      title: 'Serverfehler',
      message:
        'Bei der Freigabe der Formular-Antwort ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
      status: 500,
      variant: 'error',
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    let token: string | undefined;
    let id: string | undefined;

    const contentType = request.headers.get('content-type') ?? '';
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData();
      const rawToken = formData.get('token');
      const rawId = formData.get('id');
      token = typeof rawToken === 'string' ? rawToken : undefined;
      id = typeof rawId === 'string' ? rawId : undefined;
    } else if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as { token?: string; id?: string };
      token = body.token;
      id = body.id;
    }

    if (token === undefined || id === undefined) {
      const { searchParams } = new URL(request.url);
      const queryToken = searchParams.get('token');
      const queryId = searchParams.get('id');
      token = token ?? queryToken ?? undefined;
      id = id ?? queryId ?? undefined;
    }

    const trimmedToken = token === undefined ? '' : token.trim();

    if (trimmedToken.length === 0) {
      return renderHtmlResponse({
        title: 'Freigabe fehlgeschlagen',
        message: 'Es wurde kein gültiger Freigabe-Token in der Anfrage übermittelt.',
        status: 400,
        variant: 'error',
      });
    }

    const { payload, submission } = await findSubmissionByToken(trimmedToken, id);

    if (submission === undefined) {
      return renderHtmlResponse({
        title: 'Ungültiger Freigabe-Link',
        message:
          'Der verwendete Link zur Freigabe der Formular-Antwort ist ungültig oder abgelaufen.',
        status: 400,
        variant: 'error',
      });
    }

    const wasAlreadyApproved = submission['approved'] === true;

    if (!wasAlreadyApproved) {
      await payload.update({
        collection: 'form-submissions',
        id: String(submission['id']),
        data: {
          approved: true,
        },
        overrideAccess: true,
      });

      try {
        revalidateTag('payload', 'max');
        revalidateTag('collection:form-submissions', 'max');
      } catch {
        // Non-critical revalidation failure
      }
    }

    const formTitle =
      typeof submission['form'] === 'object' &&
      submission['form'] !== null &&
      'title' in submission['form']
        ? String((submission['form'] as Record<string, unknown>)['title'])
        : undefined;

    const submissionId = String(submission['id']);

    const detailMessage =
      typeof formTitle === 'string' && formTitle.length > 0
        ? `Formular: ${formTitle}`
        : `Antwort ID: ${submissionId}`;

    return renderHtmlResponse({
      title: 'Formular-Antwort freigegeben',
      message: wasAlreadyApproved
        ? 'Diese Formular-Antwort wurde bereits freigegeben.'
        : 'Vielen Dank! Die Formular-Antwort wurde erfolgreich freigegeben.',
      detail: detailMessage,
      status: 200,
      variant: 'success',
    });
  } catch (error) {
    console.error('Error during form submission approval POST:', error);
    return renderHtmlResponse({
      title: 'Serverfehler',
      message:
        'Bei der Freigabe der Formular-Antwort ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
      status: 500,
      variant: 'error',
    });
  }
}
