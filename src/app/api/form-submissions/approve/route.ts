import config from '@payload-config';
import { revalidateTag } from 'next/cache';
import { getPayload } from 'payload';

function renderHtmlResponse(
  title: string,
  message: string,
  detail?: string,
  isSuccess = true,
): Response {
  const iconSvg = isSuccess
    ? `<svg class="icon success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="icon error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - conveniat27</title>
  <style>
    :root {
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --success-green: #10b981;
      --error-red: #ef4444;
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
      background-color: ${isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
    }
    .icon {
      width: 2.25rem;
      height: 2.25rem;
    }
    .icon.success { color: var(--success-green); }
    .icon.error { color: var(--error-red); }
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
    <h1>${title}</h1>
    <p>${message}</p>
    ${typeof detail === 'string' && detail.length > 0 ? `<div class="detail">${detail}</div>` : ''}
    <div class="footer">
      conveniat27 — Schweizer Pfadifeld- & Cevi-Lager
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: isSuccess ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const id = searchParams.get('id');
    const trimmedToken = token === null ? '' : token.trim();
    if (trimmedToken.length === 0) {
      return renderHtmlResponse(
        'Freigabe fehlgeschlagen',
        'Es wurde kein gültiger Freigabe-Token in der Anfrage übermittelt.',
        undefined,
        false,
      );
    }

    const payload = await getPayload({ config });

    let submission;
    if (typeof id === 'string' && id.trim().length > 0) {
      try {
        const found = await payload.findByID({
          collection: 'form-submissions',
          id: id.trim(),
          depth: 1,
          overrideAccess: true,
        });
        if (found.approvalToken === trimmedToken) {
          submission = found;
        }
      } catch {
        // Fallback to token lookup
      }
    }

    if (submission === undefined) {
      const results = await payload.find({
        collection: 'form-submissions',
        where: {
          approvalToken: { equals: trimmedToken },
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });
      submission = results.docs[0];
    }

    if (submission === undefined) {
      return renderHtmlResponse(
        'Ungültiger Freigabe-Link',
        'Der verwendete Link zur Freigabe der Formular-Antwort ist ungültig oder abgelaufen.',
        undefined,
        false,
      );
    }

    const wasAlreadyApproved = submission.approved === true;

    if (!wasAlreadyApproved) {
      await payload.update({
        collection: 'form-submissions',
        id: submission.id,
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
      typeof submission.form === 'object' && 'title' in submission.form
        ? String(submission.form.title)
        : undefined;

    const detailMessage =
      typeof formTitle === 'string' && formTitle.length > 0
        ? `Formular: ${formTitle}`
        : `Antwort ID: ${submission.id}`;

    return renderHtmlResponse(
      'Formular-Antwort freigegeben',
      wasAlreadyApproved
        ? 'Diese Formular-Antwort wurde bereits freigegeben.'
        : 'Vielen Dank! Die Formular-Antwort wurde erfolgreich freigegeben.',
      detailMessage,
      true,
    );
  } catch (error) {
    console.error('Error during form submission approval:', error);
    return renderHtmlResponse(
      'Serverfehler',
      'Bei der Freigabe der Formular-Antwort ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
      undefined,
      false,
    );
  }
}
