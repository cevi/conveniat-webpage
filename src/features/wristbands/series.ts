/*
The bands of one run of "Nur programmieren", by their running number. The AVP never sees a
UID; the number is how "Band 24 · Nochmals anhalten" names the band in the hand.
*/

export interface SeriesBand {
  /** counted from 1, in the order the bands were first held to the phone */
  number: number;
  uid: string;
  state: 'done' | 'again' | 'refused';
}

/**
 * The run once a band came off the phone: a band held before keeps its number and takes the
 * new state, except that a finished band stays finished; a new one is numbered next.
 */
export const recordSeriesBand = (
  bands: SeriesBand[],
  uid: string,
  state: SeriesBand['state'],
): SeriesBand[] => {
  const known = bands.find((band) => band.uid === uid);
  if (known === undefined) return [...bands, { number: bands.length + 1, uid, state }];
  if (known.state === 'done') return bands;
  return bands.map((band) => (band.uid === uid ? { ...band, state } : band));
};

/** Whether this band is finished in this run already, e.g. left lying on the phone. */
export const isSeriesBandDone = (bands: SeriesBand[], uid: string): boolean =>
  bands.some((band) => band.uid === uid && band.state === 'done');
