import { refreshUserFunktionen } from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { Payload } from 'payload';

/** Cevi.DB person id of the "Admin + Billing" login of `dev-oauth/fake_oauth.py`. */
const ADMIN_LOGIN_PERSON_ID = '2';

/**
 * Two functions the way the Cevi.DB sync would leave them after an editor labelled them,
 * since a local stack has no Cevi.DB to sync from. The first random user holds both, the
 * second the Ressortleitung, and the admin login the Projektleitung once it logs in.
 */
export const seedFunktionen = async (payload: Payload, userIds: string[]): Promise<void> => {
  const ceviIds: string[] = [];
  for (const userId of userIds.slice(0, 2)) {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 });
    if (typeof user.cevi_db_uuid === 'number') ceviIds.push(String(user.cevi_db_uuid));
  }
  const [first, second] = ceviIds;

  const funktionen = [
    {
      groupId: '4046',
      groupName: 'Projektleitung conveniat27',
      order: 0,
      personIds: [first, ADMIN_LOGIN_PERSON_ID].filter((id) => id !== undefined),
      label: { de: 'Projektleitung', fr: 'Direction du projet', en: 'Project lead' },
    },
    {
      groupId: '990101',
      groupName: 'Ressort Infrastruktur',
      order: 10,
      personIds: [first, second].filter((id) => id !== undefined),
      label: {
        de: 'Ressortleitung Infrastruktur',
        fr: 'Responsable du ressort Infrastructure',
        en: 'Head of Infrastructure',
      },
    },
  ];

  for (const { label, ...funktion } of funktionen) {
    const { id } = await payload.create({
      collection: 'funktionen',
      locale: 'de',
      data: { ...funktion, label: label.de },
      context: { internal: true },
    });
    for (const locale of ['fr', 'en'] as const) {
      await payload.update({
        collection: 'funktionen',
        id,
        locale,
        data: { label: label[locale] },
        context: { internal: true },
      });
    }
  }

  await refreshUserFunktionen(payload);
};
