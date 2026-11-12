import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ForumIntro } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/** Local stand-in for the forum's intro; the real one is written by the editors. */
const FORUM_INTRO_DE: Omit<ForumIntro, 'id'> = {
  title: 'Frag das Lager',
  text: 'Hier fragst du, meldest Probleme und bringst Ideen ein. Die Ressorts antworten.',
  points: [
    {
      icon: 'users',
      title: 'Themen mit Kernteam',
      text: 'Jedes Thema hat ein Kernteam, das antwortet und Probleme erledigt.',
    },
    {
      icon: 'search',
      title: 'Erst suchen, dann schreiben',
      text: 'Gibt es das schon, sag «Ich auch». Das hilft mehr als ein zweiter Beitrag.',
    },
    {
      icon: 'lock',
      title: 'Öffentlich oder privat',
      text: 'Alle im Thema sehen deinen Beitrag mit deinem Namen. Heikles schreibst du dem Kernteam privat.',
    },
    {
      icon: 'flag',
      title: 'Fair bleiben',
      text: 'Stört dich etwas, melde es. Die Moderation kann ausblenden und sagt dir, warum.',
    },
    { icon: 'siren', title: 'Notfall?', text: 'Nicht ins Forum, sondern in den Notfall-Tab.' },
  ],
};

/** Fills the forum's intro in German, which French and English fall back to. */
export const seedForumIntro = async (payload: Payload): Promise<void> => {
  await payload.updateGlobal({
    slug: 'forum-intro',
    locale: LOCALE.DE,
    data: FORUM_INTRO_DE,
    context: { disableRevalidation: true },
  });
};
