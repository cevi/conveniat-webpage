import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';

/**
 * Leaves a group chat and returns to the chat overview. Not optimistic: leaving cannot be
 * undone by the user, so the chat stays until the server has confirmed it.
 */
export const useLeaveChatMutation = (): ReturnType<typeof trpc.chat.leaveChat.useMutation> => {
  const trpcUtils = trpc.useUtils();
  const router = useRouter();

  return trpc.chat.leaveChat.useMutation({
    onSuccess: (_, { chatUuid }) => {
      trpcUtils.chat.chats.setData({}, (chats) => chats?.filter((chat) => chat.id !== chatUuid));
      trpcUtils.chat.chats.invalidate().catch(console.error);
      router.push('/app/chat');
    },
  });
};
