import type React from 'react';
import { useEffect, useState } from 'react';

export const useIntersectionObserver = (reference: React.RefObject<Element | null>): boolean => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting === true) {
        setIsIntersecting(true);
        observer.disconnect();
      }
    });

    observer.observe(element);

    return (): void => observer.disconnect();
  }, [reference]);

  return isIntersecting;
};
