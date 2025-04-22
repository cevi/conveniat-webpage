import { getChatDetail, getChats } from '@/features/chat/api/get-messages';
import type { Chat, ChatDetail } from '@/features/chat/types/chat';
import { useEffect, useState } from 'react';

const setIntervalImmediately = (callbackFunction: () => void, interval: number): NodeJS.Timeout => {
  callbackFunction();
  return setInterval(callbackFunction, interval);
};

export const useChats = (): {
  chats: Chat[];
  loading: boolean;
  error: string | undefined;
} => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchChats = (): void => {
      getChats()
        .then((fetchedChats) => {
          // debounce if object has not changed
          if (JSON.stringify(chats) === JSON.stringify(fetchedChats)) {
            setLoading(false);
            return;
          }

          setChats(fetchedChats);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch chats.');
          setLoading(false);
        });
    };

    setLoading(true);
    fetchChats();

    const handleMessage = (): void => {
      console.log('Received message via push notification, start fetching chats');
      fetchChats();
      setLoading(false);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return (): void => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [chats]);

  return { chats, loading, error };
};
export const useChatDetail = (
  chatId: string,
): {
  chatDetail: ChatDetail | undefined;
  loading: boolean;
  error: string | undefined;
} => {
  const [chatDetail, setChatDetail] = useState<ChatDetail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setError(undefined);

    const fetchChatDetails = (): void => {
      getChatDetail(chatId)
        .then((fetchedChatDetail) => {
          // debounce if object has not changed
          if (JSON.stringify(chatDetail) === JSON.stringify(fetchedChatDetail)) {
            setLoading(false);
            return;
          }

          setChatDetail(fetchedChatDetail);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch chat detail.');
          setLoading(false);
        });
    };

    fetchChatDetails();

    const handleMessage = (): void => {
      console.log('Received message via push notification, start fetching chats');
      fetchChatDetails();
      setLoading(false);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return (): void => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [chatDetail, chatId]);

  return { chatDetail, loading, error };
};
