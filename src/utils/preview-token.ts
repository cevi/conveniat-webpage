'use server';

import { environmentVariables } from '@/config/environment-variables';
import * as jwt from 'jsonwebtoken';

export const generatePreviewToken = async (url: string): Promise<string> => {
  const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;

  return jwt.sign({ url }, JWT_SECRET_KEY, { expiresIn: '24h' });
};

export const isPreviewTokenValid = async (url: string, token: string): Promise<boolean> => {
  const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as { url: string };
    return decoded.url == url;
  } catch {
    return false;
  }
};
