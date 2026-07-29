"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_STEPS, type TourStep } from "@/lib/tour/steps";
import type { SidebarModule } from "@/components/layout/Sidebar";
import { TourOverlay } from "./TourOverlay";

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  steps: TourStep[];
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

function storageKey(username: string) {
  return `utiya-tour-seen-${username}`;
}

export function TourProvider({
  username,
  modules,
  children,
}: {
  username: string;
  modules: SidebarModule[];
  children: React.ReactNode;
}) {
  const steps = useMemo(
    () => TOUR_STEPS.filter((s) => !s.module || modules.some((m) => m.key === s.module)),
    [modules],
  );
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const autoStartChecked = useRef(false);

  useEffect(() => {
    if (autoStartChecked.current) return;
    autoStartChecked.current = true;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(storageKey(username));
    } catch {
      return;
    }
    if (!seen) {
      const t = setTimeout(() => {
        setStepIndex(0);
        setActive(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [username]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey(username), "1");
    } catch {
      // localStorage unavailable — nothing to persist
    }
  }, [username]);

  const goToIndex = useCallback(
    (idx: number) => {
      if (idx < 0) return;
      if (idx >= steps.length) {
        setActive(false);
        markSeen();
        return;
      }
      const step = steps[idx];
      setStepIndex(idx);
      if (step.path && step.path !== pathname) {
        router.push(step.path);
      }
    },
    [steps, pathname, router, markSeen],
  );

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => goToIndex(stepIndex + 1), [goToIndex, stepIndex]);
  const back = useCallback(() => goToIndex(stepIndex - 1), [goToIndex, stepIndex]);
  const skip = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  return (
    <TourContext.Provider value={{ active, stepIndex, steps, start, next, back, skip }}>
      {children}
      {active && steps.length > 0 && <TourOverlay />}
    </TourContext.Provider>
  );
}
