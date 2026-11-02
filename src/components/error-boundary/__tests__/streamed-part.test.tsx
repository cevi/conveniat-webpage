/**
 * @jest-environment jsdom
 */
import { StreamedPart } from '@/components/error-boundary/streamed-part';
import { render, screen } from '@testing-library/react';
import type React from 'react';

/** How React fails a server component whose rows never arrived. */
const DroppedStream: React.FC = () => {
  throw new Error('Minified React error #412; visit https://react.dev/errors/412');
};

describe('a streamed part of the layout', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('keeps the shell version, and the page around it, when its stream dropped', () => {
    render(
      <main>
        <StreamedPart fallback={<p>published menu</p>}>
          <DroppedStream />
        </StreamedPart>
        <p>page</p>
      </main>,
    );
    expect(screen.getByText('published menu')).toBeInTheDocument();
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('shows the streamed version once it arrived', () => {
    render(
      <StreamedPart fallback={<p>published menu</p>}>
        <p>draft menu</p>
      </StreamedPart>,
    );
    expect(screen.getByText('draft menu')).toBeInTheDocument();
    expect(screen.queryByText('published menu')).not.toBeInTheDocument();
  });
});
