import { Inter, Montserrat } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const sharedFontClassName = `${montserrat.className} ${inter.className}`;
