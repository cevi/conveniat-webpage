import { expect, test, type Page } from '@playwright/test';
import superjson, { type SuperJSONResult } from 'superjson';

/**
 * The Hof dashboard block, with the session, the dashboard's tRPC procedures and the form
 * submission endpoint mocked. Needs the page `/hof-dashboard` of the dev seed and
 * `FEATURE_ENABLE_HOF_DASHBOARD=true`.
 */

/**
 * A day from today (in Zurich) at noon UTC, the way Payload stores a date; counted in calendar
 * days, so a change to or from summer time in between does not shift it.
 */
const inDays = (days: number): string => {
  // today as the dashboard counts it, in Zurich
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' })
    .format(new Date())
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days, 12)).toISOString();
};

/** A date as the dashboard writes it, e.g. 31.01.2027. */
const swissDate = (iso: string): string =>
  new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso));

/** The Hof field every dashboard form asks, which the dashboard answers itself. */
const HOF_FIELD = { blockType: 'hofSelection', name: 'hof', label: 'Dein Hof', required: true };

const MATERIAL_ITEMS = [
  { id: 'rope', name: 'Bindestrick', section: 'Seile' },
  { id: 'axe', name: 'Handbeil', section: 'Werkzeug' },
];

/** A form as its block renders it, with one section of the given fields after the Hof. */
const renderedForm = (id: string, fields: Record<string, unknown>[]): Record<string, unknown> => ({
  id,
  title: id,
  autocomplete: false,
  sections: [
    {
      id: `${id}-section`,
      formSection: {
        id: `${id}-section`,
        sectionTitle: '',
        layout: 'standard',
        fields: [HOF_FIELD, ...fields],
      },
    },
  ],
  submitButtonLabel: 'Einreichen',
  confirmationType: 'message',
  _localized_status: { published: true },
});

const entry = (id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  submittedAt: inDays(-2),
  title: undefined,
  status: 'submitted',
  feedback: undefined,
  answers: [],
  withdrawable: false,
  // the Ressort's own status, where it answered
  reviewStatus: ['inReview', 'revisionRequired', 'accepted'].includes(String(overrides['status']))
    ? overrides['status']
    : undefined,
  final: false,
  feedbackBy: undefined,
  reviewLog: [],
  ...overrides,
});

const dashboardForm = (
  id: string,
  overrides: Record<string, unknown> & { fields?: Record<string, unknown>[] },
): Record<string, unknown> => {
  const { fields = [], ...rest } = overrides;
  return {
    id,
    area: 'infrastructure',
    title: id,
    description: undefined,
    deadline: inDays(40),
    closed: false,
    finalized: false,
    mode: 'versions',
    hofField: 'hof',
    initialValues: {},
    form: renderedForm(id, fields),
    entries: [],
    ...rest,
  };
};

const ORDERED = JSON.stringify([
  { id: 'rope', name: 'Bindestrick', section: 'Seile', quantity: 4 },
  { id: 'axe', name: 'Handbeil', section: 'Werkzeug', quantity: 2 },
]);

/** Sent back for a revision, due in five days: first in the overview. */
const PLAN = dashboardForm('form-plan', {
  title: 'Hofplan',
  deadline: inDays(5),
  fields: [{ blockType: 'text', name: 'beschreibung', label: 'Beschreibung', required: true }],
  entries: [
    entry('plan-2', {
      status: 'revisionRequired',
      feedback: 'Die Statik fehlt noch.',
      feedbackBy: { name: 'Sara Keller v/o Biber', at: '2026-09-20T08:30:00.000Z' },
      answers: [
        { field: 'beschreibung', label: 'Beschreibung', kind: 'text', text: 'Zweiter Entwurf' },
        {
          field: 'plan',
          label: 'Plan',
          kind: 'files',
          files: [
            {
              id: 'file-1',
              name: 'Hofplan.pdf',
              url: '/api/form-file/file-1',
              size: 240 * 1024,
              mimeType: 'application/pdf',
            },
          ],
        },
      ],
    }),
    entry('plan-1', {
      submittedAt: inDays(-20),
      status: 'inReview',
      answers: [
        { field: 'beschreibung', label: 'Beschreibung', kind: 'text', text: 'Erste Skizze' },
      ],
    }),
  ],
});

