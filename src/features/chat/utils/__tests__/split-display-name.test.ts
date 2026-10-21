import { splitDisplayName } from '@/features/chat/utils/split-display-name';

describe('splitDisplayName', () => {
  it('leads with the Ceviname and keeps the real name beside it', () => {
    expect(splitDisplayName('Anna Muster v/o Fuchs')).toEqual({
      primary: 'Fuchs',
      secondary: 'Anna Muster',
    });
  });

  it('keeps a name without a Ceviname whole', () => {
    expect(splitDisplayName('Anna Muster')).toEqual({ primary: 'Anna Muster' });
  });

  it('shows a lone Ceviname on its own', () => {
    expect(splitDisplayName('v/o Fuchs')).toEqual({ primary: 'Fuchs' });
  });

  it('keeps a Ceviname of several words', () => {
    expect(splitDisplayName('Prof. Dr. Justine Freimuth v/o Kleiner Bär')).toEqual({
      primary: 'Kleiner Bär',
      secondary: 'Prof. Dr. Justine Freimuth',
    });
  });
});
