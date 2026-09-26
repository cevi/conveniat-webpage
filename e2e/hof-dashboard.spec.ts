import { expect, test, type Page } from '@playwright/test';

/**
 * The Hof dashboard block, with the session and the dashboard's tRPC procedures mocked. Needs
 * the page `/hof-dashboard` of the dev seed and `FEATURE_ENABLE_HOF_DASHBOARD=true`.
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

const emptyContact = { name: '', email: '', phone: '' };

const submission = (
  type: string,
  area: 'infrastructure' | 'program',
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  type,
  area,
  files: [],
  deadlines: [inDays(40)],
  ...overrides,
});

const DASHBOARD = {
  hof: { id: 'hof-nord', name: 'Hof Nord' },
  contacts: {
    avp: { name: 'Anna Beispiel v/o Fuchs', email: 'avp@example.com', phone: '079 123 45 67' },
    coach: emptyContact,
    buildingManager: emptyContact,
  },
  deadlines: [
    {
      id: 'd1',
      date: inDays(40),
      title: '1. Abgabe Grobkonzept',
      area: 'infrastructure',
      submissionTypes: ['flagpole', 'entrance', 'hofBuildings', 'sleepingTent'],
    },
  ],
  submissions: [
    submission('flagpole', 'infrastructure', {
      status: 'submitted',
      elevatedSafetyRisk: 'no',
      files: [
        {
          id: 'f1',
          filename: 'Flaggenmast.pdf',
          url: '/api/hof-files/file/Flaggenmast.pdf',
          kind: 'plan',
          uploadedAt: inDays(-2),
          version: 1,
        },
      ],
    }),
    submission('entrance', 'infrastructure'),
    submission('hofBuildings', 'infrastructure', { deadlines: [inDays(5)] }),
    submission('sleepingTent', 'infrastructure'),
    submission('hofProgram', 'program'),
  ],
  orders: {
    infrastructure: {
      type: 'infrastructure',
      deadline: inDays(40),
      items: [{ id: 'rope', name: 'Bindestrick', quantity: 0 }],
      retiredItems: [],
      powerConnection: false,
    },
    stadtleben: {
      type: 'stadtleben',
      items: [],
      retiredItems: [],
      powerConnection: false,
    },
  },
  stadtleben: { entries: [] },
  documents: [],
  safetyRiskCriteria: ['Bauten mit Absturzhöhe über 3 Metern'],
  canPassDeadlines: false,
};

/** Answers the batched tRPC calls the dashboard makes, and records the mutations. */
const mockBackend = async (
  page: Page,
  { signedIn = true, hoefe = [DASHBOARD.hof] }: { signedIn?: boolean; hoefe?: unknown[] } = {},
): Promise<string[]> => {
  const mutations: string[] = [];
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
  await page.route('**/api/trpc/**', async (route) => {
    const procedures = new URL(route.request().url()).pathname.split('/api/trpc/')[1]?.split(',');
    const answers = (procedures ?? []).map((procedure) => {
      if (procedure === 'hofDashboard.getMyHofList') return hoefe;
      if (procedure === 'hofDashboard.getHofDashboard') return DASHBOARD;
      if (procedure.startsWith('hofDashboard.')) mutations.push(procedure);
      // eslint-disable-next-line unicorn/no-null -- tRPC answers "nothing" with null
      return null;
    });
    // a write takes its time, as on camp wifi, so what shows before the answer can be seen
    if (route.request().method() === 'POST') await new Promise((done) => setTimeout(done, 1500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(answers.map((json) => ({ result: { data: { json } } }))),
    });
  });
  return mutations;
};

test.describe('Hof dashboard', () => {
  test('asks a signed-out visitor to sign in', async ({ page }) => {
    await mockBackend(page, { signedIn: false });
    await page.goto('/hof-dashboard');
    await expect(page.getByRole('button', { name: 'Mit Cevi.DB anmelden' })).toBeVisible();
  });

  test('explains why a user without the role sees no dashboard', async ({ page }) => {
    await mockBackend(page, { hoefe: [] });
    await page.goto('/hof-dashboard');
    await expect(page.getByText('Du hast keinen Zugriff auf ein Hof-Dashboard.')).toBeVisible();
  });

  test('leads with what is due and opens it on its tab', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard');

    const nextUp = page.getByRole('tabpanel', { name: 'Übersicht' });
    // due in 5 days, so it comes first and reads as due soon
    await expect(nextUp.getByRole('listitem').first()).toContainText('Hofbauten');
    await expect(nextUp.getByRole('listitem').first()).toContainText('in 5 Tagen');

    await nextUp.getByRole('button', { name: /Hofbauten/ }).click();
    await expect(page.getByRole('tab', { name: 'Infrastruktur' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('[data-submission="hofBuildings"]')).toBeFocused();
  });

  test('moves between the tabs with the arrow keys', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard');

    await page.getByRole('tab', { name: 'Übersicht' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Infrastruktur' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Infrastruktur' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Dokumente' })).toBeFocused();
  });

  test('keeps typed quantities across tabs and marks them unsaved', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/hof-dashboard');

    await page.getByRole('tab', { name: 'Bestellungen' }).click();
    await page.getByLabel('Bindestrick').fill('7');
    await page.getByRole('tab', { name: 'Übersicht' }).click();
    await page.getByRole('tab', { name: 'Bestellungen' }).click();

    await expect(page.getByLabel('Bindestrick')).toHaveValue('7');
    await expect(page.getByText('Nicht gespeicherte Änderungen')).toBeVisible();
  });

  test('saves the answer to the safety question', async ({ page }) => {
    const mutations = await mockBackend(page);
    await page.goto('/hof-dashboard');

    await page.getByRole('tab', { name: 'Infrastruktur' }).click();
    const card = page.locator('[data-submission="entrance"]');
    await card.getByRole('button', { name: 'Ja', exact: true }).click();
    // shown at once, before the server has it
    await expect(card.getByRole('button', { name: 'Ja', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => mutations).toContain('hofDashboard.updateSafetyRisk');

    await card.getByRole('button', { name: 'Was zählt dazu?' }).click();
    await expect(page.getByRole('dialog')).toContainText('Absturzhöhe');
  });
});
