'use server';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import { deleteEverything, onPayloadInit } from '..';

export const resetServerData = async (): Promise<void> => {
  const payload = await getPayload({ config });
  await deleteEverything(payload);
  await onPayloadInit(payload);

  redirect('/admin/logout');
};
