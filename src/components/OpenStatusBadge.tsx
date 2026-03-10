import { memo, useState, useEffect } from "react";
import { getOpenStatus, getOpenStatusLabel } from "@/lib/openStatus";

interface OpenStatusBadgeProps {
  openingHours?: string | null;
  closedDays?: string | null;
  /** Show in compact inline style */
  compact?: boolean;
}

/**
 * Real-time open/closed badge. Refreshes every minute.
 * Only renders when opening_hours data exists.
 */
const OpenStatusBadge = memo(({ openingHours, closedDays, compact }: OpenStatusBadgeProps) => {
  const [, setTick] = useState(0);

  // Re-evaluate every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const status = getOpenStatus(openingHours, closedDays);
  const label = getOpenStatusLabel(status);

  if (!label) return null;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${label.textClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${label.dotClass} animate-pulse`} />
        {label.text}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${label.textClass} ${
      status === "open" ? "bg-green-500/10" : "bg-red-500/10"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${label.dotClass} ${status === "open" ? "animate-pulse" : ""}`} />
      {label.text}
    </span>
  );
});

OpenStatusBadge.displayName = "OpenStatusBadge";

export default OpenStatusBadge;
