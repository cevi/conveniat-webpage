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
    const intervalId = setIntervalImmediately(() => {
      setError(undefined);

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
    }, 1000);

    return (): void => clearInterval(intervalId); // Cleanup on unmount
  }, []);

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
    const intervalId = setIntervalImmediately(() => {
      setError(undefined);

      getChatDetail(chatId)
        .then((fetchedChatDetail) => {
          // debounce if object has not changed
          if (JSON.stringify(chatDetail) === JSON.stringify(fetchedChatDetail)) {
            setLoading(false);
            return;
          } else {
            console.log(chatDetail);
            console.log(fetchedChatDetail);
          }

          setChatDetail(fetchedChatDetail);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch chat detail.');
          setLoading(false);
        });
    }, 1000);

    return (): void => clearInterval(intervalId); // Cleanup on unmount
  }, [chatId]);

  return { chatDetail, loading, error };
};
