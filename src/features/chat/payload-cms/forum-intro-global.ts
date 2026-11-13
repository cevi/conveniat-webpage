import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { titledPointsField } from '@/features/payload-cms/payload-cms/shared-fields/titled-points-field';
import { revalidateTag } from 'next/cache';
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';

/** Expires the cached intro, so a correction reaches the next first-time visitor. */
const expireIntroAtOnce: GlobalAfterChangeHook = ({ req }): void => {
  if (Boolean(req.context['disableRevalidation'])) return;
  try {
    revalidateTag('global:forum-intro', { expire: 0 });
  } catch (error: unknown) {
    req.payload.logger.warn({ error }, 'Expiring the forum intro failed');
  }
};

/**
 * What the forum in the app says to someone who opens it for the first time, in its editors'
 * words: what it is for, how private and public work, the rules and where emergencies go.
 * Buttons and the way back to it ("So funktioniert's") stay in the code.
 */
export const ForumIntroGlobal: GlobalConfig = {
  slug: 'forum-intro',
  label: { en: 'Forum Introduction', de: 'Forum-Einführung', fr: 'Introduction du forum' },
  access: {
    // public texts, read by the app for everyone who opens the forum
    read: () => true,
    update: hasAdminOrWebAccess,
  },
  admin: {
    group: AdminPanelDashboardGroups.AppContent.label,
    hidden: shouldHideInAdminPanel,
    description: {
      en: 'Shown once on each device when someone opens the forum for the first time, and again from "How it works" in the forum. Leave the title empty to skip it. French and English fall back to German.',
      de: 'Erscheint auf jedem Gerät einmal, wenn jemand das Forum zum ersten Mal öffnet, und wieder über «So funktioniert’s» im Forum. Titel leer lassen, um sie wegzulassen. Französisch und Englisch fallen auf Deutsch zurück.',
      fr: 'Affichée une fois sur chaque appareil quand quelqu’un ouvre le forum pour la première fois, puis via « Comment ça marche » dans le forum. Laisser le titre vide pour la sauter. Le français et l’anglais se rabattent sur l’allemand.',
    },
  },
  hooks: {
    afterChange: [expireIntroAtOnce],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: { en: 'Title', de: 'Titel', fr: 'Titre' },
      admin: {
        description: {
          en: 'e.g. "Ask the camp"',
          de: 'z.B. «Frag das Lager»',
          fr: 'p. ex. « Demande au camp »',
        },
      },
    },
    {
      name: 'text',
      type: 'textarea',
      localized: true,
      label: { en: 'Text', de: 'Text', fr: 'Texte' },
    },
    titledPointsField(
      'points',
      { en: 'Points', de: 'Punkte', fr: 'Points' },
      {
        en: 'In this order, e.g. "Topics with a core team", "Search first", "Public or private", "Stay fair", "Emergency?". The emergency icon shows in red.',
        de: 'In dieser Reihenfolge, z.B. «Themen mit Kernteam», «Erst suchen», «Öffentlich oder privat», «Fair bleiben», «Notfall?». Das Notfall-Icon erscheint rot.',
        fr: 'Dans cet ordre, p. ex. « Thèmes avec équipe centrale », « D’abord chercher », « Public ou privé », « Rester fair », « Urgence ? ». L’icône urgence s’affiche en rouge.',
      },
      {
        en: 'Empty: a speech bubble.',
        de: 'Leer: eine Sprechblase.',
        fr: 'Vide : une bulle.',
      },
    ),
  ],
};
