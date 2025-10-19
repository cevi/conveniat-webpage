import { draftMode } from 'next/headers';

const GET = async (): Promise<Response> => {
  const draft = await draftMode();
  draft.enable();
  return new Response('Draft mode is enabled');
};

export { GET };
