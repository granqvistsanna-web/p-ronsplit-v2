import { ReactNode, useRef, useState } from "react";
import { motion, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => {
    // Only allow pull-to-refresh if scrolled to top
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop || window.scrollY;
      if (scrollTop === 0) {
        setIsPulling(true);
      }
    }
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isPulling) return;

    // Only pull down, not up
    if (info.offset.y > 0) {
      setPullDistance(info.offset.y);
    }
  };

  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isPulling) return;

    setIsPulling(false);

    // Trigger refresh if pulled past threshold
    if (info.offset.y >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = isPulling || isRefreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center transition-opacity"
          style={{
            top: -40,
            height: 40,
            opacity: isRefreshing ? 1 : progress,
          }}
        >
          <RefreshCw
            size={20}
            className={`text-primary ${isRefreshing ? "animate-spin" : ""}`}
            style={{
              transform: `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <motion.div
        drag={!isRefreshing ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{
          y: isRefreshing ? threshold : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
