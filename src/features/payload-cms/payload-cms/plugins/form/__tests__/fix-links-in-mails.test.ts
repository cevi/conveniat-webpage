const APPROVAL_TOKEN = '11111111-2222-4333-8444-555555555555';
const APPROVAL_URL = `https://conveniat27.ch/api/form-submissions/approve?token=${APPROVAL_TOKEN}`;
const FORGED_URL = 'https://evil.example/phish';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    APP_HOST_URL: 'https://conveniat27.ch',
    FEATURE_ENABLE_APP_FEATURE: false,
  },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('@/lib/s3', () => ({ S3_BUCKET_NAME: 'bucket', s3Client: { send: jest.fn() } }));
jest.mock('@aws-sdk/client-s3', () => ({ GetObjectCommand: jest.fn() }));
jest.mock('@/features/payload-cms/payload-cms/utils/phone-link-html-converter', () => ({
  phoneLinkHTMLConverters: {},
}));
jest.mock('@/features/payload-cms/payload-cms/utils/send-tracked-email', () => ({
  sendTrackedEmail: jest.fn(() => Promise.resolve({ success: true, outgoingEmailId: 'mail-1' })),
}));

interface TextNode {
  text?: string;
  children?: TextNode[];
}

/** Renders the text of a Lexical tree, which is all the placeholders touch. */
const textOf = (node: TextNode): string =>
  (node.text ?? '') + (node.children ?? []).map((child) => textOf(child)).join('');

// `@payloadcms/richtext-lexical` ships ESM only, which Jest cannot require
jest.mock('@payloadcms/richtext-lexical/html', () => ({
  defaultHTMLConverters: {},
  convertLexicalToHTML: ({ data }: { data: { root: TextNode } }): string => textOf(data.root),
}));

const mockPayload = {
  findByID: jest.fn(),
  find: jest.fn(() => Promise.resolve({ docs: [] })),
  update: jest.fn(() => Promise.resolve({})),
  create: jest.fn(() => Promise.resolve({ id: 'mail-1' })),
  logger: { debug: jest.fn(), error: jest.fn() },
};
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));

import { beforeEmailChangeHook } from '@/features/payload-cms/payload-cms/plugins/form/fix-links-in-mails';
import type { FormattedEmail } from '@payloadcms/plugin-form-builder/types';

/** A form whose one email asks the approver to confirm, with a Lexical message. */
const formWithMessage = (text: string): Record<string, unknown> => ({
  id: 'form-1',
  emails: [
    {
      message: {
        root: {
          type: 'root',
          children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
        },
      },
    },
  ],
});

/** The HTML of the one email sent for a submission with the given answers. */
const sentHtmlFor = async (
  text: string,
  submissionData: { field: string; value: string }[],
): Promise<string> => {
  mockPayload.findByID.mockResolvedValue(formWithMessage(text));
  const email = { to: 'approver@example.com', subject: 'Bitte bestätigen', html: '' };
  await beforeEmailChangeHook([email as FormattedEmail], {
    doc: { id: 'submission-1', form: 'form-1', approvalToken: APPROVAL_TOKEN, submissionData },
  } as unknown as Parameters<typeof beforeEmailChangeHook>[1]);
  const [[{ data }]] = mockPayload.create.mock.calls as unknown as [[{ data: { html: string } }]];
  return data.html;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('beforeEmailChangeHook — reserved placeholders', () => {
  it('fills in the answers a message names', async () => {
    await expect(
      sentHtmlFor('Stand: {{stand}}', [{ field: 'stand', value: 'Crêpes' }]),
    ).resolves.toContain('Stand: Crêpes');
  });

  it.each(['approvalLink', 'approval-link', 'approvalUrl'])(
    'keeps the approval link when an answer is named %s',
    async (field) => {
      const html = await sentHtmlFor(`Bestätigen: {{${field}}}`, [{ field, value: FORGED_URL }]);
      expect(html).toContain(APPROVAL_URL);
      expect(html).not.toContain(FORGED_URL);
    },
  );

  it('keeps the submission id when an answer is named formSubmissionID', async () => {
    const html = await sentHtmlFor('Antwort {{formSubmissionID}}', [
      { field: 'formSubmissionID', value: 'forged-id' },
    ]);
    expect(html).toContain('Antwort submission-1');
    expect(html).not.toContain('forged-id');
  });
});
