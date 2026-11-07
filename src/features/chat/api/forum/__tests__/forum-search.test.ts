import {
  findForumPostsMatching,
  type ForumSuggestion,
  rankForumSuggestions,
  searchWordsOf,
} from '@/features/chat/api/forum/forum-search';
import type { PrismaClientOrTransaction } from '@/types/types';

const suggestion = (id: string, overrides: Partial<ForumSuggestion> = {}): ForumSuggestion => ({
  id,
  topicId: 'topic',
  topicName: 'Platz & Infrastruktur',
  title: id,
  excerpt: '',
  status: 'OPEN',
  createdAt: new Date(0),
  author: null,
  byTopicAdmin: false,
  location: null,
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  pinned: false,
  imageCount: 0,
  ...overrides,
});

describe('the words a title is searched by', () => {
  it('keeps letters and digits in lower case, short words like WC included', () => {
    expect(searchWordsOf('WC-Anlage Züri 11: kein Wasser!')).toEqual([
      'wc',
      'anlage',
      'züri',
      '11',
      'kein',
      'wasser',
    ]);
  });

  it('drops what could be query syntax', () => {
    expect(searchWordsOf("a & b | !c:* ' ) --")).toEqual([]);
  });
});

describe('the search query', () => {
  it('sends the typed words as parameters, never as SQL', async () => {
    const queries: { sql: string; values: unknown[] }[] = [];
    const prisma = {
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> => {
        queries.push({ sql: strings.join('?'), values });
        return Promise.resolve([{ id: 'post', score: 0.8 }]);
      },
    } as unknown as PrismaClientOrTransaction;

    const hits = await findForumPostsMatching(prisma, 'noah', ['toitoi', 'voll']);

    expect(hits).toEqual(new Map([['post', 0.8]]));
    expect(queries[0]?.sql).not.toMatch(/toitoi|voll|noah/);
    expect(JSON.stringify(queries[0]?.values)).toMatch(/toitoi:\* \| voll:\*/);
  });

  it('asks nothing without a word', async () => {
    const prisma = { $queryRaw: jest.fn() } as unknown as PrismaClientOrTransaction;

    await expect(findForumPostsMatching(prisma, 'noah', [])).resolves.toEqual(new Map());
  });
});

describe('the order of similar posts', () => {
  it('puts what matches the title before what is only nearby', () => {
    const ranked = rankForumSuggestions(
      [suggestion('nearby', { distanceMetres: 5 }), suggestion('same words')],
      new Map([['same words', 1.4]]),
    );

    expect(ranked.map((post) => post.id)).toEqual(['same words', 'nearby']);
  });

  it('puts the nearer of two equally good matches first, then the more liked', () => {
    const ranked = rankForumSuggestions(
      [
        suggestion('far', { distanceMetres: 40, likeCount: 30 }),
        suggestion('liked', { likeCount: 12 }),
        suggestion('near', { distanceMetres: 8 }),
        suggestion('unliked'),
      ],
      new Map([
        ['far', 1.01],
        ['near', 0.98],
        ['liked', 1],
        ['unliked', 1],
      ]),
    );

    expect(ranked.map((post) => post.id)).toEqual(['near', 'far', 'liked', 'unliked']);
  });

  it('lists a post already done after the open ones', () => {
    const ranked = rankForumSuggestions(
      [suggestion('done', { status: 'DONE' }), suggestion('open')],
      new Map([['done', 2]]),
    );

    expect(ranked.map((post) => post.id)).toEqual(['open', 'done']);
  });
});
