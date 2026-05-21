import configPromise from '@payload-config';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

export async function GET(): Promise<NextResponse> {
  const payload = await getPayload({ config: configPromise });
  const announcements = await payload.find({
    collection: 'announcements',
    limit: 1,
    sort: '-createdAt',
  });

  if (announcements.docs.length > 0) {
    const document_ = announcements.docs[0];
    if (document_) {
      return NextResponse.json(document_.content);
    }
  }
  return NextResponse.json({ error: 'No announcements found' });
}
