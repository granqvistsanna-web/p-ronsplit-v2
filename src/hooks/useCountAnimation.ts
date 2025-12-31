import { useEffect, useState, useRef } from 'react';

interface UseCountAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
}

// Notion-style easing function (ease-out-cubic)
const defaultEasing = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const useCountAnimation = (
  endValue: number,
  options: UseCountAnimationOptions = {}
): number => {
  const { duration = 1200, delay = 0, easing = defaultEasing } = options;
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimatedRef.current) {
      setCount(endValue);
      return;
    }

    hasAnimatedRef.current = true;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime + delay;
      }

      const elapsed = currentTime - startTimeRef.current;

      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      const currentCount = easedProgress * endValue;

      setCount(currentCount);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration, delay, easing]);

  return count;
};
