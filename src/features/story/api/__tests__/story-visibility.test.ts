import type {
  RawStoryChallenge,
  RawStoryEvent,
  RawStoryFigure,
} from '@/features/story/api/story-visibility';
import { visibleStoryAt } from '@/features/story/api/story-visibility';

const NOW = new Date('2027-07-25T19:00:00.000Z');
const PAST = '2027-07-24T18:00:00.000Z';
const FUTURE = '2027-07-26T19:00:00.000Z';

const story = (
  parts: Partial<{
    events: RawStoryEvent[];
    figures: RawStoryFigure[];
    challenges: RawStoryChallenge[];
  }>,
): ReturnType<typeof visibleStoryAt> =>
  visibleStoryAt({ events: [], figures: [], challenges: [], ...parts }, NOW);

describe('visibleStoryAt', () => {
  it('shows what has appeared and nothing that appears later', () => {
    const { events, figures, challenges } = story({
      events: [
        { id: 'e-past', title: 'Ankunft am Hof', visibleFrom: PAST },
        { id: 'e-future', title: 'Der Verrat', visibleFrom: FUTURE },
      ],
      figures: [
        { id: 'f-past', name: 'König', visibleFrom: PAST },
        { id: 'f-future', name: 'Schattenhand', visibleFrom: FUTURE },
      ],
      challenges: [
        { id: 'c-past', title: 'Seilziehen', visibleFrom: PAST },
        { id: 'c-future', title: 'Rätsel', visibleFrom: FUTURE },
      ],
    });
    expect(events.map((event) => event.id)).toEqual(['e-past']);
    expect(figures.map((figure) => figure.id)).toEqual(['f-past']);
    expect(challenges.map((challenge) => challenge.id)).toEqual(['c-past']);
  });

  it('hides an entry without a valid date instead of showing it', () => {
    const { events, figures } = story({
      events: [
        { id: 'missing', visibleFrom: null },
        { id: 'broken', visibleFrom: 'not a date' },
      ],
      figures: [{ id: 'missing', name: 'Niemand' }],
    });
    expect(events).toEqual([]);
    expect(figures).toEqual([]);
  });

  it('keeps a section of a figure back until its own time, its event and the figure', () => {
    const [figure] = story({
      events: [
        { id: 'e-past', visibleFrom: PAST },
        { id: 'e-future', visibleFrom: FUTURE },
      ],
      figures: [
        {
          id: 'champion',
          name: 'Champion',
          visibleFrom: PAST,
          knowledge: [
            { id: 'known', text: 'Stolz und ehrgeizig.' },
            { id: 'later', text: 'Zweifelt am König.', visibleFrom: FUTURE },
            { id: 'with-hidden-event', text: 'Hat das Siegel.', event: 'e-future' },
            { id: 'with-gone-event', text: 'Gelöscht.', event: 'deleted-event' },
            { id: 'with-event', text: 'Verdächtigt Sora.', event: 'e-past' },
          ],
        },
      ],
    }).figures;
    expect(figure?.knowledge.map((section) => section.id)).toEqual(['known', 'with-event']);
  });

  it('shows a relationship only once both figures and its own time have appeared', () => {
    const [champion] = story({
      figures: [
        {
          id: 'champion',
          name: 'Champion',
          visibleFrom: PAST,
          relations: [
            { id: 'to-king', figure: 'king', description: 'Dient ihm' },
            { id: 'to-hidden', figure: 'shadow', description: 'Ist sein Bruder' },
            { id: 'later', figure: 'king', description: 'Verrät ihn', visibleFrom: FUTURE },
          ],
        },
        { id: 'king', name: 'König', visibleFrom: PAST },
        { id: 'shadow', name: 'Schattenhand', visibleFrom: FUTURE },
      ],
    }).figures;
    expect(champion?.relations.map((relation) => relation.id)).toEqual(['to-king']);
  });

  it('drops links from events and challenges to figures that have not appeared', () => {
    const { events, challenges } = story({
      events: [{ id: 'e', visibleFrom: PAST, figures: ['king', { id: 'shadow' }] }],
      figures: [
        { id: 'king', name: 'König', visibleFrom: PAST },
        { id: 'shadow', name: 'Schattenhand', visibleFrom: FUTURE },
      ],
      challenges: [{ id: 'c', visibleFrom: PAST, from: 'shadow' }],
    });
    expect(events[0]?.figureIds).toEqual(['king']);
    expect(challenges[0]?.fromId).toBeUndefined();
  });

  it('puts the backstory before the first day and gives the rest their camp day', () => {
    const { events } = story({
      events: [
        { id: 'prologue', isPrologue: true, day: '2027-07-24T22:00:00.000Z', visibleFrom: PAST },
        // midnight in Zurich, stored as the evening before in UTC
        { id: 'day', day: '2027-07-24T22:00:00.000Z', visibleFrom: PAST },
      ],
    });
    expect(events.map((event) => [event.id, event.dayKey])).toEqual([
      ['prologue', undefined],
      ['day', '2027-07-25'],
    ]);
  });
});
