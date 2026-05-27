import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryCarouselProps {
  children: React.ReactNode;
  isRTL?: boolean;
}

export default function CategoryCarousel({ children, isRTL = false }: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  // Normalize scrollLeft to 0..maxScroll range regardless of RTL browser quirks
  const getNormalized = (el: HTMLElement) => {
    const raw = el.scrollLeft;
    if (!isRTL) return raw;
    // Chrome RTL: scrollLeft is negative (0 = right/start, negative = scrolled left)
    // Firefox RTL: scrollLeft is positive, 0 = right/start, max = scrolled left
    if (raw <= 0) return Math.abs(raw);                              // Chrome
    return el.scrollWidth - el.clientWidth - raw;                   // Firefox
  };

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const norm = getNormalized(el);
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollStart(norm > 4);
    setCanScrollEnd(norm < max - 4);
  }, [isRTL]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scrollBy = (towardEnd: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    // In RTL, "toward end" means scrolling left (negative scrollLeft in Chrome)
    const amount = 280;
    let delta = towardEnd ? amount : -amount;
    if (isRTL) delta = -delta;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += isRTL ? -e.deltaY : e.deltaY;
    }
  };

  // Arrow button base style — using inline style to avoid Tailwind transform conflicts
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    width: 32,
    height: 32,
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    flexShrink: 0,
  };

  // In RTL: "start" is on the right side, "end" is on the left side
  const startSide = isRTL ? 'right' : 'left';
  const endSide   = isRTL ? 'left'  : 'right';

  return (
    <div style={{ position: 'relative' }}>
      {/* "Back to start" arrow — appears on START side */}
      {canScrollStart && (
        <button
          onClick={() => scrollBy(false)}
          className="hidden md:flex hover:bg-gray-50"
          style={{ ...arrowStyle, [startSide]: -14 }}
          aria-label={isRTL ? 'קדימה' : 'Назад'}
        >
          {isRTL ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <ChevronLeft className="w-4 h-4 text-gray-600" />}
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex flex-nowrap gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        onWheel={onWheel}
      >
        {children}
      </div>

      {/* "Go to end" arrow — appears on END side */}
      {canScrollEnd && (
        <button
          onClick={() => scrollBy(true)}
          className="hidden md:flex hover:bg-gray-50"
          style={{ ...arrowStyle, [endSide]: -14 }}
          aria-label={isRTL ? 'אחורה' : 'Вперёд'}
        >
          {isRTL ? <ChevronLeft className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
        </button>
      )}
    </div>
  );
}
