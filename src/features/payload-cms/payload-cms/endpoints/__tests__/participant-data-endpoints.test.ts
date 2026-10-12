jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    BILLING_ADMIN_GROUP_ID: [900],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [109],
  },
}));

jest.mock('@/lib/db/redis', () => ({ getFeatureFlag: jest.fn() }));

const mockEnrollment = {
  findMany: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
  deleteMany: jest.fn(),
};
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    // read lazily: a module on the import path touches the client before `mockEnrollment` exists
    get enrollment(): unknown {
      return mockEnrollment;
    },
    user: { upsert: jest.fn() },
  },
}));

import {
  campScheduleOrganiserExportHandler,
  helperShiftOrganiserExportHandler,
} from '@/features/payload-cms/payload-cms/endpoints/course-organiser-export';
import { courseParticipantsExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-participants-export';
import { handleParticipantMutation } from '@/features/payload-cms/payload-cms/endpoints/course-participants-manager';
import { helperJobsPdfReportHandler } from '@/features/payload-cms/payload-cms/endpoints/helper-jobs-pdf-report';
import { helperShiftParticipationExportHandler } from '@/features/payload-cms/payload-cms/endpoints/helper-shift-participation-export';
import type { PayloadHandler, PayloadRequest } from 'payload';

const FULL_ADMIN = 541;
const WEB_CORE_TEAM = 105;
const TRANSLATION_TEAM = 106;
const PROGRAM_TEAM = 107;
const BILLING = 900;
/** A camp participant: logged in through Cevi.DB, in no group that reaches the admin panel. */
const PARTICIPANT = 4242;

interface RequestOptions {
  groupId: number;
  url: string;
  method?: string;
  id?: string;
}

const createRequest = ({
  groupId,
  url,
  method = 'GET',
  id,
}: RequestOptions): { request: PayloadRequest; find: jest.Mock; findByID: jest.Mock } => {
  const find = jest.fn().mockResolvedValue({ docs: [] });
  const findByID = jest.fn();
  return {
    find,
    findByID,
    request: {
      url,
      method,
      routeParams: id === undefined ? {} : { id },
      user: { id: 'u1', groups: [{ id: groupId }] },
      payload: { find, findByID, logger: { error: jest.fn() } },
    } as unknown as PayloadRequest,
  };
};

const endpoints: {
  name: string;
  handler: PayloadHandler;
  request: Omit<RequestOptions, 'groupId'>;
}[] = [
  {
    name: 'helper shift participation export',
    handler: helperShiftParticipationExportHandler,
    request: { url: 'http://localhost/api/helper-shifts/participation-export' },
  },
  {
    name: 'helper shift organiser export',
    handler: helperShiftOrganiserExportHandler,
    request: { url: 'http://localhost/api/helper-shifts/organiser-export' },
  },
  {
    name: 'programme organiser export',
    handler: campScheduleOrganiserExportHandler,
    request: { url: 'http://localhost/api/camp-schedule-entry/organiser-export' },
  },
  {
    name: 'course participants export',
    handler: courseParticipantsExportHandler,
    request: { url: 'http://localhost/api/camp-schedule-entry/c1/participants-export', id: 'c1' },
  },
  {
    name: 'enrolment of a participant',
    handler: handleParticipantMutation,
    request: {
      url: 'http://localhost/api/helper-shifts/c1/participants',
      method: 'POST',
      id: 'c1',
    },
  },
  {
    name: 'removal of a participant',
    handler: handleParticipantMutation,
    request: {
      url: 'http://localhost/api/helper-shifts/c1/participants?userId=u2',
      method: 'DELETE',
      id: 'c1',
    },
  },
  {
    name: 'helper jobs PDF report',
    handler: helperJobsPdfReportHandler,
    request: { url: 'http://localhost/api/helper-jobs/report/pdf?formId=f1' },
  },
];

describe('the endpoints that hand out participant data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnrollment.findMany.mockResolvedValue([]);
  });

  describe.each(endpoints)('$name', ({ handler, request: options }) => {
    it.each([
      ['the translation team', TRANSLATION_TEAM],
      ['the program team', PROGRAM_TEAM],
      ['the billing team', BILLING],
      ['a participant', PARTICIPANT],
    ])('refuses %s without reading or writing anything', async (_, groupId) => {
      const { request, find, findByID } = createRequest({ ...options, groupId });

      const response = await handler(request);

      expect(response.status).toBe(401);
      expect(find).not.toHaveBeenCalled();
      expect(findByID).not.toHaveBeenCalled();
      for (const operation of Object.values(mockEnrollment)) {
        expect(operation).not.toHaveBeenCalled();
      }
    });
  });

  it.each([
    ['a full admin', FULL_ADMIN],
    ['the web core team', WEB_CORE_TEAM],
  ])('lets %s remove a participant', async (_, groupId) => {
    const { request } = createRequest({
      groupId,
      url: 'http://localhost/api/helper-shifts/c1/participants?userId=u2',
      method: 'DELETE',
      id: 'c1',
    });

    const response = await handleParticipantMutation(request);

    expect(response.status).toBe(200);
    expect(mockEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { courseId: 'c1', userId: 'u2', courseType: 'SHIFT' },
    });
  });

  it.each([
    ['a full admin', FULL_ADMIN],
    ['the web core team', WEB_CORE_TEAM],
  ])('lets %s read the participants of a course', async (_, groupId) => {
    const { request, find } = createRequest({
      groupId,
      url: 'http://localhost/api/camp-schedule-entry/c1/participants-export?format=json',
      id: 'c1',
    });

    const response = await courseParticipantsExportHandler(request);

    expect(response.status).toBe(200);
    expect(mockEnrollment.findMany).toHaveBeenCalled();
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users' }));
  });
});
