import { ClientProviders } from '@/context/client-providers';
import { TRPCProvider } from '@/trpc/client';
import { renderToString } from 'react-dom/server';

jest.mock('next-auth/react', () => ({
  useSession: (): { status: string } => ({ status: 'loading' }),
}));

// the tRPC client reads the app's host from here, and the test has no environment to validate
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: '' },
}));

describe('ClientProviders on the server', () => {
  // The providers wrap the whole application. When they could not render on the server, every
  // page shipped an empty body and was rendered in the browser only. They sit inside the real
  // tRPC provider, as in the app shell, so its server render is covered too.
  it('renders its children into the HTML', () => {
    const html = renderToString(
      <TRPCProvider>
        <ClientProviders>
          <main>Programm von heute</main>
        </ClientProviders>
      </TRPCProvider>,
    );

    expect(html).toContain('<main>Programm von heute</main>');
  });
});
