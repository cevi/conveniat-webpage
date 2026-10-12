import { ClientProviders } from '@/context/client-providers';
import { renderToString } from 'react-dom/server';

jest.mock('next-auth/react', () => ({
  useSession: (): { status: string } => ({ status: 'loading' }),
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    schedule: {
      star: {
        toggleStar: { useMutation: (): { mutate: jest.Mock } => ({ mutate: jest.fn() }) },
        syncStars: { useMutation: (): { mutate: jest.Mock } => ({ mutate: jest.fn() }) },
      },
    },
  },
}));

describe('ClientProviders on the server', () => {
  // The providers wrap the whole application. When they could not render on the server, every
  // page shipped an empty body and was rendered in the browser only.
  it('renders its children into the HTML', () => {
    const html = renderToString(
      <ClientProviders>
        <main>Programm von heute</main>
      </ClientProviders>,
    );

    expect(html).toContain('<main>Programm von heute</main>');
  });
});
