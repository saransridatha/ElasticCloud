// components/common/SplitPane.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';

interface SplitPaneProps {
  top: React.ReactNode;
  bottom: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  defaultHeight?: number; // percentage
  minHeight?: number;    // pixels
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  top,
  bottom,
  isOpen,
  onClose,
  defaultHeight = 42,
  minHeight = 220,
}) => {
  const [bottomHeightPercent, setBottomHeightPercent] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const totalH = rect.height;
      const newBottomH = ((totalH - relativeY) / totalH) * 100;
      if (newBottomH >= 15 && newBottomH <= 85) {
        setBottomHeightPercent(newBottomH);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Top Main Pane */}
      <div
        className="flex-1 overflow-auto"
        style={{
          height: isOpen ? `${100 - bottomHeightPercent}%` : '100%',
        }}
      >
        {top}
      </div>

      {/* Splitter Resizer Handle */}
      {isOpen && (
        <div
          onMouseDown={startDrag}
          className={`h-2 relative bg-console-border hover:bg-aws-orange cursor-row-resize flex items-center justify-center transition-colors group z-20 select-none ${
            isDragging ? 'bg-aws-orange' : ''
          }`}
        >
          <div className="absolute -top-1.5 bottom-0 left-0 right-0 h-4" />
          <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-console-surface border border-console-border text-console-text-secondary text-xs shadow-xs group-hover:border-aws-orange group-hover:text-aws-orange transition-colors">
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Bottom Inspector Drawer */}
      {isOpen && (
        <div
          className="bg-console-surface border-t border-console-border flex flex-col z-10 overflow-hidden shadow-lg animate-slide-up"
          style={{
            height: `${bottomHeightPercent}%`,
            minHeight: `${minHeight}px`,
          }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
};
