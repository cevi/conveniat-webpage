/**
 * @jest-environment jsdom
 */
import { ForumPostRow } from '@/features/chat/components/forum/forum-post-row';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { render, screen } from '@testing-library/react';

const post = (overrides: Partial<ForumPostSummary> = {}): ForumPostSummary => ({
  id: 'post',
  topicId: 'topic',
  topicName: 'Programm',
  title: 'Regenprogramm: so läuft der Tag bei Gewitter',
  excerpt: 'Alle Blöcke ziehen in die Zelte der Quartiere.',
  status: 'OPEN',
  kind: 'IDEA',
  createdAt: new Date('2027-07-25T10:00:00Z'),
  author: { id: 'mia', name: 'Mia Keller v/o Luchs' },
  byTopicAdmin: false,
  location: null,
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  pinned: false,
  imageCount: 0,
  ...overrides,
});

const renderRow = (summary: ForumPostSummary, showTopic = false): HTMLElement => {
  render(
    <ul>
      <ForumPostRow
        post={summary}
        locale="de"
        showTopic={showTopic}
        now={new Date('2027-07-25T12:00:00Z')}
      />
    </ul>,
  );
  return screen.getByRole('link');
};

describe('a post in a list', () => {
  it('shows no counts while nobody liked or answered it', () => {
    const row = renderRow(post());
    expect(row.textContent).not.toMatch(/\b0\b/);
  });

  it('shows the counts once there is something to count', () => {
    const row = renderRow(post({ likeCount: 4, commentCount: 3 }));
    expect(row.textContent).toContain('4');
    expect(row.textContent).toContain('3');
  });

  it('signs a post of the Kernteam with its function instead of a badge and a name', () => {
    const row = renderRow(
      post({ byTopicAdmin: true, kernteamLabel: 'Ressortleitung PROST!' }),
      true,
    );
    expect(row.textContent).toContain('Kernteam: Ressortleitung PROST!');
    expect(row.textContent).not.toContain('Mia Keller');
    expect(row.textContent).toContain('Programm');
  });

  it('leaves the pin to the section label, so the title reads on its own', () => {
    expect(renderRow(post({ pinned: true })).textContent).toMatch(/^Regenprogramm/);
  });
});
