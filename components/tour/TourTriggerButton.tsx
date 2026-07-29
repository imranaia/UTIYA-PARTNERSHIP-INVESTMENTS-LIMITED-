"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "./TourProvider";

export function TourIconTrigger() {
  const { start } = useTour();
  return (
    <Button variant="ghost" size="icon" onClick={start} aria-label="Take the guided tour">
      <HelpCircle className="size-4.5" />
    </Button>
  );
}

export function TourReplayButton() {
  const { start } = useTour();
  return (
    <Button type="button" variant="secondary" size="sm" onClick={start} className="gap-1.5">
      <HelpCircle className="size-4" />
      Replay guided tour
    </Button>
  );
}
