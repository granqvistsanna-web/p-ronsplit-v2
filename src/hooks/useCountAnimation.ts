import { useEffect, useState, useRef } from 'react';

interface UseCountAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
  /** If true, re-animates from the previous value when endValue changes */
  animateOnChange?: boolean;
}

// Notion-style easing function (ease-out-cubic)
const defaultEasing = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const useCountAnimation = (
  endValue: number,
  options: UseCountAnimationOptions = {}
): number => {
  const { duration = 1200, delay = 0, easing = defaultEasing, animateOnChange = false } = options;
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimatedRef = useRef(false);
  const previousValueRef = useRef(0);

  useEffect(() => {
    // After initial animation, snap unless animateOnChange is true
    if (hasAnimatedRef.current && !animateOnChange) {
      setCount(endValue);
      return;
    }

    const startValue = hasAnimatedRef.current ? previousValueRef.current : 0;
    hasAnimatedRef.current = true;

    // Clean up previous animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    startTimeRef.current = undefined;

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
      const currentCount = startValue + (endValue - startValue) * easedProgress;

      setCount(currentCount);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = endValue;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration, delay, easing, animateOnChange]);

  return count;
};
