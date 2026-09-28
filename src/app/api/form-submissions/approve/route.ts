import {
  summarizeHofSubmission,
  type HofSubmissionSummary,
} from '@/features/hof-dashboard/api/hof-submission-summary';
import { HOF_ENTRY_STATUS_LABELS, type HofEntryStatus } from '@/features/hof-dashboard/constants';
import { translate as translateHof } from '@/features/hof-dashboard/texts';
import { escapeHTML } from '@/features/payload-cms/payload-cms/utils/html-utils';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { revalidateTag } from 'next/cache';
import { getPayload } from 'payload';

/** How the review history names an approval given through an email's approval link. */
const APPROVED_BY_LINK = 'Freigabe-Link (E-Mail)';

const logger = createLogger('api:form-submission-approval');

const TEXT = {
  failedTitle: {
    de: 'Freigabe fehlgeschlagen',
    en: 'Approval failed',
    fr: 'Échec de la validation',
  },
  noToken: {
    de: 'Es wurde kein gültiger Freigabe-Token in der Anfrage übermittelt.',
    en: 'The request carried no valid approval token.',
    fr: 'La requête ne contient aucun jeton de validation valide.',
  },
  invalidTitle: {
    de: 'Ungültiger Freigabe-Link',
    en: 'Invalid approval link',
    fr: 'Lien de validation invalide',
  },
  invalid: {
    de: 'Der verwendete Link zur Freigabe der Formular-Antwort ist ungültig oder abgelaufen.',
    en: 'This link to approve the form submission is invalid or has expired.',
    fr: 'Ce lien pour valider la réponse au formulaire est invalide ou a expiré.',
  },
  confirmTitle: {
    de: 'Formular-Antwort freigeben',
    en: 'Approve form submission',
    fr: 'Valider la réponse au formulaire',
  },
  confirm: {
    de: 'Möchtest du diese Formular-Antwort freigeben?',
    en: 'Do you want to approve this form submission?',
    fr: 'Veux-tu valider cette réponse au formulaire ?',
  },
  confirmButton: { de: 'Jetzt freigeben', en: 'Approve now', fr: 'Valider maintenant' },
  approvedTitle: {
    de: 'Formular-Antwort freigegeben',
    en: 'Form submission approved',
    fr: 'Réponse au formulaire validée',
  },
  approved: {
    de: 'Vielen Dank! Die Formular-Antwort wurde erfolgreich freigegeben.',
    en: 'Thank you! The form submission is approved.',
    fr: 'Merci ! La réponse au formulaire est validée.',
  },
  alreadyApproved: {
    de: 'Diese Formular-Antwort wurde bereits freigegeben.',
    en: 'This form submission was already approved.',
    fr: 'Cette réponse au formulaire a déjà été validée.',
  },
  serverErrorTitle: { de: 'Serverfehler', en: 'Server error', fr: 'Erreur du serveur' },
  serverError: {
    de: 'Bei der Freigabe der Formular-Antwort ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
    en: 'Something went wrong while approving the form submission. Please try again later.',
    fr: 'Une erreur est survenue lors de la validation de la réponse au formulaire. Réessaie plus tard.',
  },
  formDetail: { de: 'Formular: {title}', en: 'Form: {title}', fr: 'Formulaire : {title}' },
  idDetail: { de: 'Antwort ID: {id}', en: 'Submission ID: {id}', fr: 'ID de la réponse : {id}' },
} satisfies Record<string, StaticTranslationString>;

const t = (key: keyof typeof TEXT, locale: Locale, values: Record<string, string> = {}): string =>
  Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, value),
    TEXT[key][locale],
  );

interface RenderHtmlOptions {
  locale: Locale;
  title: string;
  message: string;
  /** Lines naming the submission, e.g. its form, or its Hof and version. */
  details?: string[];
  /** A note under the button. */
  hint?: string | undefined;
  status?: number;
  variant?: 'success' | 'error' | 'confirm';
  formAction?: string;
  token?: string;
  id?: string;
}

function renderHtmlResponse({
  locale,
  title,
  message,
  details = [],
  hint,
  status = 200,
  variant = 'success',
  formAction = '/api/form-submissions/approve',
  token,
  id,
}: RenderHtmlOptions): Response {
  const safeTitle = escapeHTML(title);
  const safeMessage = escapeHTML(message);
  const detailHtml = details
    .filter((line) => line.length > 0)
    .map((line) => `<div>${escapeHTML(line)}</div>`)
    .join('');
  const hintHtml =
    typeof hint === 'string' && hint.length > 0 ? `<p class="hint">${escapeHTML(hint)}</p>` : '';
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

  let iconBg = 'rgba(71, 86, 76, 0.1)';
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
          <button type="submit" class="button">${escapeHTML(t('confirmButton', locale))}</button>
        </form>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="${locale}">
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
      --conveniat-green: #47564c;
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
    .icon.confirm { color: var(--conveniat-green); }
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
      background-color: var(--conveniat-green);
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.2s ease;
    }
    .button:hover {
      background-color: #37443c;
    }
    .hint {
      font-size: 0.875rem;
      margin-top: 1rem;
      margin-bottom: 0;
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
    ${detailHtml.length > 0 ? `<div class="detail">${detailHtml}</div>` : ''}
    ${actionFormHtml}
    ${hintHtml}
    <div class="footer">
      conveniat27 — MIR SIND CEVI
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

/**
 * The approval page names the form by its internal title, which the `forms` default
 * populate leaves out because form blocks carry it into public pages. Of a Hof it needs only
 * the id, to name the submission as the Hof's dashboard does.
 */
const FORM_TITLE_ONLY = { forms: { title: true }, hoefe: { name: true } } as const;

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
        populate: FORM_TITLE_ONLY,
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
    populate: FORM_TITLE_ONLY,
    overrideAccess: true,
  });

  return { payload, submission: results.docs[0] as unknown as Record<string, unknown> | undefined };
}

