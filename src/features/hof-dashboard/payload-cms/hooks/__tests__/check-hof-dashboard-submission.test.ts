jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_HOF_DASHBOARD: true,
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {
    public status: number;
    public constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { checkHofDashboardSubmission } from '@/features/hof-dashboard/payload-cms/hooks/check-hof-dashboard-submission';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

const PAST = '2020-01-31T10:00:00.000Z';
const FUTURE = '2999-01-31T10:00:00.000Z';

/** Hof Nord is run by the Cevi.DB group 990001, Hof Süd by 990002. */
const HOEFE = [
  { id: 'hof-nord', name: 'Hof Nord', groupId: '990001' },
  { id: 'hof-sued', name: 'Hof Süd', groupId: '990002' },
];

interface User {
  id: string;
  groups: { id: number; role_class: string }[];
}

const HOF_NORD_ADMIN: User = {
  id: 'user-nord',
  groups: [{ id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS }],
};
const PARTICIPANT: User = {
  id: 'user-participant',
  groups: [{ id: 990_001, role_class: 'Group::Ortsgruppe::Mitglied' }],
};
const REVIEWER: User = { id: 'user-web', groups: [{ id: 105, role_class: 'editor' }] };

type DashboardSettings = Record<string, unknown> | null;

const { environmentVariables } = jest.requireMock<{
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: boolean };
}>('@/config/environment-variables');

interface RunOptions {
  settings?: DashboardSettings;
  user?: User;
  hof?: unknown;
  operation?: 'create' | 'update';
  locale?: string;
}

const findByID = jest.fn();

/** Runs the hook on a submission to a form with the given dashboard settings. */
const run = async (options: RunOptions): Promise<Partial<FormSubmission>> => {
  const { settings = { area: 'infrastructure' }, operation = 'create', locale = 'de' } = options;
  const hof = 'hof' in options ? options.hof : 'hof-nord';
  findByID.mockResolvedValue({ hofDashboard: settings });
  const find = jest.fn(({ where }: { where: { groupId: { in: string[] } } }) =>
    Promise.resolve({ docs: HOEFE.filter((entry) => where.groupId.in.includes(entry.groupId)) }),
  );
  const hookArguments = {
    // a sender cannot name someone else as the one who handed it in
    data: { form: 'form-1', hof, submittedBy: 'someone-else' },
    operation,
    req: {
      // Payload answers a visitor who is not signed in with null
      // eslint-disable-next-line unicorn/no-null
      user: options.user ?? null,
      locale,
      payload: { findByID, find, logger: { info: jest.fn() } },
    },
  } as unknown as Parameters<CollectionBeforeChangeHook<FormSubmission>>[0];
  return (await checkHofDashboardSubmission(hookArguments)) as Partial<FormSubmission>;
};

beforeEach(() => {
  jest.clearAllMocks();
  environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = true;
});

describe('checkHofDashboardSubmission', () => {
  it('records the Hof administrator who handed it in for their Hof', async () => {
    const data = await run({ user: HOF_NORD_ADMIN });
    expect(data.submittedBy).toBe('user-nord');
  });

  it('accepts the Hof as a populated relationship too', async () => {
    const data = await run({ user: HOF_NORD_ADMIN, hof: { id: 'hof-nord' } });
    expect(data.submittedBy).toBe('user-nord');
  });

  it('asks someone signed out to sign in, in their language', async () => {
    await expect(run({})).rejects.toMatchObject({ status: 401 });
    await expect(run({ locale: 'fr' })).rejects.toThrow(
      'Connecte-toi avec Cevi.DB pour déposer ceci pour ton Hof.',
    );
  });

  it('refuses a submission without a Hof', async () => {
    await expect(run({ user: HOF_NORD_ADMIN, hof: undefined })).rejects.toMatchObject({
      status: 400,
      message: 'Wähle den Hof, zu dem das gehört.',
    });
  });

  it('refuses a Hof administrator handing in for another Hof', async () => {
    await expect(run({ user: HOF_NORD_ADMIN, hof: 'hof-sued' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('refuses a participant of the Hof who does not administer it', async () => {
    await expect(run({ user: PARTICIPANT })).rejects.toMatchObject({ status: 403 });
  });

  it('lets any signed-in user hand in a form open to more than the administrators', async () => {
    const data = await run({
      user: PARTICIPANT,
      hof: 'hof-sued',
      settings: { area: 'program', onlyHofAdministrators: false },
    });
    expect(data.submittedBy).toBe('user-participant');
  });

  it('lets a reviewer hand in for any Hof', async () => {
    const data = await run({ user: REVIEWER, hof: 'hof-sued' });
    expect(data.submittedBy).toBe('user-web');
  });

  it('closes a form at its due date, except for the reviewers', async () => {
    const closing = { area: 'infrastructure', deadline: PAST, closesAtDeadline: true };
    await expect(run({ user: HOF_NORD_ADMIN, settings: closing })).rejects.toMatchObject({
      status: 400,
      message: 'Dieses Formular ist seit dem Abgabetermin geschlossen.',
    });
    await expect(run({ user: REVIEWER, settings: closing })).resolves.toMatchObject({
      submittedBy: 'user-web',
    });
  });

  it('keeps a form open before its due date, or past one it does not close at', async () => {
    await expect(
      run({
        user: HOF_NORD_ADMIN,
        settings: { area: 'infrastructure', deadline: FUTURE, closesAtDeadline: true },
      }),
    ).resolves.toMatchObject({ submittedBy: 'user-nord' });
    await expect(
      run({
        user: HOF_NORD_ADMIN,
        settings: { area: 'infrastructure', deadline: PAST, closesAtDeadline: false },
      }),
    ).resolves.toMatchObject({ submittedBy: 'user-nord' });
  });

  it('leaves a form off the dashboard alone, signed in or not', async () => {
    // eslint-disable-next-line unicorn/no-null -- Payload stores an unset select as null
    await expect(run({ settings: { area: null } })).resolves.toMatchObject({
      submittedBy: 'someone-else',
    });
    // eslint-disable-next-line unicorn/no-null -- a form never linked has no group at all
    await expect(run({ settings: null })).resolves.toMatchObject({
      submittedBy: 'someone-else',
    });
  });

  it('checks nothing while the dashboard is switched off', async () => {
    environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(run({})).resolves.toMatchObject({ submittedBy: 'someone-else' });
    expect(findByID).not.toHaveBeenCalled();
  });

  it('checks nothing when a submission is edited', async () => {
    await expect(run({ operation: 'update' })).resolves.toMatchObject({
      submittedBy: 'someone-else',
    });
    expect(findByID).not.toHaveBeenCalled();
  });
});
