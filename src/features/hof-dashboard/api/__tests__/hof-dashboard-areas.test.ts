import { resolveHofDashboardAreas } from '@/features/hof-dashboard/api/hof-dashboard-areas';
import { DEFAULT_HOF_DASHBOARD_AREAS } from '@/features/hof-dashboard/constants';

describe('resolveHofDashboardAreas', () => {
  it('has the three tabs the dashboard always had while the settings name none', () => {
    expect(resolveHofDashboardAreas({})).toEqual(DEFAULT_HOF_DASHBOARD_AREAS);
    expect(resolveHofDashboardAreas(null)).toEqual(DEFAULT_HOF_DASHBOARD_AREAS);
  });

  it('has no tabs once the editors removed them all', () => {
    expect(resolveHofDashboardAreas([])).toEqual([]);
  });

  it('keeps the editors’ order and adds their tab', () => {
    const areas = resolveHofDashboardAreas([
      { id: 'infrastructure', label: { de: 'Infrastruktur' }, icon: 'hammer' },
      { id: 'general', label: { de: 'Allgemein', fr: 'Général' }, icon: 'info' },
      { id: 'program', label: { de: 'Programm' }, icon: 'sparkles' },
    ]);

    expect(areas.map((area) => area.id)).toEqual(['infrastructure', 'general', 'program']);
    // a language without its own name reads the German one
    expect(areas[1]).toEqual({
      id: 'general',
      label: { de: 'Allgemein', fr: 'Général', en: 'Allgemein' },
      icon: 'info',
    });
  });

  it('keeps the translations of a default tab saved in German only', () => {
    const [infrastructure] = resolveHofDashboardAreas([
      { id: 'infrastructure', label: { de: 'Infrastruktur' }, icon: 'hammer' },
    ]);

    expect(infrastructure?.label).toEqual({
      de: 'Infrastruktur',
      fr: 'Infrastructure',
      en: 'Infrastructure',
    });
  });

  it('reads a renamed default tab in German until it is translated', () => {
    const [infrastructure] = resolveHofDashboardAreas([
      { id: 'infrastructure', label: { de: 'Hofbauten' }, icon: 'hammer' },
    ]);

    expect(infrastructure?.label).toEqual({ de: 'Hofbauten', fr: 'Hofbauten', en: 'Hofbauten' });
  });

  it('gives a tab an icon the dashboard has', () => {
    const [area] = resolveHofDashboardAreas([
      { id: 'general', label: { de: 'Allgemein' }, icon: 'rocket' },
    ]);

    expect(area?.icon).toBe('clipboard-list');
  });
});