const idOfReference = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String(value.id);
  }
  return undefined;
};

/**
 * The lines naming a submission on the page. A Hof's is named in its dashboard's words, with
 * the status the dashboard shows, so approving here reads as what it is: "Freigegeben" there.
 * Any other submission, or a Hof's the dashboard cannot name, is named by its form.
 */
async function describeSubmission(
  submission: Record<string, unknown>,
  locale: Locale,
  status?: HofEntryStatus,
): Promise<{ details: string[]; hint: string | undefined }> {
  const submissionId = String(submission['id']);
  const hofId = idOfReference(submission['hof']);
  let summary: HofSubmissionSummary | undefined;
  if (hofId !== undefined) {
    try {
      summary = await summarizeHofSubmission(hofId, submissionId, locale);
    } catch (error) {
      logger.warn('Could not name a Hof submission on its approval page', {
        error,
        'hof_dashboard.hof_id': hofId,
        'form_submission.id': submissionId,
      });
    }
  }
  if (summary !== undefined) {
    return {
      details: [
        `${summary.form} · ${summary.hof} · ${summary.entry}`,
        translateHof('statusLine', locale, {
          status: HOF_ENTRY_STATUS_LABELS[status ?? summary.status][locale],
        }),
      ],
      hint: translateHof('approvalLinkHint', locale, {
        accepted: HOF_ENTRY_STATUS_LABELS.accepted[locale],
      }),
    };
  }

  const form = submission['form'];
  const formTitle =
    typeof form === 'object' && form !== null && 'title' in form ? form.title : undefined;
  return {
    details: [
      typeof formTitle === 'string' && formTitle.length > 0
        ? t('formDetail', locale, { title: formTitle })
        : t('idDetail', locale, { id: submissionId }),
    ],
    hint: undefined,
  };
}

export async function GET(request: Request): Promise<Response> {
  const locale = await getLocaleFromCookies();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const id = searchParams.get('id');
    const trimmedToken = token === null ? '' : token.trim();

    if (trimmedToken.length === 0) {
      return renderHtmlResponse({
        locale,
        title: t('failedTitle', locale),
        message: t('noToken', locale),
        status: 400,
        variant: 'error',
      });
    }

    const { submission } = await findSubmissionByToken(trimmedToken, id ?? undefined);

    if (submission === undefined) {
      return renderHtmlResponse({
        locale,
        title: t('invalidTitle', locale),
        message: t('invalid', locale),
        status: 400,
        variant: 'error',
      });
    }

    const { details, hint } = await describeSubmission(submission, locale);

    if (submission['approved'] === true) {
      return renderHtmlResponse({
        locale,
        title: t('approvedTitle', locale),
        message: t('alreadyApproved', locale),
        details,
        status: 200,
        variant: 'success',
      });
    }

    return renderHtmlResponse({
      locale,
      title: t('confirmTitle', locale),
      message: t('confirm', locale),
      details,
      hint,
      status: 200,
      variant: 'confirm',
      token: trimmedToken,
      id: String(submission['id']),
    });
  } catch (error) {
    logger.error('Failed to render the form submission approval page', { error });
    return renderHtmlResponse({
      locale,
      title: t('serverErrorTitle', locale),
      message: t('serverError', locale),
      status: 500,
      variant: 'error',
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const locale = await getLocaleFromCookies();
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
        locale,
        title: t('failedTitle', locale),
        message: t('noToken', locale),
        status: 400,
        variant: 'error',
      });
    }

    const { payload, submission } = await findSubmissionByToken(trimmedToken, id);

    if (submission === undefined) {
      return renderHtmlResponse({
        locale,
        title: t('invalidTitle', locale),
        message: t('invalid', locale),
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
        // nobody is signed in here: the review history of a Hof's submission names the link
        context: { hofReviewer: { id: '', name: APPROVED_BY_LINK } },
      });

      try {
        revalidateTag('payload', 'max');
        revalidateTag('collection:form-submissions', 'max');
      } catch {
        // Non-critical revalidation failure
      }
    }

    const { details } = await describeSubmission(submission, locale, 'accepted');

    return renderHtmlResponse({
      locale,
      title: t('approvedTitle', locale),
      message: wasAlreadyApproved ? t('alreadyApproved', locale) : t('approved', locale),
      details,
      status: 200,
      variant: 'success',
    });
  } catch (error) {
    logger.error('Failed to approve a form submission', { error });
    return renderHtmlResponse({
      locale,
      title: t('serverErrorTitle', locale),
      message: t('serverError', locale),
      status: 500,
      variant: 'error',
    });
  }
}
