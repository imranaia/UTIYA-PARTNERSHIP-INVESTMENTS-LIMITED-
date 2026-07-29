"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 4000;

/**
 * Horizontally scrolling strip for a row of links/buttons that would
 * otherwise overflow or wrap awkwardly. Auto-advances on a timer and
 * loops back to the start; arrow buttons let the user drive it manually
 * and pause the timer while they're interacting.
 */
export function LinkCarousel({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [paused, setPaused] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges]);

  useEffect(() => {
    if (paused) return;
    const el = trackRef.current;
    if (!el) return;
    const timer = setInterval(() => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo(atEnd ? { left: 0, behavior: "smooth" } : { left: el.scrollLeft + el.clientWidth * 0.8, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className={cn("relative flex min-w-0 items-center", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("z-20 shrink-0 transition-opacity", !canScrollLeft && "pointer-events-none opacity-0")}
        onClick={() => step(-1)}
        aria-label="Scroll left"
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent transition-opacity",
            !canScrollLeft && "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent transition-opacity",
            !canScrollRight && "opacity-0",
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("z-20 shrink-0 transition-opacity", !canScrollRight && "pointer-events-none opacity-0")}
        onClick={() => step(1)}
        aria-label="Scroll right"
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
