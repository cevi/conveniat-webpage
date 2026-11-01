import { NotFound } from '@/app/(frontend)/(not-found)/not-found';
import type React from 'react';

/** A page of the app that calls `notFound()` stays inside the app, with the way back to Home. */
const AppNotFound: React.FC = () => <NotFound />;

export default AppNotFound;
