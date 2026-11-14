/**
 * @jest-environment jsdom
 */
import { FilledStatusCell } from '@/features/payload-cms/payload-cms/components/filled-status/filled-status-cell';
import { render, screen } from '@testing-library/react';
import type { DefaultServerCellComponentProps } from 'payload';

const count = jest.fn<Promise<number>, [unknown]>();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: { enrollment: { count: (query: unknown): Promise<number> => count(query) } },
}));

const cellProperties = (
  slug: string,
  rowData?: Record<string, unknown>,
  invertColors = false,
): DefaultServerCellComponentProps =>
  ({
    rowData,
    collectionConfig: { slug },
    field: { admin: { custom: { invertColors } } },
  }) as unknown as DefaultServerCellComponentProps;

describe('FilledStatusCell', () => {
  beforeEach(() => count.mockReset());

  it('shows the enrolled count of the row against its maximum, however the list was opened', async () => {
    count.mockResolvedValue(4);

    render(
      await FilledStatusCell(
        cellProperties('helper-shifts', { id: 'shift-1', participants_max: 6 }),
      ),
    );

    expect(screen.getByText(/4\/6/)).toBeTruthy();
    expect(count).toHaveBeenCalledWith({ where: { courseId: 'shift-1', courseType: 'SHIFT' } });
  });

  it('counts programme blocks as programme enrolments', async () => {
    count.mockResolvedValue(2);

    render(await FilledStatusCell(cellProperties('camp-schedule-entry', { id: 'block-1' })));

    expect(screen.getByText(/2/)).toBeTruthy();
    expect(count).toHaveBeenCalledWith({ where: { courseId: 'block-1', courseType: 'PROGRAM' } });
  });

  it('renders nothing when Payload renders it without a row, as it does for the edit form', async () => {
    const { container } = render(await FilledStatusCell(cellProperties('helper-shifts')));

    expect(container.textContent).toBe('');
    expect(count).not.toHaveBeenCalled();
  });
});