/** Nothing handed in yet. */
const TENT = dashboardForm('form-tent', {
  title: 'Schlafzelt',
  deadline: inDays(40),
  fields: [{ blockType: 'text', name: 'zeltname', label: 'Zeltname', required: true }],
});

/** Handed in and not yet taken up, so it can still be taken back. */
const PROGRAM = dashboardForm('form-program', {
  area: 'program',
  title: 'Hofprogramm',
  deadline: inDays(20),
  fields: [{ blockType: 'text', name: 'idee', label: 'Idee', required: true }],
  entries: [
    entry('program-1', {
      withdrawable: true,
      answers: [{ field: 'idee', label: 'Idee', kind: 'text', text: 'Seilbrücke' }],
    }),
  ],
});

/** Stadtleben stands: every entry counts on its own. */
const STANDS = dashboardForm('form-stands', {
  area: 'program',
  mode: 'entries',
  title: 'Stadtleben',
  deadline: inDays(60),
  fields: [{ blockType: 'text', name: 'stand', label: 'Stand', required: true }],
  entries: [
    entry('stand-1', {
      title: 'Crêpes',
      answers: [{ field: 'stand', label: 'Stand', kind: 'text', text: 'Crêpes' }],
    }),
  ],
});

const ORDER = dashboardForm('form-order', {
  area: 'material',
  title: 'Materialbestellung',
  deadline: inDays(30),
  fields: [
    { blockType: 'materialList', name: 'material', label: 'Material', items: MATERIAL_ITEMS },
  ],
  initialValues: { material: ORDERED },
  entries: [
    entry('order-1', {
      answers: [
        {
          field: 'material',
          label: 'Material',
          kind: 'materials',
          materials: [
            { id: 'rope', name: 'Bindestrick', section: 'Seile', quantity: 4 },
            { id: 'axe', name: 'Handbeil', section: 'Werkzeug', quantity: 2 },
          ],
        },
      ],
    }),
  ],
});

/** The order the Ressort accepted and marked final: the Hof hands in no further version. */
const FINAL_ORDER = {
  ...ORDER,
  finalized: true,
  entries: [
    {
      ...(ORDER['entries'] as Record<string, unknown>[])[0],
      status: 'accepted',
      reviewStatus: 'accepted',
      final: true,
      feedback: 'Bestellung übernommen.',
      feedbackBy: { name: 'Sara Keller v/o Biber', at: '2026-09-21T08:30:00.000Z' },
    },
  ],
};

const HOF_NORD = { id: 'hof-nord', name: 'Hof Nord' };
const HOF_SUED = { id: 'hof-sued', name: 'Hof Süd' };

interface Dashboard {
  hof: { id: string; name: string };
  responsible: { name?: string; email: string }[];
  deadlines: unknown[];
  forms: Record<string, unknown>[];
  documents: unknown[];
  isReviewer: boolean;
}

const dashboardOf = (
  hof: { id: string; name: string },
  forms: Record<string, unknown>[],
): Dashboard => ({
  hof,
  // the address managers of the Hof's Cevi.DB group; one of them never signed in
  responsible: [
    { name: 'Anna Beispiel v/o Fuchs', email: 'anna@example.com' },
    { email: 'bau@hof-nord.example.com' },
  ],
  deadlines: [],
  forms,
  documents: [],
  isReviewer: false,
});

const DASHBOARD = dashboardOf(HOF_NORD, [PLAN, TENT, PROGRAM, ORDER]);

type TrpcError = { message: string; code: number; httpStatus: number; name: string };

const LOCKED: TrpcError = {
  message: 'submission_locked',
  code: -32_009,
  httpStatus: 409,
  name: 'CONFLICT',
};

