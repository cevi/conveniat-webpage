import { Inter, Montserrat } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'block',
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'block',
});

export const sharedFontClassName = `${montserrat.className} ${inter.className}`;
