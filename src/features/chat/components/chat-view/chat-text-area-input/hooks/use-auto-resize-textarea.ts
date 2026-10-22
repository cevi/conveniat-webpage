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
    const textarea = textareaReference.current;
    if (textarea === null) return;
    textarea.style.height = 'auto';
    // an empty field measures its placeholder, and a long one, like a chat named after a person,
    // wraps: the field would be two lines tall until the first key and then jump to one
    if (textarea.value === '') return;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return { textareaRef: textareaReference, resize };
};