interface Backend {
  /** The tRPC procedures called, with their input, in order. */
  calls: { procedure: string; input: unknown }[];
  /** The bodies POSTed to the form submission endpoint. */
  submissions: { form: string; submissionData: { field: string; value: unknown }[] }[];
  /** How often each Hof's dashboard was loaded. */
  loads: (hofId: string) => number;
}

/**
 * Answers the batched tRPC calls the dashboard makes and the form submissions, and records
 * both. `dashboards` is read on every load, so a test can change what the next load returns.
 */
const mockBackend = async (
  page: Page,
  {
    signedIn = true,
    hoefe = [HOF_NORD],
    dashboards = { [HOF_NORD.id]: DASHBOARD },
    deleteError,
    onSubmission,
  }: {
    signedIn?: boolean;
    hoefe?: { id: string; name: string }[];
    dashboards?: Record<string, Dashboard>;
    /** What `deleteSubmission` fails with, if it fails. */
    deleteError?: TrpcError;
    /** Runs once a submission was received, before the answer to it. */
    onSubmission?: () => void;
  } = {},
): Promise<Backend> => {
  const backend: Backend = {
    calls: [],
    submissions: [],
    loads: (hofId) =>
      backend.calls.filter(
        ({ procedure, input }) =>
          procedure === 'hofDashboard.getHofDashboard' &&
          (input as { hofId?: string } | undefined)?.hofId === hofId,
      ).length,
  };
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // NextAuth answers "no session" with null
      body: JSON.stringify(
        signedIn
          ? {
              user: { name: 'Hof-Adressverwaltung', email: 'hof@example.com', uuid: 'user-8' },
              expires: inDays(1),
            }
          : null, // eslint-disable-line unicorn/no-null
      ),
    });
  });
  await page.route('**/api/form-submissions', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    backend.submissions.push(route.request().postDataJSON() as Backend['submissions'][number]);
    onSubmission?.();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'created', doc: { id: 'new-submission' } }),
    });
  });
  await page.route('**/api/trpc/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const procedures = url.pathname.split('/api/trpc/')[1]?.split(',') ?? [];
    const inputs = (
      request.method() === 'POST'
        ? request.postDataJSON()
        : JSON.parse(url.searchParams.get('input') ?? '{}')
    ) as Record<string, SuperJSONResult | undefined>;
    const answers = procedures.map((procedure, index): { data: unknown } | TrpcError => {
      // decoded as the server does: superjson sends an undefined as null and a marker
      const encoded = inputs[String(index)];
      const input = encoded === undefined ? undefined : superjson.deserialize(encoded);
      backend.calls.push({ procedure, input });
      if (procedure === 'hofDashboard.getMyHofList') return { data: hoefe };
      if (procedure === 'hofDashboard.getHofList') return { data: hoefe };
      if (procedure === 'hofDashboard.getHofDashboard') {
        const hofId = (input as { hofId?: string } | undefined)?.hofId ?? '';
        const dashboard = dashboards[hofId];
        return dashboard === undefined
          ? { message: 'FORBIDDEN', code: -32_003, httpStatus: 403, name: 'FORBIDDEN' }
          : { data: dashboard };
      }
      if (procedure === 'hofDashboard.deleteSubmission' && deleteError !== undefined) {
        return deleteError;
      }
      // eslint-disable-next-line unicorn/no-null -- tRPC answers "nothing" with null
      return { data: null };
    });
    const failed = answers.find((answer): answer is TrpcError => !('data' in answer));
    // a batch that partly failed answers 207, one that failed alone with its own status
    let status = 200;
    if (failed !== undefined) status = answers.length > 1 ? 207 : failed.httpStatus;
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        answers.map((answer) =>
          'data' in answer
            ? { result: { data: { json: answer.data } } }
            : {
                error: {
                  json: {
                    message: answer.message,
                    code: answer.code,
                    data: { code: answer.name, httpStatus: answer.httpStatus },
                  },
                },
              },
        ),
      ),
    });
  });
  return backend;
};

