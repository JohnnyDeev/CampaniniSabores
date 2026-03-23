import React, { useState, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80,
  resistance = 2.5 
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const scrollY = window.scrollY;
    if (scrollY > 0) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      setPullDistance(diff / resistance);
    }
  }, [resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export default function PullToRefresh({ 
  children, 
  onRefresh,
  className = ''
}: { 
  children: React.ReactNode; 
  onRefresh: () => Promise<void>;
  className?: string;
}) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({ onRefresh });

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      {...handlers}
    >
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
          style={{ 
            height: Math.min(pullDistance, 100),
            transform: `translateY(${Math.min(pullDistance, 100)}px)`,
          }}
        >
          <RefreshIndicator 
            progress={Math.min(pullDistance / 80, 1)} 
            isRefreshing={isRefreshing} 
          />
        </div>
      )}
      <div style={{ transform: `translateY(${Math.min(pullDistance, 100)}px)` }}>
        {children}
      </div>
    </div>
  );
}

function RefreshIndicator({ progress, isRefreshing }: { progress: number; isRefreshing: boolean }) {
  const circumference = 2 * Math.PI * 20;
  
  return (
    <div className="flex flex-col items-center gap-2">
      {isRefreshing ? (
        <div className="w-8 h-8 border-4 border-[#C75B48] border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#F0E4DF"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#C75B48"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
