import { useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const isLoading = useRef<boolean>(false);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current || document.body;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY !== 0) return; // Only allow at top
      touchStartY = e.touches[0].clientY;
      startY.current = touchStartY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isLoading.current) return;

      currentY.current = e.touches[0].clientY;
      const pullDistance = currentY.current - startY.current;

      if (pullDistance > 0 && pullDistance < threshold * 2) {
        isPulling.current = true;
        // Visual feedback could be added here
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isLoading.current) {
        isPulling.current = false;
        return;
      }

      const pullDistance = currentY.current - startY.current;
      
      if (pullDistance > threshold && window.scrollY === 0) {
        isLoading.current = true;
        try {
          await onRefresh();
        } finally {
          isLoading.current = false;
          isPulling.current = false;
        }
      } else {
        isPulling.current = false;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, disabled]);

  return containerRef;
};