/** A form as the server sends it to a reviewer: nothing to take back, that is the Hof's. */
const forReviewer = (form: Record<string, unknown>): Record<string, unknown> => ({
  ...form,
  entries: (form['entries'] as Record<string, unknown>[]).map((submitted) => ({
    ...submitted,
    withdrawable: false,
    // the history the server keeps for the reviewers
    reviewLog:
      submitted['feedbackBy'] === undefined
        ? []
        : [
            {
              at: (submitted['feedbackBy'] as { at: string }).at,
              by: (submitted['feedbackBy'] as { name: string }).name,
              status: submitted['status'],
              feedback: submitted['feedback'],
              final: submitted['final'] === true,
            },
          ],
  })),
});

const formCard = (page: Page, formId: string): ReturnType<Page['locator']> =>
  page.locator(`[data-form="${formId}"]`);

const openTab = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
};

test.describe('Hof dashboard', () => {
  test('asks a signed-out visitor to sign in and loads nothing of a Hof', async ({ page }) => {
    const backend = await mockBackend(page, { signedIn: false });
    await page.goto('/hof-dashboard');
    await expect(page.getByRole('button', { name: 'Mit Cevi.DB anmelden' })).toBeVisible();
    // what a signed-in user would load by now has had time to go out
    await page.waitForTimeout(1500);
    expect(
      backend.calls.filter(({ procedure }) =>
        ['hofDashboard.getHofDashboard', 'hofDashboard.getMyHofList'].includes(procedure),
      ),
    ).toEqual([]);
  });

  test('leads with what is still open and opens it on its tab', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard');

    const overview = page.getByRole('tabpanel', { name: 'Übersicht' });
    const rows = overview.getByRole('list').first().getByRole('listitem');
    // the revision due in five days first, then what is missing; nothing that is done
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Hofplan');
    await expect(rows.nth(0)).toContainText('Überarbeitung erforderlich');
    await expect(rows.nth(0)).toContainText(`Frist ${swissDate(inDays(5))} · in 5 Tagen`);
    await expect(rows.nth(1)).toContainText('Schlafzelt');
    await expect(rows.nth(1)).toContainText('Noch nicht abgegeben');
    await expect(rows.nth(1)).toContainText('in 40 Tagen');
    await expect(overview.getByText('Hofprogramm')).toHaveCount(0);

    // two open behind Infrastruktur, none behind Programm and Material
    // the count is read out as words, the badge itself is only for the eye
    await expect(page.getByRole('tab', { name: /^Infrastruktur/ })).toHaveAccessibleName(
      /^Infrastruktur\s*2 offen$/,
    );
    await expect(page.getByRole('tab', { name: /^Programm/ })).toHaveText('Programm');
    await expect(page.getByRole('tab', { name: /^Material/ })).toHaveText('Material');

    await overview.getByRole('button', { name: /Hofplan/ }).click();
    await expect(page.getByRole('tab', { name: /^Infrastruktur/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const card = formCard(page, 'form-plan');
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport();
    await expect(page).toHaveURL(/#infrastructure$/);

    await page.reload();
    await expect(page.getByRole('tab', { name: /^Infrastruktur/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(formCard(page, 'form-plan')).toBeVisible();
  });

  test('shows the newest version and folds the earlier ones away', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard#infrastructure');

    const card = formCard(page, 'form-plan');
    await expect(card.getByRole('heading', { name: 'Version 2' })).toBeVisible();
    await expect(card.getByText('Rückmeldung', { exact: true })).toBeVisible();
    await expect(card.getByText('Die Statik fehlt noch.')).toBeVisible();
    // who wrote it and when, but not the Ressort's history of it
    await expect(card.getByText('Sara Keller v/o Biber, 20.09.2026')).toBeVisible();
    await expect(card.getByText(/Verlauf/)).toHaveCount(0);
    await expect(card.getByText('Zweiter Entwurf')).toBeVisible();
    const file = card.getByRole('link', { name: /Hofplan\.pdf/ });
    await expect(file).toHaveAttribute('href', '/api/form-file/file-1');
    await expect(file).toContainText('PDF · 240 kB');
    // a revision asked for makes handing in the new version the card's main action
    await expect(card.getByRole('button', { name: 'Neue Version abgeben' })).toBeVisible();

    const earlier = card.getByRole('button', { name: 'Frühere Versionen (1)' });
    await expect(earlier).toHaveAttribute('aria-expanded', 'false');
    await expect(card.getByText('Erste Skizze')).toHaveCount(0);
    await earlier.click();
    await expect(earlier).toHaveAttribute('aria-expanded', 'true');
    await expect(card.getByRole('heading', { name: 'Version 1' })).toBeVisible();
    await expect(card.getByText('Erste Skizze')).toBeVisible();
    await expect(card.getByText('In Prüfung')).toBeVisible();

    await openTab(page, 'Material');
    const order = formCard(page, 'form-order');
    await expect(order.getByText('Seile', { exact: true })).toBeVisible();
    await expect(order.getByRole('listitem').filter({ hasText: 'Bindestrick' })).toHaveText(
      /Bindestrick\s*4/,
    );
    await expect(order.getByRole('listitem').filter({ hasText: 'Handbeil' })).toHaveText(
      /Handbeil\s*2/,
    );
  });

  test('hands a form in with the Hof filled in', async ({ page }) => {
    const dashboards = { [HOF_NORD.id]: DASHBOARD };
    const backend = await mockBackend(page, {
      dashboards,
      // what the reload after it finds
      onSubmission: () => {
        dashboards[HOF_NORD.id] = dashboardOf(HOF_NORD, [
          PLAN,
          {
            ...TENT,
            entries: [
              entry('tent-1', {
                withdrawable: true,
                answers: [{ field: 'zeltname', label: 'Zeltname', kind: 'text', text: 'Jurte' }],
              }),
            ],
          },
          PROGRAM,
          ORDER,
        ]);
      },
    });
    await page.goto('/hof-dashboard#infrastructure');

    const card = formCard(page, 'form-tent');
    await expect(card.getByText('Noch nichts abgegeben.')).toBeVisible();
    await card.getByRole('button', { name: 'Abgeben', exact: true }).click();
    await expect(card.getByLabel('Zeltname')).toBeVisible();
    // the dashboard answers which Hof it is
    await expect(card.getByText('Dein Hof')).toHaveCount(0);

    const loadsBefore = backend.loads(HOF_NORD.id);
    await card.getByLabel('Zeltname').fill('Jurte');
    await card.getByRole('button', { name: 'Einreichen' }).click();

    await expect.poll(() => backend.submissions).toHaveLength(1);
    expect(backend.submissions[0]?.form).toBe('form-tent');
    expect(backend.submissions[0]?.submissionData).toEqual(
      expect.arrayContaining([
        { field: 'hof', value: 'hof-nord' },
        { field: 'zeltname', value: 'Jurte' },
      ]),
    );
    await expect(card.getByLabel('Zeltname')).toHaveCount(0);
    await expect(page.getByText('Abgegeben', { exact: true })).toBeVisible();
    await expect.poll(() => backend.loads(HOF_NORD.id)).toBeGreaterThan(loadsBefore);
    await expect(card.getByRole('heading', { name: 'Version 1' })).toBeVisible();
    await expect(card.getByText('Jurte')).toBeVisible();
  });

  test('changes the order starting from the last one', async ({ page }) => {
    const backend = await mockBackend(page);
    await page.goto('/hof-dashboard#material');

    const card = formCard(page, 'form-order');
    await card.getByRole('button', { name: 'Bestellung anpassen' }).click();
    const rope = card.getByLabel('Bindestrick', { exact: true });
    await expect(rope).toHaveValue('4');
    await expect(card.getByLabel('Handbeil', { exact: true })).toHaveValue('2');

    // kept as typed and flagged, not read as 2 or 25
    await rope.fill('2.5');
    await expect(rope).toHaveAttribute('aria-invalid', 'true');
    await expect(rope).toHaveAccessibleDescription(/Eine ganze Zahl von 0 bis/);
    await card.getByRole('button', { name: 'Einreichen' }).click();
    await expect(card.getByText('Bitte korrigiere die markierten Mengen.')).toBeVisible();
    // what holds the submission back has had time to let it through
    await page.waitForTimeout(500);
    expect(backend.submissions).toHaveLength(0);

    await rope.fill('7');
    await expect(rope).toHaveAttribute('aria-invalid', 'false');
    await card.getByRole('button', { name: 'Einreichen' }).click();
    await expect.poll(() => backend.submissions).toHaveLength(1);
    const material = backend.submissions[0]?.submissionData.find(
      ({ field }) => field === 'material',
    );
    expect(JSON.parse(String(material?.value))).toEqual([
      { id: 'rope', quantity: 7 },
      { id: 'axe', quantity: 2 },
    ]);
  });

  test('takes a submission back after asking in place', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs += 1;
      void dialog.dismiss();
    });
    const backend = await mockBackend(page);
    await page.goto('/hof-dashboard#program');

    const card = formCard(page, 'form-program');
    const withdraw = card.getByRole('button', { name: 'Zurückziehen' });
    await withdraw.click();
    await expect(card.getByText('Diese Abgabe mit ihren Dateien löschen?')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await card.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(card.getByText('Diese Abgabe mit ihren Dateien löschen?')).toHaveCount(0);
    await expect(withdraw).toBeVisible();
    await expect(card.getByText('Seilbrücke')).toBeVisible();

    const loadsBefore = backend.loads(HOF_NORD.id);
    await withdraw.click();
    await card.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByText('Abgabe zurückgezogen')).toBeVisible();
    expect(
      backend.calls.filter(({ procedure }) => procedure === 'hofDashboard.deleteSubmission'),
    ).toEqual([
      {
        procedure: 'hofDashboard.deleteSubmission',
        input: { hofId: 'hof-nord', submissionId: 'program-1' },
      },
    ]);
    await expect.poll(() => backend.loads(HOF_NORD.id)).toBeGreaterThan(loadsBefore);
    expect(dialogs).toBe(0);
  });

  test('says so when the Ressort took the submission up in the meantime', async ({ page }) => {
    await mockBackend(page, { deleteError: LOCKED });
    await page.goto('/hof-dashboard#program');

    const card = formCard(page, 'form-program');
    await card.getByRole('button', { name: 'Zurückziehen' }).click();
    await card.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByText('Das Ressort hat die Abgabe schon aufgenommen.')).toBeVisible();
    await expect(page.getByText('Abgabe zurückgezogen')).toHaveCount(0);
  });

  test('keeps the data of two Höfe apart', async ({ page }) => {
    const backend = await mockBackend(page, {
      hoefe: [HOF_NORD, HOF_SUED],
      dashboards: {
        [HOF_NORD.id]: DASHBOARD,
        [HOF_SUED.id]: dashboardOf(HOF_SUED, [
          dashboardForm('form-sued', { area: 'program', title: 'Hofspiel Süd' }),
        ]),
      },
    });
    await page.goto('/hof-dashboard');

    const overview = page.getByRole('tabpanel', { name: 'Übersicht' });
    await expect(overview.getByText('Hofplan')).toBeVisible();
    const selector = page.getByRole('combobox', { name: 'Hof' });
    await selector.click();
    await page.getByRole('option', { name: 'Hof Süd' }).click();

    await expect(selector).toHaveText('Hof Süd');
    await expect(overview.getByText('Hofspiel Süd')).toBeVisible();
    await expect(overview.getByText('Hofplan')).toHaveCount(0);
    expect(backend.loads(HOF_SUED.id)).toBeGreaterThan(0);

    await selector.click();
    await page.getByRole('option', { name: 'Hof Nord' }).click();
    await expect(overview.getByText('Hofplan')).toBeVisible();
    await expect(overview.getByText('Hofspiel Süd')).toHaveCount(0);
  });

  test('explains why a user without a Hof sees no dashboard', async ({ page }) => {
    const backend = await mockBackend(page, { hoefe: [] });
    await page.goto('/hof-dashboard');
    await expect(page.getByText('Du hast keinen Zugriff auf ein Hof-Dashboard.')).toBeVisible();
    expect(backend.loads(HOF_NORD.id)).toBe(0);
  });

  test('offers nothing to hand in once a form has closed', async ({ page }) => {
    const deadline = inDays(-3);
    await mockBackend(page, {
      dashboards: {
        [HOF_NORD.id]: dashboardOf(HOF_NORD, [{ ...TENT, closed: true, deadline }]),
      },
    });
    await page.goto('/hof-dashboard#infrastructure');

    const card = formCard(page, 'form-tent');
    await expect(
      card.getByText(`Die Abgabe ist seit dem ${swissDate(deadline)} geschlossen.`),
    ).toBeVisible();
    await expect(card.getByRole('button')).toHaveCount(0);
  });

  test('lets a reviewer answer instead of hand in, saved as it is given', async ({ page }) => {
    const backend = await mockBackend(page, {
      dashboards: {
        [HOF_NORD.id]: {
          ...dashboardOf(
            HOF_NORD,
            [PLAN, TENT, PROGRAM, STANDS, FINAL_ORDER].map((form) => forReviewer(form)),
          ),
          isReviewer: true,
        },
      },
    });
    const reviews = (): unknown[] =>
      backend.calls
        .filter(({ procedure }) => procedure === 'hofDashboard.updateSubmissionReview')
        .map(({ input }) => input);
    await page.goto('/hof-dashboard#infrastructure');

    // nothing to hand in, whether handed in before or not
    const tent = formCard(page, 'form-tent');
    await expect(tent.getByText('Noch nichts abgegeben.')).toBeVisible();
    await expect(tent.getByRole('button')).toHaveCount(0);

    // the Ressort's answer so far, and the way back to plain handed in
    const plan = formCard(page, 'form-plan');
    await expect(plan.getByRole('button', { name: 'Neue Version abgeben' })).toHaveCount(0);
    await expect(plan.getByRole('radio', { name: 'Überarbeitung erforderlich' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(plan.getByLabel('Rückmeldung an den Hof')).toHaveValue('Die Statik fehlt noch.');
    // the reviewers see who changed what, and when
    await plan.getByText('Verlauf (1)').click();
    await expect(plan.getByText(/20\.09\.2026, \d\d:\d\d · Sara Keller v\/o Biber/)).toBeVisible();
    // no save button: a status is saved the moment it is chosen
    await expect(plan.getByRole('button', { name: 'Speichern' })).toHaveCount(0);
    await plan.getByRole('radio', { name: 'Eingereicht' }).click();
    await expect.poll(reviews).toHaveLength(1);
    expect(reviews()[0]).toEqual({
      hofId: 'hof-nord',
      submissionId: 'plan-2',
      feedback: 'Die Statik fehlt noch.',
      final: false,
    });
    // no status of the Ressort: back to plain handed in
    expect((reviews()[0] as { status?: unknown }).status).toBeUndefined();

    // the version that counts can be made the last one, saved the moment it is ticked
    const final = plan.getByRole('checkbox', { name: /^Definitiv: keine weiteren Versionen/ });
    await expect(final).not.toBeChecked();
    await final.check();
    await expect.poll(reviews).toHaveLength(2);
    expect(reviews()[1]).toEqual({
      hofId: 'hof-nord',
      submissionId: 'plan-2',
      feedback: 'Die Statik fehlt noch.',
      final: true,
    });
    // an earlier version is not the one to mark
    await plan.getByRole('button', { name: 'Frühere Versionen (1)' }).click();
    await expect(plan.getByRole('heading', { name: 'Version 1' })).toBeVisible();
    await expect(plan.getByRole('checkbox')).toHaveCount(1);

    await openTab(page, 'Programm');
    const program = formCard(page, 'form-program');
    await expect(program.getByRole('button', { name: /abgeben/ })).toHaveCount(0);
    await expect(program.getByRole('button', { name: 'Zurückziehen' })).toHaveCount(0);
    // each Stadtleben stand stands on its own: none is the last one
    const stands = formCard(page, 'form-stands');
    await expect(stands.getByRole('radio', { name: 'Eingereicht' })).toBeVisible();
    await expect(stands.getByRole('checkbox')).toHaveCount(0);
    const loadsBefore = backend.loads(HOF_NORD.id);
    // accepting is the approval the form builder knows
    await program.getByRole('radio', { name: 'Freigegeben' }).click();
    await expect.poll(reviews).toHaveLength(3);
    expect(reviews()[2]).toEqual({
      hofId: 'hof-nord',
      submissionId: 'program-1',
      status: 'accepted',
      feedback: '',
      final: false,
    });
    // typed feedback goes out once, after the typing pauses, not per key
    await program
      .getByLabel('Rückmeldung an den Hof')
      .pressSequentially('Danke, passt so.', { delay: 20 });
    await expect.poll(reviews).toHaveLength(4);
    await page.waitForTimeout(1200);
    expect(reviews()).toHaveLength(4);
    expect(reviews()[3]).toEqual({
      hofId: 'hof-nord',
      submissionId: 'program-1',
      status: 'accepted',
      feedback: 'Danke, passt so.',
      final: false,
    });
    // the pill beside the title says so, no toast
    await expect(program.getByText('Gespeichert', { exact: true })).toBeVisible();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
    await expect.poll(() => backend.loads(HOF_NORD.id)).toBeGreaterThan(loadsBefore);

    // an order accepted and marked final reads so, in the answer and in the history
    await openTab(page, 'Material');
    const order = formCard(page, 'form-order');
    await expect(order.getByRole('radio', { name: 'Freigegeben' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(
      order.getByRole('checkbox', { name: /^Definitiv: keine weiteren Versionen/ }),
    ).toBeChecked();
    await order.getByText('Verlauf (1)').click();
    await expect(order.getByText('Freigegeben · definitiv')).toBeVisible();
  });

  test("names the Hof's responsible people from Cevi.DB in the overview only", async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard');

    const overview = page.getByRole('tabpanel', { name: 'Übersicht' });
    await expect(overview.getByText('Hofverantwortliche Person (AVP)')).toBeVisible();
    await expect(overview.getByText('Anna Beispiel v/o Fuchs')).toBeVisible();
    await expect(overview.getByRole('link', { name: 'anna@example.com' })).toHaveAttribute(
      'href',
      'mailto:anna@example.com',
    );
    // known by address only, until they sign in once
    await expect(overview.getByRole('link', { name: 'bau@hof-nord.example.com' })).toHaveAttribute(
      'href',
      'mailto:bau@hof-nord.example.com',
    );

    // an area names nobody of its own
    await openTab(page, 'Infrastruktur');
    await expect(page.getByRole('link', { name: /@/ })).toHaveCount(0);
  });

  test('says so when Cevi.DB names nobody responsible for the Hof', async ({ page }) => {
    await mockBackend(page, {
      dashboards: { [HOF_NORD.id]: { ...DASHBOARD, responsible: [] } },
    });
    await page.goto('/hof-dashboard');
    await expect(
      page.getByText('In der Cevi.DB ist für diesen Hof noch keine Adressverwaltung eingetragen.'),
    ).toBeVisible();
  });

  test('offers no further version once the Ressort marked the order final', async ({ page }) => {
    await mockBackend(page, {
      dashboards: { [HOF_NORD.id]: dashboardOf(HOF_NORD, [PLAN, FINAL_ORDER]) },
    });
    await page.goto('/hof-dashboard#material');

    const order = formCard(page, 'form-order');
    await expect(
      order.getByText(
        'Das Ressort hat diese Version als definitiv markiert. Änderungen laufen über das Ressort.',
      ),
    ).toBeVisible();
    await expect(order.getByText('Bestellung übernommen.')).toBeVisible();
    await expect(order.getByRole('button')).toHaveCount(0);
    // nothing left open behind Material
    await expect(page.getByRole('tab', { name: /^Material/ })).toHaveText('Material');
  });
});
