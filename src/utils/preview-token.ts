'use server';

import { environmentVariables } from '@/config/environment-variables';
import * as jwt from 'jsonwebtoken';

export const generatePreviewToken = async (
  url: string,
  expiresIn: number = 86_400,
): Promise<string> =>
  new Promise((resolve) => {
    const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;
    resolve(jwt.sign({ url }, JWT_SECRET_KEY, { expiresIn: expiresIn }));
  });

export const isPreviewTokenValid = async (url: string, token: string): Promise<boolean> =>
  new Promise((resolve) => {
    const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as { url: string };
      return resolve(decoded.url == url);
    } catch {
      return resolve(false);
    }
  });
