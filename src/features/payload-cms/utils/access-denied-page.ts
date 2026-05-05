/**
 * Generates a self-contained HTML error page for 403 (Access Denied) responses.
 *
 * This is used by the Payload REST API route wrapper to replace raw JSON error
 * responses with a user-friendly page that includes a login button.
 *
 * The page is intentionally self-contained (inline styles, no external dependencies)
 * because it is served from the Payload API route handler, outside of the Next.js
 * React rendering pipeline.
 *
 * @see https://github.com/.../issues/362
 */

type SupportedLocale = 'de' | 'en' | 'fr';

const translations: Record<
  SupportedLocale,
  {
    title: string;
    heading: string;
    description: string;
    loginButton: string;
    homeLink: string;
  }
> = {
  de: {
    title: '403 – Zugriff verweigert',
    heading: 'Zugriff verweigert',
    description:
      'Du hast keine Berechtigung, auf dieses Dokument zuzugreifen. Bitte melde dich an, um fortzufahren.',
    loginButton: 'Anmelden mit Cevi.DB',
    homeLink: 'Zurück zur Startseite',
  },
  en: {
    title: '403 – Access Denied',
    heading: 'Access Denied',
    description: 'You do not have permission to access this document. Please log in to continue.',
    loginButton: 'Login with Cevi.DB',
    homeLink: 'Back to home page',
  },
  fr: {
    title: '403 – Accès refusé',
    heading: 'Accès refusé',
    description:
      "Vous n'avez pas l'autorisation d'accéder à ce document. Veuillez vous connecter pour continuer.",
    loginButton: 'Connexion avec Cevi.DB',
    homeLink: "Retour à la page d'accueil",
  },
};

const resolveLocale = (raw: string): SupportedLocale => {
  const normalized = raw.toLowerCase().slice(0, 2);
  if (normalized === 'de' || normalized === 'en' || normalized === 'fr') {
    return normalized;
  }
  return 'de';
};

/**
 * Builds a self-contained HTML string for a 403 error page.
 *
 * @param rawLocale - The locale string from the cookie (e.g. 'de', 'en', 'fr')
 * @param callbackUrl - The URL to redirect back to after login
 */
export const buildAccessDeniedHtml = (rawLocale: string, callbackUrl: string): string => {
  const locale = resolveLocale(rawLocale);
  const t = translations[locale];

  // Encode the callback URL for safe embedding in the signin URL
  const encodedCallback = encodeURIComponent(callbackUrl);

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      color: #1f2937;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 1rem;
    }
    .container {
      text-align: center;
      max-width: 28rem;
      width: 100%;
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: #fef2f2;
      margin-bottom: 1.5rem;
    }
    .icon svg {
      width: 2rem;
      height: 2rem;
      color: #991b1b;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.75rem;
    }
    .description {
      font-size: 1rem;
      line-height: 1.6;
      color: #6b7280;
      margin-bottom: 2rem;
    }
    .login-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem 2.5rem;
      background: #991b1b;
      color: #fff1f2;
      font-family: inherit;
      font-size: 1.125rem;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      text-decoration: none;
      transition: all 200ms ease;
    }
    .login-button:hover {
      background: #7f1d1d;
      transform: scale(1.02);
    }
    .login-button:active {
      transform: scale(0.98);
    }
    .login-button svg {
      width: 1.25rem;
      height: 1.25rem;
    }
    .home-link {
      display: inline-block;
      margin-top: 2rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      text-decoration: none;
    }
    .home-link:hover {
      color: #1f2937;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    </div>

    <h1>${t.heading}</h1>
    <p class="description">${t.description}</p>

    <button type="button" id="login-btn" class="login-button">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
      </svg>
      ${t.loginButton}
    </button>

    <div>
      <a href="/" class="home-link">${t.homeLink}</a>
    </div>
  </div>

  <script>
    document.getElementById('login-btn').addEventListener('click', async function() {
      try {
        var res = await fetch('/api/auth/csrf');
        var data = await res.json();
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/auth/signin/cevi-db';
        var csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfToken';
        csrfInput.value = data.csrfToken;
        form.appendChild(csrfInput);
        var callbackInput = document.createElement('input');
        callbackInput.type = 'hidden';
        callbackInput.name = 'callbackUrl';
        callbackInput.value = '${callbackUrl}';
        form.appendChild(callbackInput);
        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        window.location.href = '/api/auth/signin?callbackUrl=${encodedCallback}';
      }
    });
  </script>
</body>
</html>`;
};
