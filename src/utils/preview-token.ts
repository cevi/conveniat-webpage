'use server';

import { environmentVariables } from '@/config/environment-variables';
import * as jwt from 'jsonwebtoken';

export const generatePreviewToken = async (
  id: string,
  expiresIn: number = 86_400,
): Promise<string> =>
  new Promise((resolve) => {
    const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;
    resolve(jwt.sign({ id }, JWT_SECRET_KEY, { expiresIn: expiresIn }));
  });

export const isPreviewTokenValid = async (id: string, token: string): Promise<boolean> =>
  new Promise((resolve) => {
    const JWT_SECRET_KEY = environmentVariables.JWT_SECRET;

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY) as unknown as { id: string };
      return resolve(decoded.id === id);
    } catch {
      return resolve(false);
    }
  });
