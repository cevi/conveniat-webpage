import { fetchChatUser } from '@/features/chat/api/get-chat-user';
import { useEffect, useState } from 'react';

export const useChatUser = (): {
  user: string | undefined;
  loading: boolean;
  error: string | undefined;
} => {
  const [user, setUser] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetchChatUser()
      .then((_user) => {
        setLoading(false);
        setUser(_user);
      })
      .catch(() => {
        setError('Failed to fetch chats.');
        setLoading(false);
      });
  }, []);

  return { user, loading, error };
};
