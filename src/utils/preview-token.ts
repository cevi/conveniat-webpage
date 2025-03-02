'use server';

import * as jwt from 'jsonwebtoken';

export const generatePreviewToken = async (url: string): Promise<string> => {
  const JWT_SECRET_KEY = process.env['JWT_SECRET'] ?? '';

  return jwt.sign({ url }, JWT_SECRET_KEY, { expiresIn: '3h' });
};

export const isPreviewTokenValid = async (url: string, token: string): Promise<boolean> => {
  const JWT_SECRET_KEY = process.env['JWT_SECRET'] ?? '';

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as { url: string };
    return decoded.url == url;
  } catch {
    return false;
  }
};
