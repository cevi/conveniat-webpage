import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

export const useAutoResizeTextarea = (
  value: string,
): {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  resize: () => void;
} => {
  const textareaReference = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    if (textareaReference.current) {
      textareaReference.current.style.height = 'auto';
      textareaReference.current.style.height = `${textareaReference.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return { textareaRef: textareaReference, resize };
};
