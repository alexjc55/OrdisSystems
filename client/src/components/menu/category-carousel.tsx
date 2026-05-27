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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const getNormalized = (el: HTMLElement) => {
    const raw = el.scrollLeft;
    if (!isRTL) return raw;
    if (raw <= 0) return Math.abs(raw);
    return el.scrollWidth - el.clientWidth - raw;
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
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const doScroll = (towardEnd: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    let delta = towardEnd ? 280 : -280;
    if (isRTL) delta = -delta;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el || e.deltaY === 0) return;
    e.preventDefault();
    el.scrollLeft += isRTL ? -e.deltaY : e.deltaY;
  };

  const startSide = isRTL ? "right" : "left";
  const endSide   = isRTL ? "left"  : "right";

  // Wrapper div handles ALL positioning — button inside only handles appearance.
  // This prevents global button CSS (direction: rtl, etc.) from affecting layout.
  const wrapperStyle = (side: string): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: -14,
    zIndex: 10,
    width: 32,
    height: 32,
    pointerEvents: "auto",
  });

  const btnStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }}>
      {isDesktop && canScrollStart && (
        <div style={wrapperStyle(startSide)}>
          <button
            onClick={() => doScroll(false)}
            style={btnStyle}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "white")}
            aria-label={isRTL ? "קדימה" : "Назад"}
          >
            {isRTL
              ? <ChevronRight className="w-4 h-4 text-gray-600" />
              : <ChevronLeft  className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex flex-nowrap gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        onWheel={onWheel}
      >
        {children}
      </div>

      {isDesktop && canScrollEnd && (
        <div style={wrapperStyle(endSide)}>
          <button
            onClick={() => doScroll(true)}
            style={btnStyle}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "white")}
            aria-label={isRTL ? "אחורה" : "Вперёд"}
          >
            {isRTL
              ? <ChevronLeft  className="w-4 h-4 text-gray-600" />
              : <ChevronRight className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
      )}
    </div>
  );
}
