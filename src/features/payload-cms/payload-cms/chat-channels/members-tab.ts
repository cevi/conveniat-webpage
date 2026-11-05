import type { Tab } from 'payload';

/** The tab listing who is in a channel's chat right now, read from the chat database. */
export const membersTab = (): Tab => ({
  label: { en: 'Members', de: 'Mitglieder', fr: 'Membres' },
  fields: [
    {
      name: 'members',
      type: 'ui',
      admin: {
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/chat-channel/channel-members#ChannelMembersField',
        },
        disableListColumn: true,
      },
    },
  ],
});
