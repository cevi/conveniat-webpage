/** Names the operator behind a manual action, for the participant's history. */
export function describeActor(user: unknown): string {
  if (user !== null && typeof user === 'object') {
    const record = user as Record<string, unknown>;
    for (const key of ['name', 'email', 'id']) {
      const value = record[key];
      if (typeof value === 'string' && value !== '') return value;
    }
  }
  return 'unbekannt';
}
